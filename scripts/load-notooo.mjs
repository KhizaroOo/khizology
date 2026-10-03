import fs from 'node:fs';
import path from 'node:path';
import { stripTypeScriptTypes } from 'node:module';

// Audits run without Astro's JSON import handling; evaluate the same canonical registry.
export async function loadNotooo(root) {
  const source = fs.readFileSync(path.join(root, 'src/data/notooo.ts'), 'utf8')
    .replace(/import (\w+) from '(\.\/notooo\/[^']+\.json)';/g, (_, name, relative) =>
      `const ${name} = ${fs.readFileSync(path.join(root, 'src/data', relative), 'utf8')};`);
  return import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(source))}`);
}
