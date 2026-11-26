/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_JAMB?: string;
  readonly VITE_ANDROID_RELEASE_BASE_URL?: string;
  readonly VITE_ANDROID_RELEASE_APK_NAME?: string;
  readonly VITE_ANDROID_PACKAGE_NAME?: string;
  readonly VITE_NATIVE_APP_SCHEME?: string;
}
