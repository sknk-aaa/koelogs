import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  confirmCheckoutSession,
  createBillingPortalSession,
  createCheckoutSession,
  refreshBillingSubscription,
} from "./billing";

describe("billing api", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns checkout url on success", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { url: "https://checkout.stripe.test/session" } }),
    } as Response);

    await expect(createCheckoutSession("monthly")).resolves.toBe("https://checkout.stripe.test/session");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/billing/checkout",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      })
    );
  });

  it("surfaces backend error for portal session", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ errors: ["stripe customer is missing"] }),
    } as Response);

    await expect(createBillingPortalSession()).rejects.toThrow("stripe customer is missing");
  });

  it("sends session id when confirming checkout", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { ok: true } }),
    } as Response);

    await expect(confirmCheckoutSession("cs_test_123")).resolves.toBeUndefined();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/billing/checkout/confirm",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ session_id: "cs_test_123" }),
      })
    );
  });

  it("throws on refresh failure", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "refresh failed" }),
    } as Response);

    await expect(refreshBillingSubscription()).rejects.toThrow("refresh failed");
  });
});
