// Google reviews -> content/reviews.json (read by the build, served lazily as assets/reviews.json)
//   SEARCHAPI_KEY=... npm run reviews
//
// Source: SearchApi.io (engine google_maps_reviews), one request per refresh.
// The free plan is a fixed pool of requests, so they are spent only when asked:
//   REVIEWS_REFRESH=false  reuse the reviews already on the live site, call the API only if there are none
//   otherwise              call the API, fall back to the live site if it fails
// Last resort is whatever content/reviews.json already holds. The script never fails the deploy:
// with no reviews at all the build just leaves the section out.
import fs from 'node:fs/promises';

const OUT = 'content/reviews.json';
const API = 'https://www.searchapi.io/api/v1';
const QUERY = 'Aiolos Barbershop, Tritonos 38, Palaio Faliro';
const FALLBACK_URL = process.env.REVIEWS_FALLBACK_URL || 'https://www.aiolosbarbershop.gr/assets/reviews.json';
const REFRESH = process.env.REVIEWS_REFRESH !== 'false';
const MIN_RATING = 4;
const MAX_REVIEWS = 12;
const MAX_TEXT = 360;

// forgive the usual copy-paste extras around the key: spaces, newlines, quotes, "SEARCHAPI_KEY="
const RAW_KEY = process.env.SEARCHAPI_KEY ?? '';
const KEY = RAW_KEY.trim().replace(/^\w+\s*=\s*/, '').replace(/^["']|["']$/g, '').trim();
// Optional: Google's data_id of the place ("0x14a1...:0x..."), saves the lookup request
const DATA_ID = process.env.SEARCHAPI_DATA_ID?.trim();

// In GitHub Actions these also become annotations on the run page (visible without opening the log).
// Never print the key itself: logs of a public repository are public.
const notice = (msg) => console.log(process.env.GITHUB_ACTIONS ? `::notice title=Google reviews::${msg.trim()}` : msg);
const warn = (msg) => console.warn(process.env.GITHUB_ACTIONS ? `::warning title=Google reviews::${msg.trim()}` : msg);

async function call(path, params = {}) {
  const url = new URL(`${API}/${path}`);
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, v);
  // key in the header, not in the URL
  const res = await fetch(url, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${KEY}` },
    signal: AbortSignal.timeout(30_000),
  });
  const body = await res.text();
  let data = {};
  try { data = JSON.parse(body); } catch {}
  if (!res.ok || data.error) {
    throw new Error(`SearchApi ${params.engine ?? path}: HTTP ${res.status} ${data.error ?? body.slice(0, 200)}`.trim());
  }
  return data;
}

// Checks the key with the account endpoint (does not use up searches)
async function checkKey() {
  const shape = `${KEY.length} chars${KEY !== RAW_KEY ? ', extra characters around it were removed' : ''}`;
  let acc;
  try {
    acc = (await call('me')).account ?? {};
  } catch (err) {
    throw new Error(`key rejected (${shape}): ${err.message}`);
  }
  notice(`SearchApi key OK (${shape}), ${acc.remaining_searches ?? '?'} searches left`);
}

async function findDataId() {
  const data = await call('search', { engine: 'google_maps', q: QUERY, hl: 'en' });
  const place = data.local_results?.[0];
  if (!place?.data_id) throw new Error(`SearchApi: place not found for "${QUERY}"`);
  notice(`found "${place.title}", ${place.address}: data_id ${place.data_id} ` +
    '(save it as the SEARCHAPI_DATA_ID repository variable to skip this lookup)');
  return place.data_id;
}

// Google prefixes translated reviews with "(Translated by Google)" and appends "(Original)": keep the original
function original(text) {
  const m = text.match(/\(Original\)\s*([\s\S]+)$/);
  return (m ? m[1] : text).replace(/\s+/g, ' ').trim();
}

function clip(text) {
  if (text.length <= MAX_TEXT) return text;
  return text.slice(0, MAX_TEXT).replace(/\s+\S*$/, '') + '…';
}

async function fromSearchApi() {
  await checkKey();
  const dataId = DATA_ID || await findDataId();
  const data = await call('search', { engine: 'google_maps_reviews', data_id: dataId, hl: 'en', sort_by: 'most_relevant', num: 20 });
  const info = data.place_result;

  const reviews = (data.reviews ?? [])
    .map((r) => ({
      name: r.user?.name?.trim(),
      rating: Number(r.rating),
      date: r.iso_date?.slice(0, 10),
      text: original(r.text ?? ''),
      link: r.link,
    }))
    .filter((r) => r.name && r.rating >= MIN_RATING && r.text.length >= 20)
    .slice(0, MAX_REVIEWS)
    .map((r) => ({ ...r, text: clip(r.text) }));

  if (!reviews.length) throw new Error(`SearchApi returned ${data.reviews?.length ?? 0} reviews, none positive with text`);
  return {
    rating: info?.rating ?? null,
    total: info?.reviews ?? null,
    url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(QUERY)}`,
    fetched: new Date().toISOString().slice(0, 10),
    reviews,
  };
}

async function fromLiveSite() {
  const res = await fetch(FALLBACK_URL, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`${FALLBACK_URL}: HTTP ${res.status}`);
  const data = await res.json();
  if (!data.reviews?.length) throw new Error(`${FALLBACK_URL}: no reviews`);
  return data;
}

const api = ['SearchApi', KEY ? fromSearchApi : null];
const live = ['live site', fromLiveSite];
const sources = REFRESH ? [api, live] : [live, api];

for (const [name, load] of sources) {
  if (!load) { warn(`${name}: skipped (SEARCHAPI_KEY is not set)`); continue; }
  try {
    const data = await load();
    await fs.writeFile(OUT, JSON.stringify(data, null, 2) + '\n');
    console.log(`✔ ${OUT}: ${data.reviews.length} reviews from ${name} (fetched ${data.fetched})`);
    process.exit(0);
  } catch (err) {
    warn(`${name}: ${err.message}`);
  }
}

const kept = await fs.access(OUT).then(() => true, () => false);
warn(kept ? `keeping the existing ${OUT}` : 'no reviews available, the Reviews section will be left out');
