const DEFAULT_NATIVE_APP_SCHEME = "com.jupeb.master";

const configuredScheme = (import.meta.env.VITE_NATIVE_APP_SCHEME || DEFAULT_NATIVE_APP_SCHEME)
  .trim()
  .replace(/:$/, "");

export const NATIVE_APP_SCHEME = /^[a-z][a-z0-9+.-]*$/i.test(configuredScheme)
  ? configuredScheme
  : DEFAULT_NATIVE_APP_SCHEME;

export const NATIVE_AUTH_REDIRECT_URI = NATIVE_APP_SCHEME + "://auth";
