import { generateSbom } from './cycloneDxModel';
self.onmessage = (event: MessageEvent<string>) => {
  try {
    const { inventory, bom } = generateSbom(event.data);
    self.postMessage({ ok: true, inventory, json: JSON.stringify(bom, null, 2) });
  } catch (e) {
    self.postMessage({ ok: false, error: e instanceof Error ? e.message : 'Could not generate an SBOM from this input.' });
  }
};
