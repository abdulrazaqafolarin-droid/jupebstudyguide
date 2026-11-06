export const AUTH_FETCH_TIMEOUT_MS = 15_000;

/**
 * Bound only Supabase Auth HTTP requests. Other Supabase traffic is left to
 * its own request deadlines so an auth safeguard cannot truncate AI streams,
 * database reads or storage uploads.
 */
export function createAuthAwareFetch(
  fetchImplementation: typeof fetch = globalThis.fetch,
  timeoutMs = AUTH_FETCH_TIMEOUT_MS,
): typeof fetch {
  return async (input, init) => {
    const requestUrl = input instanceof Request ? input.url : String(input);
    if (!requestUrl.includes("/auth/v1/")) {
      return fetchImplementation(input, init);
    }

    const callerSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    const controller = new AbortController();
    const abortFromCaller = () => controller.abort(callerSignal?.reason);

    if (callerSignal?.aborted) {
      abortFromCaller();
    } else {
      callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
    }

    const timeoutId = globalThis.setTimeout(
      () => controller.abort(new DOMException("Authentication request timed out", "TimeoutError")),
      timeoutMs,
    );

    try {
      return await fetchImplementation(input, { ...init, signal: controller.signal });
    } finally {
      globalThis.clearTimeout(timeoutId);
      callerSignal?.removeEventListener("abort", abortFromCaller);
    }
  };
}
