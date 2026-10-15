// Production build: src/ + content/ -> dist/
//   npm run build          one-off build
//   npm run dev            build, rebuild on change, serve dist/ on http://localhost:8081
import fs from 'node:fs/promises';
import { watch } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import YAML from 'yaml';
import { minify } from 'html-minifier-terser';

const SRC = 'src';
const DIST = 'dist';
const SERVICES = 'content/services.yml';
const SITE_URL = 'https://www.aiolosbarbershop.gr/';

class ContentError extends Error {}

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------- services.yml ----------

async function loadServices() {
  const text = await fs.readFile(SERVICES, 'utf8');
  const doc = YAML.parseDocument(text, { prettyErrors: true });
  if (doc.errors.length) {
    const e = doc.errors[0];
    const line = e.linePos?.[0]?.line;
    throw new ContentError(`${SERVICES}${line ? `, line ${line}` : ''}: ${e.message.split('\n')[0]}\n` +
      '  Check the spaces at the start of the line and quotes around names with ": ".');
  }
  const data = doc.toJS();
  const fail = (msg) => { throw new ContentError(`${SERVICES}: ${msg}`); };

  if (!Array.isArray(data) || !data.length) fail('the file must contain a list of categories ("- category: ...").');
  data.forEach((cat, i) => {
    const where = `category #${i + 1}${cat?.category ? ` "${cat.category}"` : ''}`;
    if (!cat || typeof cat !== 'object') fail(`${where} is not filled in correctly.`);
    if (!cat.category) fail(`${where} has no "category:" name.`);
    if (!Array.isArray(cat.services) || !cat.services.length) fail(`${where} has no services (a "services:" list is needed).`);
    cat.services.forEach((s, j) => {
      const w = `${where}, service #${j + 1}${s?.name ? ` "${s.name}"` : ''}`;
      if (!s || typeof s !== 'object') fail(`${w} is not filled in correctly.`);
      if (!s.name) fail(`${w} has no "name:".`);
      if (s.price === undefined || s.price === null || s.price === '') fail(`${w} has no "price:".`);
    });
  });
  return data;
}

// 20 -> "€20", "from 15" -> "from €15", "€15" stays as is
function formatPrice(price) {
  const s = String(price).trim();
  if (s.includes('€')) return s;
  return s.replace(/\d+(?:[.,]\d+)?/, (n) => `€${n}`);
}

function renderServices(data) {
  return data.map((cat) => `
    <div class="menu-group">
      <h3>${esc(cat.category)}</h3>
      <ul class="menu">
        ${cat.services.map((s) => `
        <li>
          <div class="menu__row"><span class="menu__name">${esc(s.name)}</span><span class="menu__dots"></span><span class="menu__price">${esc(formatPrice(s.price))}</span></div>
          ${s.duration ? `<div class="menu__meta">${esc(s.duration)}</div>` : ''}
        </li>`).join('')}
      </ul>
    </div>`).join('');
}

function priceRange(data) {
  const nums = data.flatMap((c) => c.services)
    .map((s) => parseFloat(String(s.price).replace(',', '.').match(/\d+(?:\.\d+)?/)?.[0]))
    .filter(Number.isFinite);
  if (!nums.length) return '€€';
  const min = Math.min(...nums), max = Math.max(...nums);
  return min === max ? `€${min}` : `€${min}–€${max}`;
}

// ---------- build ----------

async function copyDir(from, to) {
  await fs.mkdir(to, { recursive: true });
  for (const entry of await fs.readdir(from, { withFileTypes: true })) {
    const a = path.join(from, entry.name), b = path.join(to, entry.name);
    if (entry.isDirectory()) await copyDir(a, b);
    else await fs.copyFile(a, b);
  }
}

async function dirSize(dir) {
  let total = 0;
  for (const entry of await fs.readdir(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile()) total += (await fs.stat(path.join(entry.parentPath ?? entry.path, entry.name))).size;
  }
  return total;
}

async function build() {
  const t0 = Date.now();
  const services = await loadServices();

  // CSS is inlined into the page (one request less); fix relative urls for the new location
  const css = (await fs.readFile(`${SRC}/assets/css/style.css`, 'utf8')).replaceAll('url(../', 'url(assets/');

  let html = await fs.readFile(`${SRC}/index.html`, 'utf8');
  html = html
    .replace('{{styles}}', () => `<style>${css}</style>`)
    .replace('{{services}}', () => renderServices(services))
    .replace('{{priceRange}}', () => priceRange(services));
  const leftover = html.match(/\{\{\w+\}\}/);
  if (leftover) throw new Error(`Unknown placeholder ${leftover[0]} in ${SRC}/index.html`);

  html = await minify(html, {
    collapseWhitespace: true,
    conservativeCollapse: true,
    removeComments: true,
    minifyCSS: true,
    minifyJS: true,
    sortAttributes: true,
  });

  await fs.rm(DIST, { recursive: true, force: true });
  await fs.mkdir(DIST, { recursive: true });
  await fs.writeFile(`${DIST}/index.html`, html);
  await copyDir(`${SRC}/assets/fonts`, `${DIST}/assets/fonts`);
  await copyDir(`${SRC}/assets/img`, `${DIST}/assets/img`);
  await fs.writeFile(`${DIST}/robots.txt`, `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}sitemap.xml\n`);
  await fs.writeFile(`${DIST}/sitemap.xml`,
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `  <url><loc>${SITE_URL}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>\n</urlset>\n`);

  const count = services.reduce((n, c) => n + c.services.length, 0);
  console.log(`✔ built ${DIST}/ in ${Date.now() - t0} ms — ${services.length} categories, ${count} services, ` +
    `index.html ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB, total ${(await dirSize(DIST) / 1024).toFixed(0)} KB`);
}

async function safeBuild() {
  try {
    await build();
    return true;
  } catch (err) {
    console.error(`\n✖ Build failed\n  ${err instanceof ContentError ? err.message : err.stack}\n`);
    return false;
  }
}

// ---------- dev server ----------

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml',
};

function serve(port) {
  http.createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(DIST, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
    try {
      const body = await fs.readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404).end('Not found');
    }
  }).listen(port, () => console.log(`  serving ${DIST}/ at http://localhost:${port}`));
}

// ---------- main ----------

const devMode = process.argv.includes('--dev');
const ok = await safeBuild();

if (devMode) {
  serve(8081);
  let timer;
  for (const dir of [SRC, 'content']) {
    watch(dir, { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(safeBuild, 150);
    });
  }
  console.log('  watching src/ and content/ for changes…');
} else if (!ok) {
  process.exit(1);
}
