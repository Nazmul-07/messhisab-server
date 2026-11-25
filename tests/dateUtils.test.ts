import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getDhakaMonthKey,
  getMonthBounds,
  isValidMonthKey,
  toDhakaBusinessDate,
} from "../src/shared/dateUtils.js";

describe("dateUtils - Asia/Dhaka business date & monthKey", () => {
  it("normalizes YYYY-MM-DD strings to UTC midnight", () => {
    const d = toDhakaBusinessDate("2026-11-25");
    assert.equal(d.toISOString(), "2026-11-25T00:00:00.000Z");
  });

  it("extracts Asia/Dhaka monthKey across UTC midnight boundary", () => {
    // 2026-11-30T20:00:00Z is 2026-12-01T02:00:00+06:00 in Dhaka => 2026-12
    const monthKey = getDhakaMonthKey("2026-11-30T20:00:00.000Z");
    assert.equal(monthKey, "2026-12");
  });

  it("validates monthKey format", () => {
    assert.equal(isValidMonthKey("2026-11"), true);
    assert.equal(isValidMonthKey("2026-13"), false);
    assert.equal(isValidMonthKey("2026-1"), false);
  });

  it("computes inclusive start and exclusive end month bounds", () => {
    const { start, endExclusive } = getMonthBounds("2026-02");
    assert.equal(start.toISOString(), "2026-02-01T00:00:00.000Z");
    assert.equal(endExclusive.toISOString(), "2026-03-01T00:00:00.000Z");
  });
});
