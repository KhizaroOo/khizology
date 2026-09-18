/** Prepend BASE_URL to an internal URL, using the site's trailing-slash canonical form. */
export function url(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const match = path.match(/^([^?#]*)([?#].*)?$/);
  const pathname = match?.[1] || '/';
  const suffix = match?.[2] || '';
  let clean = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const hasFileExtension = /\/[^/]+\.[a-z0-9]+$/i.test(clean);

  if (!hasFileExtension && !clean.endsWith('/')) clean += '/';

  return `${base}${clean}${suffix}`;
}

/** Prepend BASE_URL to any asset/image path. Strips /public/ prefix if present. */
export function img(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  let clean = path.startsWith('/') ? path.slice(1) : path;
  if (clean.startsWith('public/')) clean = clean.slice(7);
  return `${base}/${clean}`;
}
