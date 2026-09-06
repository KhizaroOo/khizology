import type { APIRoute } from 'astro';
import { artworks } from '../data/artworks';
import { absoluteUrl } from '../utils/seo';

export const prerender = true;

function xml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = ({ site }) => {
  const context = { site: site!, base: import.meta.env.BASE_URL };
  const imageEntries = artworks.map((artwork) => [
    '    <image:image>',
    `      <image:loc>${xml(absoluteUrl(`/images/artworks/${artwork.filename}`, context))}</image:loc>`,
    `      <image:title>${xml(artwork.title)}</image:title>`,
    '    </image:image>',
  ].join('\n')).join('\n');

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    '  <url>',
    `    <loc>${xml(absoluteUrl('/artworks', context))}</loc>`,
    imageEntries,
    '  </url>',
    '</urlset>',
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
