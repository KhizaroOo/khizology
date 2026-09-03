/** Trigger a local file download from a Blob — never leaves the browser. */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadSVG(svg: SVGSVGElement, filename: string) {
  const serialized = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([serialized], { type: 'image/svg+xml' });
  downloadBlob(blob, filename.endsWith('.svg') ? filename : `${filename}.svg`);
}

export function downloadCanvasPNG(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, filename.endsWith('.png') ? filename : `${filename}.png`);
  }, 'image/png');
}

export function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, filename.endsWith('.json') ? filename : `${filename}.json`);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
