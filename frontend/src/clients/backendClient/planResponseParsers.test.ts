import { describe, expect, it } from "vitest";

import { parseApiPlanGrid, parseApiPlanLine, parseApiPlanSection } from "./responseParsers";

describe("plan response parsing", () => {
    const row = { id: "row-1", name: "Mortgage", position: 1, fixed_amount: null };
    const parsedRow = { id: "row-1", name: "Mortgage", position: 1, fixedAmountCents: null };
    const section = { id: "section-1", name: "Home", position: 1, is_income: false };

    it("preserves nested rows and empty sections", () => {
        expect(parseApiPlanLine(row)).toEqual(parsedRow);
        expect(parseApiPlanSection({ ...section, lines: [row] })).toEqual({
            id: section.id,
            name: "Home",
            position: 1,
            isIncome: false,
            lines: [parsedRow],
        });
        expect(parseApiPlanSection({ ...section, lines: [] }).lines).toEqual([]);
    });

    it("rejects missing or malformed rows instead of hiding them", () => {
        expect(() => parseApiPlanSection(section)).toThrow();
        expect(() => parseApiPlanSection({ ...section, lines: [{ ...row, position: "1" }] })).toThrow();
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
        expect(parseApiPlanSection({ ...section, lines: [apiRow] }).lines).toEqual([expected]);
    });

    it.each([undefined, "", "bad", "NaN", "Infinity", "-0.01", "1.001", "10000000000.00", "1e2", "1,00", 700, true])(
        "rejects missing or malformed fixed amount %s",
        (amount) => {
            const apiRow = { ...row, fixed_amount: amount };

            expect(() => parseApiPlanLine(apiRow)).toThrow();
            expect(() => parseApiPlanSection({ ...section, lines: [apiRow] })).toThrow();
        },
    );
});

describe("plan grid response parsing", () => {
    const months = ["2026-12", "2027-01"];
    const amounts = { "2026-12": "0.10", "2027-01": "0.10" };
    const row = { id: "row-1", name: "Mortgage", position: 1, fixed_amount: "0.10", amounts };
    const section = { id: "section-1", name: "Home", position: 1, is_income: false, lines: [row], totals: amounts };
    const grid = { months, sections: [section] };

    it("preserves grid structure and parses money into cents", () => {
        const unset = { id: "row-2", name: "Unset", position: 2, fixed_amount: null };
        const zero = { id: "row-3", name: "Zero", position: 3, fixed_amount: "0.00" };
        const empty = { id: "section-2", name: "Income", position: 2, is_income: true, lines: [] };
        const zeros = { "2026-12": "0.00", "2027-01": "0.00" };
        const nulls = { "2026-12": null, "2027-01": null };

        expect(parseApiPlanGrid({ months, sections: [] })).toEqual({ months, sections: [] });
        expect(
            parseApiPlanGrid({
                months,
                sections: [
                    { ...section, lines: [row, { ...unset, amounts: nulls }, { ...zero, amounts: zeros }] },
                    { ...empty, totals: zeros },
                ],
            }),
        ).toEqual({
            months,
            sections: [
                {
                    id: section.id,
                    name: "Home",
                    position: 1,
                    isIncome: false,
                    lines: [
                        {
                            id: row.id,
                            name: "Mortgage",
                            position: 1,
                            fixedAmountCents: 10,
                            amountsCents: { "2026-12": 10, "2027-01": 10 },
                        },
                        { id: unset.id, name: "Unset", position: 2, fixedAmountCents: null, amountsCents: nulls },
                        {
                            id: zero.id,
                            name: "Zero",
                            position: 3,
                            fixedAmountCents: 0,
                            amountsCents: { "2026-12": 0, "2027-01": 0 },
                        },
                    ],
                    totalsCents: { "2026-12": 10, "2027-01": 10 },
                },
                {
                    id: empty.id,
                    name: "Income",
                    position: 2,
                    isIncome: true,
                    lines: [],
                    totalsCents: { "2026-12": 0, "2027-01": 0 },
                },
            ],
        });
    });

    it("accepts totals larger than a row maximum", () => {
        const maximum = {
            ...row,
            fixed_amount: "9999999999.99",
            amounts: { "2026-12": "9999999999.99", "2027-01": "9999999999.99" },
        };
        expect(
            parseApiPlanGrid({
                months,
                sections: [
                    {
                        ...section,
                        lines: [maximum, { ...maximum, id: "row-2", position: 2 }],
                        totals: { "2026-12": "19999999999.98", "2027-01": "19999999999.98" },
                    },
                ],
            }),
        ).toMatchObject({
            sections: [
                {
                    lines: [
                        {
                            fixedAmountCents: 999999999999,
                            amountsCents: { "2026-12": 999999999999, "2027-01": 999999999999 },
                        },
                        { fixedAmountCents: 999999999999 },
                    ],
                    totalsCents: { "2026-12": 1999999999998, "2027-01": 1999999999998 },
                },
            ],
        });
    });

    it.each([
        undefined,
        "",
        "bad",
        "NaN",
        "Infinity",
        "-0.01",
        "1.001",
        "1e2",
        "1,00",
        "0.10\n",
        10,
        true,
        "90071992547409.92",
    ])("rejects malformed grid money %s", (amount) => {
        expect(() =>
            parseApiPlanGrid({ ...grid, sections: [{ ...section, lines: [{ ...row, fixed_amount: amount }] }] }),
        ).toThrow();
        expect(() =>
            parseApiPlanGrid({
                ...grid,
                sections: [{ ...section, lines: [{ ...row, amounts: { ...amounts, "2026-12": amount } }] }],
            }),
        ).toThrow();
        expect(() =>
            parseApiPlanGrid({ ...grid, sections: [{ ...section, totals: { ...amounts, "2026-12": amount } }] }),
        ).toThrow();
    });

    it.each([undefined, null, {}, { "2026-12": "0.10" }, { ...amounts, "2027-02": "0.10" }])(
        "rejects inconsistent month coverage %j",
        (values) => {
            expect(() =>
                parseApiPlanGrid({ ...grid, sections: [{ ...section, lines: [{ ...row, amounts: values }] }] }),
            ).toThrow();
            expect(() => parseApiPlanGrid({ ...grid, sections: [{ ...section, totals: values }] })).toThrow();
        },
    );

    it.each([[], ["bad"], ["2026-13"], ["2026-12", "2026-12"], ["2027-01", "2026-12"], ["2026-12", "2027-02"]])(
        "rejects invalid month sequence case %#",
        (...invalidMonths) => {
            expect(() => parseApiPlanGrid({ months: invalidMonths, sections: [] })).toThrow();
        },
    );

    it("rejects null totals and missing grid structure", () => {
        expect(() =>
            parseApiPlanGrid({ ...grid, sections: [{ ...section, totals: { ...amounts, "2026-12": null } }] }),
        ).toThrow();
        expect(() => parseApiPlanGrid({ sections: [] })).toThrow();
        expect(() => parseApiPlanGrid({ months })).toThrow();
        expect(() => parseApiPlanGrid({ ...grid, sections: [{ ...section, lines: undefined }] })).toThrow();
    });
});
