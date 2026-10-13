import { build } from 'vite';
import { fileURLToPath } from 'node:url';
import { readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
const source = fileURLToPath(new URL('../vendor/human-atlas/', import.meta.url));
const output = fileURLToPath(new URL('../public/infooo/human-atlas-viewer/', import.meta.url));
const result = await build({ configFile: false, base: './', publicDir: false, esbuild: { jsx: 'automatic' },
  build: { outDir: output, emptyOutDir: false,
    rollupOptions: { input: `${source}main.tsx`, output: { entryFileNames: 'human-atlas.js', chunkFileNames: 'human-atlas-[name]-[hash].js', assetFileNames: 'human-atlas-[name]-[hash][extname]' } } },
});
// Remove only obsolete viewer build outputs after a successful rebuild.
const current = new Set((Array.isArray(result) ? result : [result]).flatMap(item => 'output' in item ? item.output.map(file => file.fileName) : []));
for (const directory of ['', 'assets']) for (const name of readdirSync(join(output, directory))) {
  const relative = directory ? `${directory}/${name}` : name;
  if ((/^human-atlas-scene-[\w-]+\.js$/.test(name) || /^geometry-worker-[\w-]+\.js$/.test(name) || name === 'index-CW6uCXww.js') && !current.has(relative)) unlinkSync(join(output, relative));
}
