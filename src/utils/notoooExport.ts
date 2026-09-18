type StyledElement = HTMLElement | SVGElement;

function copyComputedStyles(source: Element, target: Element) {
  const sourceStyle = window.getComputedStyle(source);
  const targetStyle = (target as StyledElement).style;

  for (const property of sourceStyle) {
    targetStyle.setProperty(property, sourceStyle.getPropertyValue(property), sourceStyle.getPropertyPriority(property));
  }

  const sourceChildren = Array.from(source.children);
  const targetChildren = Array.from(target.children);
  sourceChildren.forEach((child, index) => copyComputedStyles(child, targetChildren[index]));
}

function fontFaceCss() {
  const rules: string[] = [];

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        if (rule.cssText.startsWith('@font-face')) {
          rules.push(rule.cssText.replaceAll(/url\((['"]?)([^'")]+)\1\)/g, (_match, quote, source) => {
            const url = new URL(source, sheet.href || document.baseURI).href;
            return `url(${quote}${url}${quote})`;
          }));
        }
      }
    } catch {
      // Cross-origin stylesheets are not needed for the local Notooo artifact.
    }
  }

  return rules.join('\n');
}

function rasterize(element: HTMLElement, scale: number) {
  const bounds = element.getBoundingClientRect();
  const clone = element.cloneNode(true) as HTMLElement;
  copyComputedStyles(element, clone);
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');

  const markup = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width * scale}" height="${bounds.height * scale}" viewBox="0 0 ${bounds.width} ${bounds.height}"><style>${fontFaceCss()}</style><foreignObject width="100%" height="100%">${markup}</foreignObject></svg>`;

  return new Promise<Blob>((resolve, reject) => {
    const image = new Image();
    const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    const timeout = window.setTimeout(() => reject(new Error('The PNG renderer took too long to start.')), 15_000);

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bounds.width * scale);
      canvas.height = Math.round(bounds.height * scale);
      const context = canvas.getContext('2d');

      window.clearTimeout(timeout);
      if (!context) {
        reject(new Error('Canvas is unavailable.'));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG encoding failed.')), 'image/png');
    };

    image.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error('The knowledge page could not be rendered as an image.'));
    };
    image.src = source;
  });
}

export async function downloadNotoooPng(element: HTMLElement, filename: string) {
  await document.fonts?.ready;
  const scale = Math.max(3, 2480 / element.getBoundingClientRect().width);
  const png = await rasterize(element, scale);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(png);
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1_000);
}
