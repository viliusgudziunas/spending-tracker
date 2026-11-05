import { describe, expect, it } from "vitest";

import { parsePlanAmountInput, serializePlanAmount } from "./planAmounts";

describe("plan amount input", () => {
    it.each([
        ["", null],
        ["   ", null],
        ["0", 0],
        ["0.00", 0],
        ["700", 70000],
        ["1034.89", 103489],
        ["1034,89", 103489],
        [" 700,5 ", 70050],
        ["0.01", 1],
        ["9999999999.99", 999999999999],
    ])("parses %s into %s cents", (input, cents) => {
        expect(parsePlanAmountInput(input)).toBe(cents);
    });

    it.each([
        "-0.01",
        "1.001",
        "1.230",
        "10000000000.00",
        "bad",
        "NaN",
        "Infinity",
        "1e2",
        "1,034.89",
        "1.034,89",
        "1 034,89",
        "€700",
    ])("rejects invalid input %s", (input) => {
        expect(() => parsePlanAmountInput(input)).toThrow();
    });
});

describe("plan amount serialization", () => {
    it.each([
        [null, null],
        [0, "0.00"],
        [1, "0.01"],
        [10, "0.10"],
        [103489, "1034.89"],
        [70000, "700.00"],
        [999999999999, "9999999999.99"],
    ])("serializes %s cents as %s", (cents, amount) => {
        expect(serializePlanAmount(cents)).toBe(amount);
    });
});
