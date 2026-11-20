import { describe, expect, it } from "vitest";

import { parseApiPlanGrid, parseApiPlanLine, parseApiPlanSection } from "./responseParsers";

describe("plan override response parsing", () => {
    const months = ["2026-12", "2027-01", "2027-02"];
    const amounts = {
        "2026-12": { amount: "0.00", is_override: true },
        "2027-01": { amount: "700.00", is_override: false },
        "2027-02": { amount: "700.00", is_override: true },
    };
    const manualAmounts = {
        "2026-12": { amount: null, is_override: false },
        "2027-01": { amount: "0.20", is_override: true },
        "2027-02": { amount: null, is_override: false },
    };

    function gridWithAmounts(values: unknown): object {
        return {
            months,
            sections: [
                {
                    id: "section-1",
                    name: "Home",
                    position: 1,
                    is_income: false,
                    lines: [
                        { id: "row-1", name: "Groceries", position: 1, fixed_amount: "700.00", amounts: values },
                        { id: "row-2", name: "Manual", position: 2, fixed_amount: null, amounts: manualAmounts },
                    ],
                    totals: { "2026-12": "0.00", "2027-01": "700.20", "2027-02": "700.00" },
                },
            ],
        };
    }

    it("preserves override metadata, exact cents, zero, unset and an override equal to its default", () => {
        const grid = gridWithAmounts(amounts);
        expect(() => parseApiPlanGrid(grid)).not.toThrow();
        expect(parseApiPlanGrid(grid)).toEqual({
            months,
            sections: [
                {
                    id: "section-1",
                    name: "Home",
                    position: 1,
                    isIncome: false,
                    lines: [
                        {
                            id: "row-1",
                            name: "Groceries",
                            position: 1,
                            fixedAmountCents: 70000,
                            amounts: {
                                "2026-12": { amountCents: 0, isOverride: true },
                                "2027-01": { amountCents: 70000, isOverride: false },
                                "2027-02": { amountCents: 70000, isOverride: true },
                            },
                        },
                        {
                            id: "row-2",
                            name: "Manual",
                            position: 2,
                            fixedAmountCents: null,
                            amounts: {
                                "2026-12": { amountCents: null, isOverride: false },
                                "2027-01": { amountCents: 20, isOverride: true },
                                "2027-02": { amountCents: null, isOverride: false },
                            },
                        },
                    ],
                    totalsCents: { "2026-12": 0, "2027-01": 70020, "2027-02": 70000 },
                },
            ],
        });
    });

    it.each([undefined, null, "true", 0, 1])("rejects missing or non-boolean override flag %s", (flag) => {
        expect(() => parseApiPlanGrid(gridWithAmounts(amounts))).not.toThrow();
        const invalid = { ...amounts, "2026-12": { amount: "0.00", is_override: flag } };
        expect(() => parseApiPlanGrid(gridWithAmounts(invalid))).toThrow();
    });

    it("rejects a null amount marked as an override", () => {
        expect(() => parseApiPlanGrid(gridWithAmounts(amounts))).not.toThrow();
        const invalid = { ...amounts, "2026-12": { amount: null, is_override: true } };
        expect(() => parseApiPlanGrid(gridWithAmounts(invalid))).toThrow();
    });

    it.each([undefined, {}, { "2026-12": amounts["2026-12"] }, { ...amounts, "2027-03": amounts["2026-12"] }])(
        "rejects incomplete or extra override month coverage %j",
        (invalid) => {
            expect(() => parseApiPlanGrid(gridWithAmounts(amounts))).not.toThrow();
            expect(() => parseApiPlanGrid(gridWithAmounts(invalid))).toThrow();
        },
    );

    it.each([undefined, 0, "1.001", "NaN", "-0.01", "10000000000.00"])(
        "rejects malformed override amount %s",
        (amount) => {
            expect(() => parseApiPlanGrid(gridWithAmounts(amounts))).not.toThrow();
            const invalid = { ...amounts, "2026-12": { amount, is_override: true } };
            expect(() => parseApiPlanGrid(gridWithAmounts(invalid))).toThrow();
        },
    );
});

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
    const cells = {
        "2026-12": { amount: "0.10", is_override: false },
        "2027-01": { amount: "0.10", is_override: false },
    };
    const row = { id: "row-1", name: "Mortgage", position: 1, fixed_amount: "0.10", amounts: cells };
    const section = { id: "section-1", name: "Home", position: 1, is_income: false, lines: [row], totals: amounts };
    const grid = { months, sections: [section] };

    it("preserves grid structure and parses money into cents", () => {
        const unset = { id: "row-2", name: "Unset", position: 2, fixed_amount: null };
        const zero = { id: "row-3", name: "Zero", position: 3, fixed_amount: "0.00" };
        const empty = { id: "section-2", name: "Income", position: 2, is_income: true, lines: [] };
        const zeros = { "2026-12": "0.00", "2027-01": "0.00" };
        const nulls = {
            "2026-12": { amount: null, is_override: false },
            "2027-01": { amount: null, is_override: false },
        };
        const zeroCells = {
            "2026-12": { amount: "0.00", is_override: false },
            "2027-01": { amount: "0.00", is_override: false },
        };

        expect(parseApiPlanGrid({ months, sections: [] })).toEqual({ months, sections: [] });
        expect(
            parseApiPlanGrid({
                months,
                sections: [
                    { ...section, lines: [row, { ...unset, amounts: nulls }, { ...zero, amounts: zeroCells }] },
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
                            amounts: {
                                "2026-12": { amountCents: 10, isOverride: false },
                                "2027-01": { amountCents: 10, isOverride: false },
                            },
                        },
                        {
                            id: unset.id,
                            name: "Unset",
                            position: 2,
                            fixedAmountCents: null,
                            amounts: {
                                "2026-12": { amountCents: null, isOverride: false },
                                "2027-01": { amountCents: null, isOverride: false },
                            },
                        },
                        {
                            id: zero.id,
                            name: "Zero",
                            position: 3,
                            fixedAmountCents: 0,
                            amounts: {
                                "2026-12": { amountCents: 0, isOverride: false },
                                "2027-01": { amountCents: 0, isOverride: false },
                            },
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
            amounts: {
                "2026-12": { amount: "9999999999.99", is_override: false },
                "2027-01": { amount: "9999999999.99", is_override: false },
            },
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
                            amounts: {
                                "2026-12": { amountCents: 999999999999, isOverride: false },
                                "2027-01": { amountCents: 999999999999, isOverride: false },
                            },
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
                sections: [
                    {
                        ...section,
                        lines: [{ ...row, amounts: { ...cells, "2026-12": { amount, is_override: false } } }],
                    },
                ],
            }),
        ).toThrow();
        expect(() =>
            parseApiPlanGrid({ ...grid, sections: [{ ...section, totals: { ...amounts, "2026-12": amount } }] }),
        ).toThrow();
    });

    it.each([undefined, null, {}, { "2026-12": "0.10" }, { ...amounts, "2027-02": "0.10" }])(
        "rejects inconsistent month coverage %j",
        (values) => {
            const invalidCells =
                values == null
                    ? values
                    : Object.fromEntries(
                          Object.entries(values).map(([month, amount]) => [month, { amount, is_override: false }]),
                      );
            expect(() =>
                parseApiPlanGrid({ ...grid, sections: [{ ...section, lines: [{ ...row, amounts: invalidCells }] }] }),
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
