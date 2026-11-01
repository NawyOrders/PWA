import { describe, expect, it } from "vitest";
import { heroImage, heroIsMirrored, heroMedia } from "@/lib/media";

describe("hero media selection", () => {
  it("uses the RTL artwork for Arabic", () => {
    expect(heroImage("ar")).toBe(heroMedia.rtl);
    expect(heroIsMirrored("ar")).toBe(false);
  });

  it("mirrors the RTL artwork for English until dedicated LTR art exists", () => {
    expect(heroImage("en")).toBe(heroMedia.rtl);
    expect(heroIsMirrored("en")).toBe(heroMedia.ltr === null);
  });
});
