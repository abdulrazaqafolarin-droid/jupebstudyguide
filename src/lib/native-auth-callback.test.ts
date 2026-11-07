import { describe, expect, it } from "vitest";
import { getNativeAuthCallbackError } from "./native-auth-callback";

describe("getNativeAuthCallbackError", () => {
  it("reads provider error details from the query string", () => {
    expect(
      getNativeAuthCallbackError(
        "com.jupeb.master://auth?error=server_error&error_code=oauth_callback_error&error_description=Google%20sign-in%20failed",
      ),
    ).toBe("Google sign-in failed");
  });

  it("reads provider error details from the URL fragment", () => {
    expect(
      getNativeAuthCallbackError(
        "com.jupeb.master://auth#error=server_error&error_code=server_error&error_description=Provider%20unavailable",
      ),
    ).toBe("Provider unavailable");
  });

  it("shows a clear message when the user cancels provider authorization", () => {
    expect(
      getNativeAuthCallbackError("com.jupeb.master://auth?error=access_denied"),
    ).toBe("Sign-in was cancelled or not approved. You can try again.");
  });

  it("sanitizes control characters and limits provider descriptions", () => {
    const raw = "A%0AB%00" + "x".repeat(260);
    const message = getNativeAuthCallbackError(
      \`com.jupeb.master://auth?error=server_error&error_description=\${raw}\`,
    );

    expect(message).toBe(`A B xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`);
    expect(message).toHaveLength(240);
  });

  it("ignores unrelated URLs and successful callbacks", () => {
    expect(getNativeAuthCallbackError("https://example.com/?error=access_denied")).toBeNull();
    expect(getNativeAuthCallbackError("com.jupeb.master://auth?code=auth-code")).toBeNull();
    expect(getNativeAuthCallbackError("not a URL")).toBeNull();
  });

  it("uses a generic message when the provider sends no description", () => {
    expect(
      getNativeAuthCallbackError("com.jupeb.master://auth?error_code=server_error"),
    ).toBe("Sign-in could not be completed. Please try again.");
  });
});
