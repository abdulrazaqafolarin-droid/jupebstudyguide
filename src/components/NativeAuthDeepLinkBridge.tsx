import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const APP_SCHEME = "com.jupeb.master:";
const CALLBACK_HOST = "auth";

/**
 * Exchanges Supabase email-verification links delivered through the iOS
 * custom URL scheme. The listener handles both warm and cold app launches.
 */
export function NativeAuthDeepLinkBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    if (Capacitor.getPlatform() !== "ios") return;

    let disposed = false;
    const processed = new Set<string>();

    const handleUrl = async (rawUrl: string) => {
      if (disposed || processed.has(rawUrl)) return;

      let url: URL;
      try {
        url = new URL(rawUrl);
      } catch {
        return;
      }

      if (url.protocol !== APP_SCHEME || url.hostname !== CALLBACK_HOST) return;
      processed.add(rawUrl);

      const params = new URLSearchParams(url.search);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const code = params.get("code") ?? hash.get("code");
      const tokenHash = params.get("token_hash") ?? hash.get("token_hash");
      const type = params.get("type") ?? hash.get("type");
      const isPasswordRecovery = params.get("flow") === "recovery" || type === "recovery";

      try {
        let error: Error | null = null;

        if (code) {
          const result = await supabase.auth.exchangeCodeForSession(code);
          error = result.error;
        } else if (tokenHash && (type === "signup" || type === "invite" || type === "magiclink" || type === "recovery")) {
          const result = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });
          error = result.error;
        } else {
          const accessToken = params.get("access_token") ?? hash.get("access_token");
          const refreshToken = params.get("refresh_token") ?? hash.get("refresh_token");
          if (accessToken && refreshToken) {
            const result = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            error = result.error;
          } else {
            console.warn("[auth] ignored an unrecognized iOS auth callback");
            return;
          }
        }

        if (error) {
          console.warn("[auth] iOS email verification could not be completed:", error.message);
          navigate("/auth", { replace: true });
          return;
        }

        // The successful exchange persists the session through Supabase's
        // normal auth storage and emits AUTH state changes for the whole app.
        navigate(isPasswordRecovery ? "/auth?flow=recovery" : "/", { replace: true });
      } catch (error) {
        console.warn(
          "[auth] iOS email verification failed:",
          error instanceof Error ? error.message : "unknown error",
        );
        navigate("/auth", { replace: true });
      }
    };

    const listener = CapacitorApp.addListener("appUrlOpen", ({ url }) => {
      void handleUrl(url);
    });

    void CapacitorApp.getLaunchUrl()
      .then((launch) => {
        if (launch?.url) return handleUrl(launch.url);
      })
      .catch((error) => {
        console.warn("[auth] could not read the iOS launch URL:", error);
      });

    return () => {
      disposed = true;
      void listener.then((handle) => handle.remove());
    };
  }, [navigate]);

  return null;
}
