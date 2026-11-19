import { describe, expect, it } from "vitest";
import {
  appVersion,
  courier,
  destinationPosition,
  faqItems,
  feedbackRatings,
  feedbackTypes,
  helpCards,
  kitchenPosition,
  platforms,
  policies,
  policyTabs,
  reportProblemTypes,
  savedAddresses,
  trackingRoute,
  trackingSteps,
} from "@/lib/account-data";

describe("account and support content", () => {
  it("maps every policy tab to a non-empty article", () => {
    expect(policyTabs.map((tab) => tab.id).sort()).toEqual(Object.keys(policies).sort());
    policyTabs.forEach((tab) => {
      const article = policies[tab.id];
      expect(article.sections.length).toBeGreaterThan(0);
      const ids = article.sections.map((section) => section.id);
      expect(new Set(ids).size).toBe(ids.length);
      article.sections.forEach((section) => {
        expect(section.title.length).toBeGreaterThan(0);
        expect(section.body.length).toBeGreaterThan(0);
      });
    });
  });

  it("keeps version and platform metadata presentable", () => {
    expect(appVersion).toMatch(/^\d+\.\d+$/);
    expect(platforms).toHaveLength(2);
    expect(platforms.some((platform) => platform.tone === "brand")).toBe(true);
    expect(platforms.some((platform) => platform.tone === "violet")).toBe(true);
  });

  it("keeps saved addresses valid and uniquely identified", () => {
    const ids = savedAddresses.map((address) => address.id);
    expect(new Set(ids).size).toBe(ids.length);
    savedAddresses.forEach((address) => {
      expect(address.title.length).toBeGreaterThan(0);
      expect(address.detail.length).toBeGreaterThan(0);
      expect(Math.abs(address.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(address.lng)).toBeLessThanOrEqual(180);
    });
  });

  it("keeps FAQ entries uniquely identified with non-empty answers", () => {
    const ids = faqItems.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(faqItems.some((item) => item.popular)).toBe(true);
    faqItems.forEach((item) => {
      expect(item.question.length).toBeGreaterThan(0);
      expect(item.answer.length).toBeGreaterThan(0);
    });
  });

  it("offers report and feedback options", () => {
    expect(reportProblemTypes.length).toBeGreaterThan(0);
    expect(feedbackTypes.length).toBeGreaterThan(0);
    expect(feedbackRatings.length).toBe(5);
  });

  it("keeps tracking route aligned with kitchen and destination", () => {
    expect(trackingSteps).toHaveLength(4);
    expect(trackingRoute[0]).toEqual([kitchenPosition.lat, kitchenPosition.lng]);
    expect(trackingRoute[trackingRoute.length - 1]).toEqual([
      destinationPosition.lat,
      destinationPosition.lng,
    ]);
    expect(courier.rating).toBeGreaterThan(0);
    expect(courier.rating).toBeLessThanOrEqual(5);
  });

  it("links every help card to a unique destination id", () => {
    const ids = helpCards.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
