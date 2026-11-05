import { describe, expect, it } from "vitest";

import { getInitialPlanMonthRange, parsePlanMonthRange } from "./planMonthRange";

describe("plan month range", () => {
    it.each([
        [new Date(2026, 10, 30, 23, 30), { from: "2026-11", to: "2027-04" }],
        [new Date(2026, 11, 1, 0, 30), { from: "2026-12", to: "2027-05" }],
    ])("starts with the local month and includes five following months (%s)", (today, expected) => {
        expect(getInitialPlanMonthRange(today)).toEqual(expected);
    });

    it.each([
        { from: "2026-11", to: "2026-11" },
        { from: "2026-12", to: "2027-01" },
        { from: "2020-01", to: "2029-12" },
    ])("accepts inclusive ranges up to 120 months (%j)", (range) => {
        expect(parsePlanMonthRange(range)).toEqual(range);
    });

    it.each([
        { from: "", to: "2026-11" },
        { from: "2026-11", to: "" },
        { from: "2026-1", to: "2026-11" },
        { from: "2026-00", to: "2026-11" },
        { from: "2026-11", to: "2026-13" },
        { from: "2026-11-01", to: "2026-12" },
        { from: "2026-11", to: "bad" },
        { from: "2026-11", to: "2026-12\n" },
        { from: "2027-01", to: "2026-12" },
        { from: "2020-01", to: "2030-01" },
    ])("rejects incomplete malformed reversed and oversized ranges (%j)", (range) => {
        expect(() => parsePlanMonthRange(range)).toThrow();
    });
});
