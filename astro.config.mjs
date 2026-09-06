// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// GitHub Pages deployment:
// Option A — user/org site (username.github.io):  set site only, leave base as '/'
// Option B — project site (username.github.io/repo): set both site AND base
//
// Current config: project site at khizarooo.github.io/khizology
// Change SITE and BASE below to match your actual repo.

const SITE = process.env.SITE_URL?.trim() || 'https://khizarooo.github.io';
const configuredBase = process.env.BASE_URL?.trim() || '/khizology';
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
