import { describe, it, expect } from "vitest";
import { mediaUrl, thumbUrl } from "./media-url";

describe("mediaUrl", () => {
  it("passes through absolute paths and URLs", () => {
    expect(mediaUrl("/demo/travel/japan-1.svg")).toBe("/demo/travel/japan-1.svg");
    expect(mediaUrl("https://cdn.example.com/x.jpg")).toBe(
      "https://cdn.example.com/x.jpg",
    );
  });

  it("roots a bare key at /", () => {
    expect(mediaUrl("demo/travel/japan-1.svg")).toBe("/demo/travel/japan-1.svg");
  });

  it("returns an empty string for a missing key", () => {
    expect(mediaUrl(null)).toBe("");
    expect(mediaUrl(undefined)).toBe("");
  });
});

describe("thumbUrl", () => {
  it("prefers the thumbnail when present", () => {
    expect(thumbUrl({ thumbKey: "/t.svg", storageKey: "/o.svg" })).toBe("/t.svg");
  });

  it("falls back to the original when there is no thumbnail", () => {
    expect(thumbUrl({ thumbKey: null, storageKey: "/o.svg" })).toBe("/o.svg");
  });
});
