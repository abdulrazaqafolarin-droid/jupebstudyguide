/**
 * Downloads a public question illustration in the browser and packages it
 * for Gemini Vision. The server never fetches an arbitrary URL, avoiding an
 * SSRF proxy. SVG/GIF content is rasterized to PNG because Gemini accepts
 * PNG/JPEG/WebP image payloads, not SVG/GIF.
 */
export interface QuestionImageAttachment {
  base64: string;
  mimeType: string;
  name: string;
}

export const MAX_QUESTION_IMAGE_BYTES = 1_500_000;
const IMAGE_FETCH_TIMEOUT_MS = 12_000;
const RASTER_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);
const RASTERIZE_IMAGE_TYPES = new Set([
  "image/svg+xml",
  "image/gif",
]);
const MAX_RASTER_DIMENSION = 3072;
const MAX_RASTER_PIXELS = MAX_RASTER_DIMENSION * MAX_RASTER_DIMENSION;

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function loadImage(url: string, signal: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    let settled = false;

    const cleanup = () => {
      image.onload = null;
      image.onerror = null;
      signal.removeEventListener("abort", abort);
    };
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };
    const abort = () => {
      image.src = "";
      finish(() => reject(new DOMException("Image decoding aborted", "AbortError")));
    };

    image.onload = () => finish(() => resolve(image));
    image.onerror = () => finish(() => reject(new Error("The question image could not be decoded.")));
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    image.src = url;
  });
}

/** Convert SVG (or GIF's first frame) to a Gemini-compatible PNG in WebView. */
async function rasterizeToPng(bytes: Uint8Array, mimeType: string, signal: AbortSignal): Promise<Uint8Array> {
  const objectUrl = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  try {
    const image = await loadImage(objectUrl, signal);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    if (!sourceWidth || !sourceHeight) {
      throw new Error("The question image has invalid dimensions.");
    }

    const scale = Math.min(
      1,
      MAX_RASTER_DIMENSION / Math.max(sourceWidth, sourceHeight),
      Math.sqrt(MAX_RASTER_PIXELS / (sourceWidth * sourceHeight)),
    );
    const width = Math.max(1, Math.floor(sourceWidth * scale));
    const height = Math.max(1, Math.floor(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("This device cannot prepare the question image for AI analysis.");
    }
    context.drawImage(image, 0, 0, width, height);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("The question image could not be converted for AI analysis."));
      }, "image/png");
    });
    if (signal.aborted) {
      throw new DOMException("Image conversion aborted", "AbortError");
    }
    const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
    if (pngBytes.byteLength === 0) {
      throw new Error("The converted question image is empty.");
    }
    return pngBytes;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function fetchQuestionImageAttachment(
  imageUrl: string,
  signal?: AbortSignal,
): Promise<QuestionImageAttachment> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    throw new Error("The question image URL is invalid.");
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error("The question image must use a secure web address.");
  }

  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(signal?.reason);
  if (signal?.aborted) abortFromCaller();
  else signal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(new DOMException("Question image request timed out", "TimeoutError")),
    IMAGE_FETCH_TIMEOUT_MS,
  );

  try {
    const response = await fetch(parsedUrl.href, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`The question image could not be downloaded (HTTP ${response.status}).`);
    }

    const declaredLength = response.headers.get("content-length");
    if (declaredLength && Number(declaredLength) > MAX_QUESTION_IMAGE_BYTES) {
      throw new Error("The question image is too large to send for AI analysis (maximum 1.5 MB).");
    }

    const sourceMimeType = (response.headers.get("content-type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase();

    if (!RASTER_IMAGE_TYPES.has(sourceMimeType) && !RASTERIZE_IMAGE_TYPES.has(sourceMimeType)) {
      throw new Error("This question image format cannot be analysed. Use PNG, JPEG, WebP, SVG, or GIF.");
    }

    const sourceBytes = new Uint8Array(await response.arrayBuffer());
    if (sourceBytes.byteLength === 0) {
      throw new Error("The question image is empty.");
    }
    if (sourceBytes.byteLength > MAX_QUESTION_IMAGE_BYTES) {
      throw new Error("The question image is too large to send for AI analysis (maximum 1.5 MB).");
    }

    const converted = RASTERIZE_IMAGE_TYPES.has(sourceMimeType);
    const bytes = converted
      ? await rasterizeToPng(sourceBytes, sourceMimeType, controller.signal)
      : sourceBytes;
    if (bytes.byteLength > MAX_QUESTION_IMAGE_BYTES) {
      throw new Error("The prepared question image is too large to send for AI analysis (maximum 1.5 MB).");
    }

    const encodedName = parsedUrl.pathname.split("/").filter(Boolean).pop() || "question-image";
    let rawName = encodedName;
    try { rawName = decodeURIComponent(encodedName); } catch { /* keep the safe encoded path segment */ }
    let name = rawName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "question-image";
    let mimeType = sourceMimeType;
    if (converted) {
      name = name.replace(/\.(svg|gif)$/i, ".png");
      if (!name.toLowerCase().endsWith(".png")) name += ".png";
      mimeType = "image/png";
    } else if (mimeType === "image/jpg") {
      mimeType = "image/jpeg";
    }

    return { base64: encodeBase64(bytes), mimeType, name };
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted) {
      throw new Error("The question image took too long to load. Your answer is saved; retry the explanation.");
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}
