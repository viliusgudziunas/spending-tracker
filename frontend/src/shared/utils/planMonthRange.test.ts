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

describe("stored plan month range", () => {
    it.each([
        { from: "2026-12", to: "2027-01" },
        { from: "2025-08", to: "2025-08" },
        { from: "2020-01", to: "2029-12" },
    ])("restores a valid saved range instead of the default (%j)", (range) => {
        expect(getInitialPlanMonthRange(new Date(2026, 10, 20), JSON.stringify(range))).toEqual(range);
    });

    it("keeps the saved range when the current month changes", () => {
        const range = { from: "2026-12", to: "2027-01" };

        expect(getInitialPlanMonthRange(new Date(2027, 5, 1), JSON.stringify(range))).toEqual(range);
    });

    it.each([
        null,
        "",
        "{",
        "null",
        "[]",
        "42",
        JSON.stringify("2026-12"),
        JSON.stringify({ from: "2026-12" }),
        JSON.stringify({ from: 202612, to: "2027-01" }),
        JSON.stringify({ from: "2026-1", to: "2027-01" }),
        JSON.stringify({ from: "2026-12", to: "2027-13" }),
        JSON.stringify({ from: "2026-12", to: "2027-01\n" }),
        JSON.stringify({ from: "2027-01", to: "2026-12" }),
        JSON.stringify({ from: "2020-01", to: "2030-01" }),
    ])("falls back to the current six-month range for missing or invalid storage (%s)", (storedRange) => {
        expect(getInitialPlanMonthRange(new Date(2026, 10, 30, 23, 30), storedRange)).toEqual({
            from: "2026-11",
            to: "2027-04",
        });
    });
});
