const APP_SCHEME = "com.jupeb.master:";
const CALLBACK_HOST = "auth";

function readParam(search: URLSearchParams, hash: URLSearchParams, key: string): string | null {
  return search.get(key) ?? hash.get(key);
}

/**
 * Keeps text returned by an auth provider safe and predictable for a toast.
 */
export function sanitizeNativeAuthMessage(message: string | null | undefined): string {
  const safeMessage = message
    ? Array.from(message, (character) => {
        const code = character.charCodeAt(0);
        return code <= 0x1f || code === 0x7f ? " " : character;
      })
        .join("")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 240)
    : "";

  return safeMessage || "Sign-in could not be completed. Please try again.";
}

/**
 * Reads a provider error returned to the native app after an OAuth attempt.
 * Supabase may put these values in either the query string or URL fragment.
 */
export function getNativeAuthCallbackError(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (url.protocol !== APP_SCHEME || url.hostname !== CALLBACK_HOST) {
    return null;
  }

  const search = url.searchParams;
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const error = readParam(search, hash, "error");
  const errorCode = readParam(search, hash, "error_code");
  const description = readParam(search, hash, "error_description");

  if (!error && !errorCode && !description) return null;

  if (error === "access_denied" || errorCode === "access_denied") {
    return "Sign-in was cancelled or not approved. You can try again.";
  }

  return sanitizeNativeAuthMessage(description);
}
