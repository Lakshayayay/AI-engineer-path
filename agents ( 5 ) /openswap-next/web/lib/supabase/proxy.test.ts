import { describe, expect, it } from "vitest";
import { shouldRedirectToLogin } from "./proxy";

describe("shouldRedirectToLogin", () => {
  it("sends a signed-out visitor from a page to the login screen", () => {
    expect(shouldRedirectToLogin("/", false)).toBe(true);
    expect(shouldRedirectToLogin("/settings", false)).toBe(true);
  });

  it("lets a signed-in visitor through", () => {
    expect(shouldRedirectToLogin("/", true)).toBe(false);
    expect(shouldRedirectToLogin("/settings", true)).toBe(false);
  });

  it("never redirects the login screen or the auth routes, or it would loop", () => {
    expect(shouldRedirectToLogin("/login", false)).toBe(false);
    expect(shouldRedirectToLogin("/auth/callback", false)).toBe(false);
    expect(shouldRedirectToLogin("/auth/login", false)).toBe(false);
  });

  it("leaves API routes to answer 401 themselves", () => {
    expect(shouldRedirectToLogin("/api/chat", false)).toBe(false);
    expect(shouldRedirectToLogin("/api/conversations/abc", false)).toBe(false);
  });

  it("does not treat look-alike paths as public", () => {
    expect(shouldRedirectToLogin("/loginx", false)).toBe(true);
    expect(shouldRedirectToLogin("/authors", false)).toBe(true);
    expect(shouldRedirectToLogin("/apiary", false)).toBe(true);
  });
});
