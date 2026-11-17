// Google reviews -> content/reviews.json (read by the build, served lazily as assets/reviews.json)
//   SERPAPI_KEY=... npm run reviews
//
// Source: SerpApi (Google Maps Reviews), free plan is plenty for a weekly run.
// If SerpApi fails, the reviews currently on the live site are reused (REVIEWS_FALLBACK_URL),
// then whatever content/reviews.json already holds. The script never fails the deploy:
// with no reviews at all the build just leaves the section out.
import fs from 'node:fs/promises';

const OUT = 'content/reviews.json';
const QUERY = 'Aiolos Barbershop, Tritonos 38, Palaio Faliro';
const FALLBACK_URL = process.env.REVIEWS_FALLBACK_URL || 'https://www.aiolosbarbershop.gr/assets/reviews.json';
const MIN_RATING = 4;
const MAX_REVIEWS = 12;
const MAX_TEXT = 360;

const KEY = process.env.SERPAPI_KEY;
// Optional: Google's data_id of the place ("0x14a1...:0x..."), skips the lookup request
const DATA_ID = process.env.SERPAPI_DATA_ID;

async function serpapi(params) {
  const url = new URL('https://serpapi.com/search.json');
  for (const [k, v] of Object.entries({ ...params, api_key: KEY })) if (v !== undefined) url.searchParams.set(k, v);
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(`SerpApi ${params.engine}: ${data.error ?? `HTTP ${res.status}`}`);
  return data;
}

async function findDataId() {
  const data = await serpapi({ engine: 'google_maps', q: QUERY, type: 'search', hl: 'en' });
  const place = data.place_results ?? data.local_results?.[0];
  if (!place?.data_id) throw new Error(`SerpApi: place not found for "${QUERY}"`);
  console.log(`  place: ${place.title} — data_id ${place.data_id} (set SERPAPI_DATA_ID to skip this lookup)`);
  return place.data_id;
}

function clip(text) {
  if (text.length <= MAX_TEXT) return text;
  return text.slice(0, MAX_TEXT).replace(/\s+\S*$/, '') + '…';
}

async function fromSerpApi() {
  const dataId = DATA_ID || await findDataId();
  let info, token;
  const raw = [];
  // first page holds 8 reviews; one more page of 20 is enough to pick a dozen good ones
  for (let page = 0; page < 2; page++) {
    const data = await serpapi({
      engine: 'google_maps_reviews', data_id: dataId, hl: 'en', sort_by: 'qualityScore',
      next_page_token: token, num: token ? 20 : undefined,
    });
    info ??= data.place_info;
    raw.push(...(data.reviews ?? []));
    token = data.serpapi_pagination?.next_page_token;
    if (!token) break;
  }

  const reviews = raw
    .map((r) => ({
      name: r.user?.name?.trim(),
      rating: Number(r.rating),
      date: r.iso_date?.slice(0, 10),
      // original wording, not Google's machine translation
      text: (r.extracted_snippet?.original ?? r.snippet ?? '').replace(/\s+/g, ' ').trim(),
      link: r.link,
    }))
    .filter((r) => r.name && r.rating >= MIN_RATING && r.text.length >= 20)
    .slice(0, MAX_REVIEWS)
    .map((r) => ({ ...r, text: clip(r.text) }));

  if (!reviews.length) throw new Error('SerpApi returned no positive reviews with text');
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

const sources = [
  ['SerpApi', KEY ? fromSerpApi : null],
  ['live site', fromLiveSite],
];

for (const [name, load] of sources) {
  if (!load) { console.warn(`  ${name}: skipped (SERPAPI_KEY is not set)`); continue; }
  try {
    const data = await load();
    await fs.writeFile(OUT, JSON.stringify(data, null, 2) + '\n');
    console.log(`✔ ${OUT}: ${data.reviews.length} reviews from ${name} (fetched ${data.fetched})`);
    process.exit(0);
  } catch (err) {
    console.warn(`  ${name}: ${err.message}`);
  }
}

const kept = await fs.access(OUT).then(() => true, () => false);
console.warn(kept ? `⚠ keeping the existing ${OUT}` : `⚠ no reviews available — the Reviews section will be left out`);
