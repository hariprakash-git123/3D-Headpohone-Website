import { describe, expect, it } from "vitest";
import { resolveSiteUrl } from "@/lib/site";

describe("resolveSiteUrl", () => {
  it("treats a missing variable as unset, with a warning", () => {
    const r = resolveSiteUrl(undefined);
    expect(r.url).toBeUndefined();
    expect(r.warning).toMatch(/NEXT_PUBLIC_SITE_URL is not set/);
  });

  it("treats an empty or whitespace-only variable as unset", () => {
    for (const raw of ["", "   ", "\t\n"]) {
      const r = resolveSiteUrl(raw);
      expect(r.url).toBeUndefined();
      expect(r.warning).toMatch(/NEXT_PUBLIC_SITE_URL is not set/);
    }
  });

  it("accepts a valid https URL", () => {
    expect(resolveSiteUrl("https://example.com")).toEqual({
      url: "https://example.com",
      warning: undefined,
    });
  });

  it("removes trailing slashes", () => {
    expect(resolveSiteUrl("https://example.com/").url).toBe("https://example.com");
    expect(resolveSiteUrl("https://example.com///").url).toBe("https://example.com");
    expect(resolveSiteUrl("https://example.com/shop/").url).toBe(
      "https://example.com/shop"
    );
  });

  it("trims leading and trailing whitespace", () => {
    expect(resolveSiteUrl("  https://example.com/ \n").url).toBe(
      "https://example.com"
    );
  });

  it("rejects a malformed URL without throwing, naming the variable", () => {
    for (const raw of ["example.com", "https://", "not a url", "//example.com"]) {
      const r = resolveSiteUrl(raw);
      expect(r.url, raw).toBeUndefined();
      expect(r.warning, raw).toMatch(/NEXT_PUBLIC_SITE_URL=".*" is invalid/);
    }
  });

  it("rejects unsafe or non-https protocols", () => {
    for (const raw of [
      "javascript:alert(1)",
      "http://example.com",
      "ftp://example.com",
      "data:text/html,hi",
      "file:///etc/passwd",
    ]) {
      const r = resolveSiteUrl(raw);
      expect(r.url, raw).toBeUndefined();
      expect(r.warning, raw).toMatch(/protocol .* is not allowed/);
    }
  });

  it("allows plain http only for loopback hosts (local testing)", () => {
    expect(resolveSiteUrl("http://localhost:3000").url).toBe("http://localhost:3000");
    expect(resolveSiteUrl("http://127.0.0.1:8080/").url).toBe("http://127.0.0.1:8080");
  });

  it("rejects credentials in the URL", () => {
    expect(resolveSiteUrl("https://user:pass@example.com").url).toBeUndefined();
  });

  it("drops query string and fragment with a warning", () => {
    const r = resolveSiteUrl("https://example.com/?utm=x#top");
    expect(r.url).toBe("https://example.com");
    expect(r.warning).toMatch(/query string and fragment were ignored/);
  });

  it("normalises host case", () => {
    expect(resolveSiteUrl("https://EXAMPLE.com").url).toBe("https://example.com");
  });
});
