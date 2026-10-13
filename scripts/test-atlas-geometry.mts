import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { gunzipSync } from 'node:zlib';
import * as T from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { assembleChunk } from '../vendor/human-atlas/app/geometry-assembly.ts';
import { decodeModelResponse } from '../vendor/human-atlas/app/model-download.ts';
import { explodeStep, allowAutoRotate } from '../vendor/human-atlas/app/motion.ts';
const manifest = JSON.parse(fs.readFileSync(new URL('../public/infooo/human-atlas-assets/models/atlas.json', import.meta.url), 'utf8'));
let partsChecked = 0;
for (const [chunkIndex, chunk] of manifest.chunks.entries()) {
  const data = gunzipSync(fs.readFileSync(new URL(`../public/infooo/human-atlas-viewer/${chunk.gzip}`, import.meta.url)));
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const parts = manifest.parts.map((part: any, partIndex: number) => ({ ...part, partIndex })).filter((part: any) => part.chunk === chunkIndex);
  const actual = assembleChunk(buffer, parts);
  for (const group of actual) {
    const geometries = parts.filter((part: any) => part.system === group.system).map((part: any) => {
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.BufferAttribute(new Float32Array(buffer, part.positions, part.vertexCount * 3), 3));
      geometry.setAttribute('normal', new T.BufferAttribute(new Int16Array(buffer, part.normals, part.vertexCount * 3), 3, true));
      geometry.setAttribute('partIndex', new T.BufferAttribute(new Float32Array(part.vertexCount).fill(part.partIndex), 1));
      geometry.setIndex(new T.BufferAttribute(new Uint32Array(buffer, part.indices, part.indexCount), 1));
      partsChecked++; return geometry;
    });
    const expected = mergeGeometries(geometries, false)!;
    for (const [name, array] of [['position', group.positions], ['normal', group.normals], ['partIndex', group.partIndices], ['index', group.indices]] as const) {
      const reference = name === 'index' ? expected.index!.array : expected.attributes[name].array;
      assert.ok(Buffer.from(array.buffer, array.byteOffset, array.byteLength).equals(Buffer.from(reference.buffer, reference.byteOffset, reference.byteLength)), `Chunk ${chunkIndex} ${group.system}: ${name} changed`);
    }
    expected.dispose(); geometries.forEach((geometry: T.BufferGeometry) => geometry.dispose());
  }
}
assert.equal(partsChecked, manifest.parts.length);
assert.equal(explodeStep(.25, 1, .016, true), 1, 'Reduced motion updates immediately');
assert.equal(explodeStep(.25, 1, .016, false), T.MathUtils.damp(.25, 1, 8, .016), 'Normal interpolation is unchanged');
assert.equal(allowAutoRotate(true, false, 0, true), false);
assert.equal(allowAutoRotate(true, false, 0, false), true);
assert.equal(allowAutoRotate(true, true, 0, false), false);
assert.equal(allowAutoRotate(true, false, 1, false), false);
await assert.rejects(decodeModelResponse(new Response('', { status: 404 }), 16, false));
await assert.rejects(decodeModelResponse(new Response(new Uint8Array(8)), 16, false));
const boundaryExports: any = {};
const boundaryCode = ts.transpileModule(fs.readFileSync(new URL('../vendor/human-atlas/app/scene-boundary.tsx', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
vm.runInNewContext(boundaryCode, { exports: boundaryExports, require: createRequire(import.meta.url) });
let errorMessage = '';
const boundary = new boundaryExports.default({ children: 'visible context', onError: (message: string) => { errorMessage = message; } });
assert.equal(boundary.render(), 'visible context');
boundary.state = boundaryExports.default.getDerivedStateFromError();
boundary.componentDidCatch(new Error('NEVER_SEND'));
assert.equal(boundary.render(), null);
assert.ok(errorMessage.includes('Reload') && !errorMessage.includes('NEVER_SEND'), 'Failed renderer uses the existing safe error UI');
console.log(`PASS: worker assembly exactly preserves positions, normalized normals, part IDs and indices for ${partsChecked} parts / ${manifest.chunks.length} chunks.`);
