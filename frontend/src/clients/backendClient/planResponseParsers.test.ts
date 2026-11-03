import { describe, expect, it } from "vitest";

import { parseApiPlanLine, parseApiPlanSections } from "./responseParsers";

describe("plan response parsing", () => {
    const row = { id: "row-1", name: "Mortgage", position: 1, fixed_amount: null };
    const parsedRow = { id: "row-1", name: "Mortgage", position: 1, fixedAmountCents: null };
    const section = { id: "section-1", name: "Home", position: 1, is_income: false };

    it("preserves nested rows and empty sections", () => {
        expect(parseApiPlanLine(row)).toEqual(parsedRow);
        expect(parseApiPlanSections([{ ...section, lines: [row] }])).toEqual([
            { id: section.id, name: "Home", position: 1, isIncome: false, lines: [parsedRow] },
        ]);
        expect(parseApiPlanSections([{ ...section, lines: [] }])[0].lines).toEqual([]);
    });

    it("rejects missing or malformed rows instead of hiding them", () => {
        expect(() => parseApiPlanSections([section])).toThrow();
        expect(() => parseApiPlanSections([{ ...section, lines: [{ ...row, position: "1" }] }])).toThrow();
    });

    it.each([
        [null, null],
        ["0.00", 0],
        ["0.10", 10],
        ["1034.89", 103489],
        ["9999999999.99", 999999999999],
    ])("parses fixed amount %s in standalone and nested rows", (amount, cents) => {
        const apiRow = { ...row, fixed_amount: amount };
        const expected = { ...parsedRow, fixedAmountCents: cents };

        expect(parseApiPlanLine(apiRow)).toEqual(expected);
        expect(parseApiPlanSections([{ ...section, lines: [apiRow] }])[0].lines).toEqual([expected]);
    });

    it.each([undefined, "", "bad", "NaN", "Infinity", "-0.01", "1.001", "10000000000.00", "1e2", "1,00", 700, true])(
        "rejects missing or malformed fixed amount %s",
        (amount) => {
            const apiRow = { ...row, fixed_amount: amount };

            expect(() => parseApiPlanLine(apiRow)).toThrow();
            expect(() => parseApiPlanSections([{ ...section, lines: [apiRow] }])).toThrow();
        },
    );
});
