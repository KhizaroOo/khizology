import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('src/styles/global.css', 'utf8');
const buttons = fs.readFileSync('public/styles/buttons.css', 'utf8');
const light = css.match(/:root\s*\{([\s\S]*?)\}/)[1];
const dark = css.match(/html\.dark\s*\{([\s\S]*?)\}/)[1];
const value = (s, name) => s.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1];
const rgb = hex => hex.replace('#', '').match(/../g).map(v => parseInt(v, 16));
const mix = (a, b, weight) => a.map((v, i) => v * weight + b[i] * (1 - weight));
const luminance = color => color.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((n, v, i) => n + v * [.2126, .7152, .0722][i], 0);
const ratio = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
let pairs = 0;
for (const [theme, overrides] of [['light', light], ['dark', dark]]) {
  const token = name => value(overrides, name) ?? value(light, name);
  const base = rgb(token('--k-identity-text-base').length === 4 ? token('--k-identity-text-base').replace(/#(.)(.)(.)/, '#$1$1$2$2$3$3') : token('--k-identity-text-base'));
  const weight = parseFloat(token('--k-identity-text-weight')) / 100;
  const surfaces = ['--k-bg', '--k-bg-card', '--k-bg-elevated'].map(n => rgb(token(n)));
  assert.ok(ratio(rgb(token('--k-text')), rgb(token('--k-bg-card'))) >= 4.5, `${theme}: skip link text and focus indicator`);
  for (const module of ['artooo', 'toolooo', 'infooo']) {
    const identity = rgb(value(light, `--m-${module}`));
    assert.match(value(light, `--m-${module}-text`), new RegExp(`var\\(--m-${module}\\).*var\\(--k-identity-text-weight\\).*var\\(--k-identity-text-base\\)`));
    const ink = mix(identity, base, weight);
    for (const surface of [...surfaces, ...surfaces.map(s => mix(identity, s, .22))]) {
      assert.ok(ratio(ink, surface) >= 4.5, `${theme} ${module}: ${ratio(ink, surface)}`); pairs++;
    }
    assert.ok(ratio(rgb(value(buttons, '--k-button-dark-ink')), identity) >= 4.5, `${module} fill`);
  }
  const brand = rgb(value(light, '--k-accent'));
  const brandWeight = Number(token('--k-accent-text').match(/(\d+)%/)[1]) / 100;
  const brandInk = mix(brand, theme === 'light' ? [0, 0, 0] : [255, 255, 255], brandWeight);
  for (const surface of [...surfaces, ...surfaces.map(s => mix(brand, s, .12))]) {
    assert.ok(ratio(brandInk, surface) >= 4.5, `${theme} brand: ${ratio(brandInk, surface)}`); pairs++;
  }
  assert.ok(ratio(rgb(value(buttons, '--k-button-dark-ink')), brand) >= 4.5, 'brand button fill');
}
assert.match(css, /\.k-section-label\s*\{[^}]*color: var\(--m-accent-text\)/);
assert.match(css, /--infooo-accent-strong:var\(--m-infooo-text\)/);
assert.match(fs.readFileSync('src/components/toolbox/lv3/MyTooloooPanel.tsx', 'utf8'), /color: 'var\(--m-toolooo-text\)'/);
assert.match(fs.readFileSync('src/components/layout/Navbar.astro', 'utf8'), /color: color-mix\(in srgb, var\(--link-accent, var\(--k-text\)\) var\(--k-identity-text-weight\), var\(--k-identity-text-base\)\)/);
console.log(`PASS: ${pairs} theme/surface/tint accent-text pairs and identity/button fills (WCAG 4.5:1).`);
