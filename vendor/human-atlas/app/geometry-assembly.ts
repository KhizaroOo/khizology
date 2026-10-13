import type { Part } from './anatomy';

/** Preserve every source vertex/normal/index; batch without Three.js on the worker. */
export function assembleChunk(buffer: ArrayBuffer, parts: Array<Part & { partIndex: number }>) {
  const systems = new Map<string, typeof parts>();
  for (const part of parts) {
    const group = systems.get(part.system) || [];
    group.push(part); systems.set(part.system, group);
  }
  return [...systems].map(([system, group]) => {
    const vertices = group.reduce((n, p) => n + p.vertexCount, 0);
    const positions = new Float32Array(vertices * 3), normals = new Int16Array(vertices * 3), partIndices = new Float32Array(vertices);
    const IndexArray = vertices > 65535 ? Uint32Array : Uint16Array;
    const indices = new IndexArray(group.reduce((n, p) => n + p.indexCount, 0));
    let vertexOffset = 0, indexOffset = 0;
    for (const part of group) {
      positions.set(new Float32Array(buffer, part.positions, part.vertexCount * 3), vertexOffset * 3);
      normals.set(new Int16Array(buffer, part.normals, part.vertexCount * 3), vertexOffset * 3);
      partIndices.fill(part.partIndex, vertexOffset, vertexOffset + part.vertexCount);
      const source = new Uint32Array(buffer, part.indices, part.indexCount);
      for (let i = 0; i < source.length; i++) indices[indexOffset + i] = source[i] + vertexOffset;
      vertexOffset += part.vertexCount; indexOffset += part.indexCount;
    }
    return { system, positions, normals, partIndices, indices };
  });
}
