import { assembleChunk } from './geometry-assembly';
import { decodeModelResponse } from './model-download';

self.onmessage = async ({ data }) => {
  try {
    const response = await fetch(data.url);
    const buffer = await decodeModelResponse(response, data.bytes, data.compressed);
    const groups = assembleChunk(buffer, data.parts);
    const transfers = [buffer, ...groups.flatMap(group => [group.positions.buffer, group.normals.buffer, group.partIndices.buffer, group.indices.buffer])];
    self.postMessage({ id: data.id, buffer, groups }, { transfer: transfers });
  } catch { self.postMessage({ id: data.id, error: 'An anatomy file could not be prepared. Please reload the viewer.' }); }
};
