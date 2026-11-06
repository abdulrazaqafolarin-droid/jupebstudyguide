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
