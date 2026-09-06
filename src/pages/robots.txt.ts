import type { APIRoute } from 'astro';
import { absoluteUrl } from '../utils/seo';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const context = { site: site!, base: import.meta.env.BASE_URL };
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${absoluteUrl('/sitemap-index.xml', context)}`,
    `Sitemap: ${absoluteUrl('/image-sitemap.xml', context)}`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
