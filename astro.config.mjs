// @ts-check
import { defineConfig } from 'astro/config';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// Production uses the verified apex custom domain at the web root. Environment
// overrides remain available for deliberate local validation only.
const SITE = process.env.SITE_URL?.trim() || 'https://khizooology.com';
const configuredBase = process.env.BASE_URL?.trim() || '/';
const BASE = configuredBase === '/'
  ? '/'
  : `/${configuredBase.replace(/^\/+|\/+$/g, '')}`;

const sitemapExcludedRoutes = new Set([
  '/404.html',
  '/frop-a-vibe/',
  '/future-monsters/',
  '/you-ask-i-answer/',
]);

function hasPublishedNotes(directory = './src/content/notes') {
  if (!existsSync(directory)) return false;
  for (const entry of readdirSync(directory)) {
    const file = join(directory, entry);
    if (statSync(file).isDirectory() && hasPublishedNotes(file)) return true;
    if (/\.mdx?$/i.test(entry) && /^status:\s*['"]?published['"]?\s*$/mi.test(readFileSync(file, 'utf8'))) return true;
  }
  return false;
}

// Keep an empty notes index out of the sitemap until a real published note exists.
if (!hasPublishedNotes()) sitemapExcludedRoutes.add('/notes/');

export default defineConfig({
  site: SITE,
  base: BASE,
  integrations: [
    react(),
    mdx(),
    sitemap({
      filter(page) {
        const pathname = new URL(page).pathname;
        const basePrefix = BASE === '/' ? '' : BASE;
        const route = pathname.startsWith(basePrefix)
          ? pathname.slice(basePrefix.length) || '/'
          : pathname;
        return !sitemapExcludedRoutes.has(route);
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@notes': fileURLToPath(new URL('./src/components/notes', import.meta.url)),
      },
    },
  },
  output: 'static',
});
