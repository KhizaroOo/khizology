import previews from '../data/imagePreviews.json';
import { img } from './url';

const manifest: Record<string, { width: number; src: string }[]> = previews;
export function preview(path: string): string {
  return img(manifest[path]?.[0]?.src || path);
}
export function previewSrcset(path: string): string | undefined {
  return manifest[path]?.map(v => `${img(v.src)} ${v.width}w`).join(', ');
}
