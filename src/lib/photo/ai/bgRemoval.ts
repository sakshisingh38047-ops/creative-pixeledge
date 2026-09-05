/** Background removal that runs entirely in the browser.
 *  The model + wasm runtime are loaded on demand from a CDN, so nothing is
 *  bundled into the app and no API key is ever needed. */

type RemoveFn = (
  input: Blob | string,
  config?: Record<string, unknown>,
) => Promise<Blob>;

const CDN = "https://esm.sh/@imgly/background-removal@1.7.0";

let modulePromise: Promise<{ removeBackground: RemoveFn }> | null = null;

function loadModule() {
  if (!modulePromise) {
    modulePromise = import(/* @vite-ignore */ CDN).then((m) => ({
      removeBackground: (m.removeBackground ?? m.default?.removeBackground) as RemoveFn,
    }));
  }
  return modulePromise;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/png"),
  );
}

/** Returns a canvas holding just the subject on a transparent background. */
export async function removeBackground(
  source: HTMLImageElement | HTMLCanvasElement,
  onProgress?: (ratio: number) => void,
): Promise<HTMLCanvasElement> {
  const work = document.createElement("canvas");
  const scale = Math.min(1, 2048 / Math.max(source.width, source.height));
  work.width = Math.round(source.width * scale);
  work.height = Math.round(source.height * scale);
  work.getContext("2d")!.drawImage(source, 0, 0, work.width, work.height);

  onProgress?.(0.05);
  const { removeBackground: run } = await loadModule();
  onProgress?.(0.2);

  const blob = await run(await canvasToBlob(work), {
    output: { format: "image/png" },
    progress: (_key: string, current: number, total: number) => {
      if (total > 0) onProgress?.(0.2 + (current / total) * 0.7);
    },
  } as Record<string, unknown>);

  onProgress?.(0.95);
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("cutout failed"));
      i.src = url;
    });
    const out = document.createElement("canvas");
    out.width = source.width;
    out.height = source.height;
    out.getContext("2d")!.drawImage(img, 0, 0, out.width, out.height);
    onProgress?.(1);
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}
