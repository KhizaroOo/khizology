export interface SeoUrlContext {
  site: URL;
  base: string;
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

function normalizedBase(base: string): string {
  const trimmed = base.trim();
  if (!trimmed || trimmed === '/') return '';
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}

function normalizedPath(path: string): string {
  const clean = path.split(/[?#]/, 1)[0] || '/';
  return clean.startsWith('/') ? clean : `/${clean}`;
}

/** Build one absolute, query-free URL from Astro's authoritative site/base config. */
export function absoluteUrl(path: string, context: SeoUrlContext): string {
  if (/^https?:\/\//i.test(path)) {
    const external = new URL(path);
    external.search = '';
    external.hash = '';
    return external.href;
  }

  const base = normalizedBase(context.base);
  let pathname = normalizedPath(path);
  if (base && pathname !== base && !pathname.startsWith(`${base}/`)) {
    pathname = `${base}${pathname}`;
  }

  const hasFileExtension = /\/[^/]+\.[a-z0-9]+$/i.test(pathname);
  if (!hasFileExtension && !pathname.endsWith('/')) pathname += '/';

  const result = new URL(pathname, context.site);
  result.search = '';
  result.hash = '';
  return result.href;
}

export const siteUrl = (context: SeoUrlContext): string => absoluteUrl('/', context);
export const websiteId = (context: SeoUrlContext): string => `${siteUrl(context)}#website`;
export const personId = (context: SeoUrlContext): string => `${absoluteUrl('/my-portfolio', context)}#person`;

export function websiteReference(context: SeoUrlContext) {
  return { '@id': websiteId(context) };
}

export function personReference(context: SeoUrlContext) {
  return { '@id': personId(context) };
}

export function breadcrumbSchema(items: BreadcrumbItem[], context: SeoUrlContext) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path, context),
    })),
  };
}

export function pageId(path: string, context: SeoUrlContext): string {
  return `${absoluteUrl(path, context)}#webpage`;
}
