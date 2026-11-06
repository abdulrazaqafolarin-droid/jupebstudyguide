import { afterEach, describe, expect, it, vi } from "vitest";
import { createAuthAwareFetch } from "./auth-aware-fetch";

afterEach(() => {
  vi.useRealTimers();
});

describe("createAuthAwareFetch", () => {
  it("aborts a stalled Supabase Auth request at the deadline", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        );
      }),
    );
    const authFetch = createAuthAwareFetch(fetchMock as typeof fetch, 1_000);

    const pending = authFetch("https://project.supabase.co/auth/v1/signup");
    const rejected = expect(pending).rejects.toThrow("Aborted");
    await vi.advanceTimersByTimeAsync(1_000);
    await rejected;

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it("does not impose the Auth timeout on AI/database requests", async () => {
    vi.useFakeTimers();
    const response = new Response("ok", { status: 200 });
    const fetchMock = vi.fn().mockResolvedValue(response);
    const authFetch = createAuthAwareFetch(fetchMock as typeof fetch, 1_000);

    const request = authFetch("https://project.supabase.co/functions/v1/chat-proxy");
    await vi.advanceTimersByTimeAsync(2_000);

    await expect(request).resolves.toBe(response);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://project.supabase.co/functions/v1/chat-proxy",
      undefined,
    );
  });

  it("relays a caller cancellation to the actual network request", async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        );
      }),
    );
    const authFetch = createAuthAwareFetch(fetchMock as typeof fetch, 10_000);
    const caller = new AbortController();

    const pending = authFetch("https://project.supabase.co/auth/v1/token", {
      signal: caller.signal,
    });
    caller.abort();
    await expect(pending).rejects.toThrow("Aborted");
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });
});
