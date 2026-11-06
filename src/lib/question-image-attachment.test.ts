import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchQuestionImageAttachment,
  MAX_QUESTION_IMAGE_BYTES,
} from "./question-image-attachment";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchQuestionImageAttachment", () => {
  it("downloads a supported question image and returns a base64 AI attachment", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new TextEncoder().encode("diagram-bytes"), {
        status: 200,
        headers: { "content-type": "image/png" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchQuestionImageAttachment(
      "https://cdn.example.org/questions/circuit-diagram.png?token=temporary",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://cdn.example.org/questions/circuit-diagram.png?token=temporary",
      expect.objectContaining({ mode: "cors", credentials: "omit" }),
    );
    expect(result).toEqual({
      base64: "ZGlhZ3JhbS1ieXRlcw==",
      mimeType: "image/png",
      name: "circuit-diagram.png",
    });
  });

  it("rasterizes SVG question diagrams to PNG before sending them to Gemini", async () => {
    const nativeUrl = URL;
    const createObjectURL = vi.fn().mockReturnValue("blob:question-svg");
    const revokeObjectURL = vi.fn();
    class TestImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 760;
      naturalHeight = 470;
      width = 760;
      height = 470;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    const drawImage = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({ drawImage }),
      toBlob: vi.fn((callback: BlobCallback) => {
        const pngBlob = {
          arrayBuffer: vi.fn().mockResolvedValue(
            new TextEncoder().encode("png-diagram").buffer,
          ),
        } as unknown as Blob;
        callback(pngBlob);
      }),
    };
    const createElement = vi.fn().mockReturnValue(canvas);
    class URLWithObjectUrls extends nativeUrl {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    }
    vi.stubGlobal("URL", URLWithObjectUrls);
    vi.stubGlobal("Image", TestImage);
    vi.stubGlobal("document", { createElement });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("<svg></svg>", {
        status: 200,
        headers: { "content-type": "image/svg+xml" },
      }),
    ));

    const result = await fetchQuestionImageAttachment(
      "https://cdn.example.org/questions/circuit.svg",
    );

    expect(result).toEqual({
      base64: "cG5nLWRpYWdyYW0=",
      mimeType: "image/png",
      name: "circuit.png",
    });
    expect(createElement).toHaveBeenCalledWith("canvas");
    expect(canvas.width).toBe(760);
    expect(canvas.height).toBe(470);
    expect(drawImage).toHaveBeenCalledOnce();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:question-svg");
  });

  it("aborts a stalled image download after the safety timeout", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    }));
    vi.stubGlobal("fetch", fetchMock);

    try {
      const pending = fetchQuestionImageAttachment("https://cdn.example.org/slow.png");
      const assertion = expect(pending).rejects.toThrow("too long to load");
      await vi.advanceTimersByTimeAsync(12_000);
      await assertion;
      expect(fetchMock).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects non-image responses instead of sending text-only context", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("not an image", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    ));

    await expect(fetchQuestionImageAttachment("https://cdn.example.org/question"))
      .rejects.toThrow("image format cannot be analysed");
  });

  it("rejects images larger than the request safety limit", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-length": String(MAX_QUESTION_IMAGE_BYTES + 1),
        },
      }),
    ));

    await expect(fetchQuestionImageAttachment("https://cdn.example.org/large.png"))
      .rejects.toThrow("too large");
  });

  it("rejects non-web URLs", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchQuestionImageAttachment("file:///private/question.png"))
      .rejects.toThrow("secure web address");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
