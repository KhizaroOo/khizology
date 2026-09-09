import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

// Derived previews only: originals remain untouched for full artwork viewing.
const output = 'public/images/previews';
await fs.mkdir(output, { recursive: true });
const manifest = {};
const generated = new Set();
for (const folder of ['artworks', 'Monsters', 'site']) {
  for (const name of (await fs.readdir(`public/images/${folder}`)).sort()) {
    if (!/\.(png|jpe?g|webp)$/i.test(name)) continue;
    if (folder === 'site' && name !== 'creative-01.png') continue;
    const source = `/images/${folder}/${name}`;
    const data = await fs.readFile(`public${source}`);
    const hash = createHash('sha256').update(data).update('webp-q82-v1').digest('hex').slice(0, 16);
    const meta = await sharp(data).metadata();
    const widths = [...new Set((folder === 'Monsters' ? [160] : [320, 640]).map(w => Math.min(w, meta.width)))];
    manifest[source] = [];
    for (const width of widths) {
      const filename = `${hash}-${width}.webp`;
      generated.add(filename);
      try { await fs.access(path.join(output, filename)); }
      catch { await sharp(data).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(output, filename)); }
      manifest[source].push({ width, src: `/images/previews/${filename}` });
    }
  }
}
// Prune only this generator's obsolete filenames, never originals or other files.
for (const name of await fs.readdir(output)) {
  if (/^[a-f0-9]{16}-\d+\.webp$/.test(name) && !generated.has(name)) await fs.unlink(path.join(output, name));
}
await fs.writeFile('src/data/imagePreviews.json', JSON.stringify(manifest));
console.log(`Generated reusable previews for ${Object.keys(manifest).length} images.`);
