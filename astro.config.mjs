// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
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

export default defineConfig({
  site: SITE,
  base: BASE,
  integrations: [
    react(),
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
  },
  output: 'static',
});
