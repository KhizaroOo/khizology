// Read-only deployment gate. Google UI configuration can enable collection beyond
// the application's event allowlist; do not silently activate those settings.
const id = process.env.PUBLIC_GA_MEASUREMENT_ID?.trim();
if (!/^G-[A-Z0-9]{6,20}$/.test(id || '')) throw new Error('Set PUBLIC_GA_MEASUREMENT_ID to the real stream ID');
const response = await fetch(`https://www.googletagmanager.com/gtag/js?id=${id}`, { signal: AbortSignal.timeout(20000) });
if (!response.ok) throw new Error(`Google tag configuration HTTP ${response.status}`);
const source = await response.text();
const match = source.match(/"tags":(\[[\s\S]*?\]),\s*"predicates"/);
if (!match) throw new Error('Google configuration format changed; manually review settings before activation');
const tags = JSON.parse(match[1]);
const enhanced = tags.filter(tag => /^__ccd_em_/.test(tag.function));
const personal = tags.filter(tag => /__ogt_1p_data/.test(tag.function) && tag.vtp_isEnabled === true);
console.log(JSON.stringify({ measurementId: id, enhancedMeasurementModules: enhanced.map(tag => tag.function), automaticUserDataEnabled: personal.some(tag => tag.vtp_isAutoEnabled), userDataCapabilitiesEnabled: personal.length > 0 }, null, 2));
if (enhanced.length || personal.length) {
  console.error('FAIL: turn off Enhanced Measurement and user-provided data capabilities in GA4 / Google tag settings, then recheck after propagation. No settings were changed by this script.');
  process.exitCode = 1;
} else console.log('PASS: no Enhanced Measurement or enabled user-provided-data module in the public tag configuration. Confirm with live request inspection as well.');
