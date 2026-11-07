import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const APP_SCHEME = "com.jupeb.master:";
const CALLBACK_HOST = "auth";

/**
 * Completes Supabase auth callbacks delivered through the iOS custom URL
 * scheme, including social OAuth, email verification and password recovery.
 * The listener handles both warm and cold app launches.
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

      // Close the Safari authentication sheet when Google redirects back
      // into the native app. A close failure must not block session exchange.
      try {
        await Browser.close();
      } catch {
        // The browser may already have been dismissed by the operating system.
      }

      const params = new URLSearchParams(url.search);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const code = params.get("code") ?? hash.get("code");
      const tokenHash = params.get("token_hash") ?? hash.get("token_hash");
      const type = params.get("type") ?? hash.get("type");
      const isPasswordRecovery = params.get("flow") === "recovery" || type === "recovery";
      const callbackError = params.get("error") ?? hash.get("error");
      const callbackErrorCode = params.get("error_code") ?? hash.get("error_code");
      const callbackErrorDescription = params.get("error_description") ?? hash.get("error_description");

      // OAuth providers return errors in the callback URL when the user
      // cancels consent or the provider rejects the request. Handle these
      // before looking for a PKCE code, otherwise the failure is invisible.
      if (callbackError || callbackErrorCode) {
        const isCancellation =
          callbackError === "access_denied" ||
          callbackErrorCode === "access_denied" ||
          callbackErrorCode === "user_cancelled" ||
          /cancel(?:led|ed)?/i.test(callbackErrorDescription ?? "");
        toast({
          title: isCancellation ? "Sign-in cancelled" : "Sign-in failed",
          description: isCancellation
            ? "The sign-in request was cancelled. You can try again whenever you're ready."
            : (callbackErrorDescription || callbackErrorCode || callbackError || "The identity provider could not complete sign-in."),
          variant: isCancellation ? "default" : "destructive",
        });
        navigate("/auth", { replace: true });
        return;
      }

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
          console.warn("[auth] iOS authentication callback could not be completed:", error.message);
          toast({
            title: "Sign-in could not be completed",
            description: error.message || "Please return to the sign-in screen and try again.",
            variant: "destructive",
          });
          navigate("/auth", { replace: true });
          return;
        }

        // The successful exchange persists the session through Supabase's
        // normal auth storage and emits AUTH state changes for the whole app.
        navigate(isPasswordRecovery ? "/auth?flow=recovery" : "/", { replace: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "An unexpected authentication error occurred.";
        console.warn("[auth] iOS authentication callback failed:", message);
        toast({
          title: "Sign-in could not be completed",
          description: message,
          variant: "destructive",
        });
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
