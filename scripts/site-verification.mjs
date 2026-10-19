import { readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

// Ownership challenges are service assets, not indexable content pages.
// Only accept the exact challenge format at the output root; malformed files
// remain subject to the normal HTML checks.
export function isSiteVerificationFile(file) {
  const match = /^yandex_([a-f0-9]{16})\.html$/.exec(basename(file));
  if (!match || dirname(resolve(file)) !== resolve('dist')) return false;
  const expected = `<html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head><body>Verification: ${match[1]}</body></html>`;
  return readFileSync(file, 'utf8').trim().replace(/>\s+</g, '><') === expected;
}
