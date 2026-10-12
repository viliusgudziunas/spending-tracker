import { describe, expect, it } from "vitest";

import { type BreakdownCategory } from "@/clients/backendClient/responseParsers";

import {
    breakdownCategoryVisibility,
    hiddenBreakdownRowCount,
    initialExpandedBreakdownCategories,
    toggleHiddenBreakdownCategory,
    toggleHiddenBreakdownFilter,
} from "./breakdownRowVisibility";

function category(id: string, filterKeys: string[]): BreakdownCategory {
    return {
        id,
        name: id,
        position: 1,
        amounts: {},
        filters: filterKeys.map((key, index) => ({
            key,
            name: key,
            position: index,
            amounts: {},
        })),
    };
}

describe("breakdown row visibility", () => {
    it("counts current filters and marks a partly hidden category partial", () => {
        const categories = [category("investments", ["rule:rent", "legacy:old"])];

        expect(hiddenBreakdownRowCount(categories, ["rule:rent", "missing"])).toBe(1);
        expect(breakdownCategoryVisibility(["rule:rent", "legacy:old"], [])).toBe("visible");
        expect(breakdownCategoryVisibility(["rule:rent", "legacy:old"], ["rule:rent"])).toBe("partial");
        expect(breakdownCategoryVisibility(["rule:rent", "legacy:old"], ["rule:rent", "legacy:old"])).toBe("hidden");
    });

    it("toggles one filter or every filter in a category", () => {
        expect(toggleHiddenBreakdownFilter([], "rule:rent")).toEqual(["rule:rent"]);
        expect(toggleHiddenBreakdownFilter(["rule:rent"], "rule:rent")).toEqual([]);
        expect(toggleHiddenBreakdownCategory([], ["rule:rent", "legacy:old"])).toEqual(["rule:rent", "legacy:old"]);
        expect(toggleHiddenBreakdownCategory(["rule:rent"], ["rule:rent", "legacy:old"])).toEqual([]);
        expect(
            toggleHiddenBreakdownCategory(["rule:rent", "legacy:old", "manual:keep"], ["rule:rent", "legacy:old"]),
        ).toEqual(["manual:keep"]);
    });

    it("starts with the first category open and any partly hidden category open", () => {
        const categories = [
            category("investments", ["rule:rent"]),
            category("savings", ["manual:cash", "rule:isa"]),
            category("travel", ["rule:flight", "rule:hotel"]),
        ];

        expect(initialExpandedBreakdownCategories(categories, ["manual:cash", "rule:flight", "rule:hotel"])).toEqual([
            "investments",
            "savings",
        ]);
    });
});
