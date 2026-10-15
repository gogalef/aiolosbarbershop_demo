// Builds web-optimized images for src/ from the originals in archive/www.
// Usage: npm run images
import fs from 'node:fs/promises';
import sharp from 'sharp';

const SRC = 'archive/www';
const OUT = 'src/assets/img';
await fs.mkdir(OUT, { recursive: true });

const jobs = [
  // Hero: interior photo, responsive widths
  ...[800, 1280, 1920].map((w) => ({
    src: `${SRC}/images/2023/09/25/gopr4246d.jpg`,
    out: `hero-${w}.webp`,
    run: (img) => img.resize({ width: w }).webp({ quality: 68 }),
  })),
  // Social preview
  {
    src: `${SRC}/images/2023/09/25/gopr4246d.jpg`,
    out: 'og-image.jpg',
    run: (img) => img.resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 75, mozjpeg: true }),
  },
  // Logo (transparent PNG from the 2019 site)
  ...[240, 480, 960].map((w) => ({
    src: `${SRC}/wp-content/uploads/2019/09/AIOLOS_final_logo.png`,
    out: `logo-${w}.webp`,
    run: (img) => img.resize({ width: w }).webp({ quality: 85, alphaQuality: 90 }),
  })),
  {
    src: `${SRC}/wp-content/uploads/2019/09/AIOLOS_final_logo.png`,
    out: 'apple-touch-icon.png',
    run: (img) =>
      img.resize(160, 160, { fit: 'contain', background: '#171717' })
        .extend({ top: 10, bottom: 10, left: 10, right: 10, background: '#171717' })
        .png({ compressionLevel: 9 }),
  },
  {
    src: `${SRC}/wp-content/uploads/2019/09/AIOLOS_final_logo.png`,
    out: 'favicon-32.png',
    run: (img) => img.resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png(),
  },
  // Barbers: square crops for round portraits
  {
    src: `${SRC}/images/2023/09/25/aiolos-barber.jpg`,
    out: 'barber-aiolos.webp',
    run: (img) => img.resize(480, 480, { fit: 'cover', position: 'centre' }).webp({ quality: 75 }),
  },
  {
    src: `${SRC}/images/2023/09/25/_dsc0001m_2.jpg`,
    out: 'barber-john.webp',
    run: (img) =>
      img.extract({ left: 1250, top: 40, width: 2600, height: 2600 })
        .resize(480, 480).webp({ quality: 75 }),
  },
];

for (const { src, out, run } of jobs) {
  const info = await run(sharp(src)).toFile(`${OUT}/${out}`);
  console.log(out.padEnd(22), `${info.width}x${info.height}`, `${(info.size / 1024).toFixed(0)} KB`);
}
