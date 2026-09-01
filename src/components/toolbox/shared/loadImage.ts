export interface LoadedImage {
  image: HTMLImageElement;
  width: number;
  height: number;
  fileSizeBytes: number;
  mimeType: string;
  fileName: string;
}

export function loadImageFromFile(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({
        image: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        fileSizeBytes: file.size,
        mimeType: file.type,
        fileName: file.name,
      });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read this file as an image.'));
    };
    img.src = url;
  });
}
