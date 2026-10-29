import { describe, expect, it } from "vitest";

import { parseApiPlanLine, parseApiPlanSections } from "./responseParsers";

describe("plan response parsing", () => {
    const row = { id: "row-1", name: "Mortgage", position: 1 };
    const section = { id: "section-1", name: "Home", position: 1, is_income: false };

    it("preserves nested rows and empty sections", () => {
        expect(parseApiPlanLine(row)).toEqual(row);
        expect(parseApiPlanSections([{ ...section, lines: [row] }])).toEqual([
            { id: section.id, name: "Home", position: 1, isIncome: false, lines: [row] },
        ]);
        expect(parseApiPlanSections([{ ...section, lines: [] }])[0].lines).toEqual([]);
    });

    it("rejects missing or malformed rows instead of hiding them", () => {
        expect(() => parseApiPlanSections([section])).toThrow();
        expect(() => parseApiPlanSections([{ ...section, lines: [{ ...row, position: "1" }] }])).toThrow();
    });
});
