import { describe, it, expect } from "vitest";
import { safeMediaUrl, isValidUrl, isAbsoluteUrl } from "@/lib/url";

describe("safeMediaUrl", () => {
  it("returns undefined for null", () => {
    expect(safeMediaUrl(null)).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(safeMediaUrl(undefined)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(safeMediaUrl("")).toBeUndefined();
  });

  it("returns the url for a valid https url", () => {
    const url = "https://example.com/image.jpg";
    expect(safeMediaUrl(url)).toBe(url);
  });

  it("returns the url for a valid http url", () => {
    const url = "http://example.com/image.jpg";
    expect(safeMediaUrl(url)).toBe(url);
  });

  it("returns undefined for javascript: protocol", () => {
    expect(safeMediaUrl("javascript:alert(1)")).toBeUndefined();
  });

  it("returns undefined for blob: protocol", () => {
    expect(safeMediaUrl("blob:1234-5678")).toBeUndefined();
  });

  it("returns undefined for data: protocol", () => {
    expect(safeMediaUrl("data:text/plain,hello")).toBeUndefined();
  });

  it("returns undefined for file: protocol", () => {
    expect(safeMediaUrl("file:///etc/passwd")).toBeUndefined();
  });

  it("returns undefined for ftp: protocol", () => {
    expect(safeMediaUrl("ftp://example.com/file")).toBeUndefined();
  });

  it("returns undefined for malformed url", () => {
    expect(safeMediaUrl("not a url")).toBeUndefined();
  });
});

describe("isValidUrl", () => {
  it("returns false for undefined", () => {
    expect(isValidUrl(undefined)).toBe(false);
  });

  it("returns true for https url", () => {
    expect(isValidUrl("https://example.com")).toBe(true);
  });

  it("returns true for http url", () => {
    expect(isValidUrl("http://example.com")).toBe(true);
  });

  it("returns true for mailto: url", () => {
    expect(isValidUrl("mailto:test@example.com")).toBe(true);
  });

  it("returns true for tel: url", () => {
    expect(isValidUrl("tel:+1234567890")).toBe(true);
  });

  it("returns false for javascript: url", () => {
    expect(isValidUrl("javascript:alert(1)")).toBe(false);
  });

  it("returns false for blob: url", () => {
    expect(isValidUrl("blob:abc-123")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidUrl("")).toBe(false);
  });

  it("returns false for malformed string", () => {
    expect(isValidUrl("not a url")).toBe(false);
  });
});

describe("isAbsoluteUrl", () => {
  it("returns true for https url", () => {
    expect(isAbsoluteUrl("https://example.com")).toBe(true);
  });

  it("returns true for http url", () => {
    expect(isAbsoluteUrl("http://example.com")).toBe(true);
  });

  it("returns true for protocol-relative url", () => {
    expect(isAbsoluteUrl("//cdn.example.com/file.js")).toBe(true);
  });

  it("returns false for relative url", () => {
    expect(isAbsoluteUrl("/path/to/file")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isAbsoluteUrl("")).toBe(false);
  });

  it("returns false for hash fragment", () => {
    expect(isAbsoluteUrl("#section")).toBe(false);
  });
});
