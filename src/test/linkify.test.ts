import { describe, it, expect, vi, beforeEach } from "vitest";
import { linkify, validateMedia, formatFileSize, getDocTypeIcon } from "@/lib/linkify";

describe("linkify", () => {
  it("returns text segment for plain text", () => {
    const result = linkify("hello world");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ text: "hello world", type: "text" });
  });

  it("detects a single url", () => {
    const result = linkify("visit https://example.com now");
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ text: "visit ", type: "text" });
    expect(result[1]).toEqual({ text: "https://example.com", type: "url", href: "https://example.com" });
    expect(result[2]).toEqual({ text: " now", type: "text" });
  });

  it("detects an email address", () => {
    const result = linkify("email me@test.com thanks");
    expect(result).toHaveLength(3);
    expect(result[1]).toEqual({ text: "me@test.com", type: "email", href: "mailto:me@test.com" });
  });

  it("detects a phone number", () => {
    const result = linkify("call +1-555-123-4567 today");
    expect(result[1].type).toBe("phone");
    if (result[1].href) {
      expect(result[1].href.startsWith("tel:")).toBe(true);
    }
  });

  it("returns empty array for empty string", () => {
    const result = linkify("");
    expect(result).toHaveLength(0);
  });

  it("handles multiple urls", () => {
    const result = linkify("a https://a.com b https://b.com c");
    const urls = result.filter(s => s.type === "url");
    expect(urls).toHaveLength(2);
    expect(urls[0].href).toBe("https://a.com");
    expect(urls[1].href).toBe("https://b.com");
  });

  it("handles http and https urls", () => {
    const http = linkify("http://example.com");
    const https = linkify("https://example.com");
    expect(http[0].type).toBe("url");
    expect(https[0].type).toBe("url");
  });

  it("handles url with path", () => {
    const result = linkify("https://example.com/path/to/page?q=1#section");
    expect(result[0]).toEqual({
      text: "https://example.com/path/to/page?q=1#section",
      type: "url",
      href: "https://example.com/path/to/page?q=1#section",
    });
  });

  it("detects mixed content", () => {
    const result = linkify("contact me@site.com or visit https://site.com");
    expect(result.filter(s => s.type === "email")).toHaveLength(1);
    expect(result.filter(s => s.type === "url")).toHaveLength(1);
  });
});

describe("validateMedia", () => {
  it("accepts valid jpeg under limit", () => {
    expect(validateMedia("image/jpeg", 1024 * 1024)).toEqual({ valid: true });
  });

  it("rejects image over 100MB", () => {
    const result = validateMedia("image/jpeg", 101 * 1024 * 1024);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("100MB");
  });

  it("accepts valid mp4 under 2GB", () => {
    expect(validateMedia("video/mp4", 500 * 1024 * 1024)).toEqual({ valid: true });
  });

  it("rejects video over 2GB", () => {
    const result = validateMedia("video/mp4", 3 * 1024 * 1024 * 1024);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("2GB");
  });

  it("accepts valid audio under 500MB", () => {
    expect(validateMedia("audio/mpeg", 50 * 1024 * 1024)).toEqual({ valid: true });
  });

  it("rejects audio over 500MB", () => {
    const result = validateMedia("audio/mpeg", 600 * 1024 * 1024);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("500MB");
  });

  it("rejects unsupported image format", () => {
    const result = validateMedia("image/bmp", 1024);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Unsupported image format");
  });

  it("rejects unsupported video format", () => {
    const result = validateMedia("video/avi", 1024);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Unsupported video format");
  });

  it("accepts unknown types as valid", () => {
    expect(validateMedia("application/octet-stream", 1024)).toEqual({ valid: true });
  });
});

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(2048)).toBe("2.0 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("formats gigabytes", () => {
    expect(formatFileSize(2 * 1024 * 1024 * 1024)).toBe("2.00 GB");
  });

  it("handles zero bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
  });

  it("rounds 1023 bytes to 1023 B", () => {
    expect(formatFileSize(1023)).toBe("1023 B");
  });

  it("rounds 1024 bytes to 1.0 KB", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
  });
});

describe("getDocTypeIcon", () => {
  it("returns pdf for application/pdf", () => {
    expect(getDocTypeIcon("application/pdf")).toBe("pdf");
  });

  it("returns word for word documents", () => {
    expect(getDocTypeIcon("application/msword")).toBe("word");
    expect(getDocTypeIcon("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe("word");
  });

  it("returns excel for spreadsheets", () => {
    expect(getDocTypeIcon("application/vnd.ms-excel")).toBe("excel");
  });

  it("returns zip for archives", () => {
    expect(getDocTypeIcon("application/zip")).toBe("zip");
    expect(getDocTypeIcon("application/x-rar-compressed")).toBe("rar");
  });

  it("returns txt for plain text", () => {
    expect(getDocTypeIcon("text/plain")).toBe("txt");
  });

  it("returns csv for csv", () => {
    expect(getDocTypeIcon("text/csv")).toBe("csv");
  });

  it("returns generic for unknown mime", () => {
    expect(getDocTypeIcon("application/unknown")).toBe("generic");
  });
});
