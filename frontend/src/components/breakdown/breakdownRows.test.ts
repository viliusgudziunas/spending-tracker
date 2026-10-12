import { describe, expect, it } from "vitest";

import { type Breakdown } from "@/clients/backendClient/responseParsers";

import { visibleBreakdownRows } from "./breakdownRows";

function spendingBreakdown(): Breakdown {
    return {
        months: ["2024-01"],
        categories: [
            {
                id: "category-1",
                name: "Investments",
                position: 1,
                amounts: { "2024-01": "30" },
                filters: [
                    {
                        key: "rule:rent",
                        name: "Rent",
                        position: 1,
                        amounts: { "2024-01": "10" },
                    },
                    {
                        key: "legacy:category-1:old-fund",
                        name: "Old fund",
                        position: 2,
                        amounts: { "2024-01": "20" },
                    },
                    {
                        key: "manual:category-1:one-off",
                        name: "One-off",
                        position: 3,
                        amounts: { "2024-01": "0" },
                    },
                ],
            },
        ],
        unidentified: {
            amounts: { "2024-01": "5" },
        },
    };
}

describe("visibleBreakdownRows", () => {
    it("omits hidden filter keys and keeps category totals", () => {
        const rows = visibleBreakdownRows(spendingBreakdown(), ["rule:rent"]);

        expect(rows.map((row) => row.id)).toEqual([
            "category:category-1",
            "legacy:category-1:old-fund",
            "manual:category-1:one-off",
            "unidentified",
        ]);
        expect(rows[0]?.amounts).toEqual({ "2024-01": "30" });
        expect(rows.find((row) => row.id === "legacy:category-1:old-fund")?.amounts).toEqual({ "2024-01": "20" });
    });

    it("keeps a category whose filters are all hidden", () => {
        const rows = visibleBreakdownRows(spendingBreakdown(), [
            "rule:rent",
            "legacy:category-1:old-fund",
            "manual:category-1:one-off",
        ]);

        expect(rows.map((row) => row.id)).toEqual(["category:category-1", "unidentified"]);
        expect(rows[0]?.amounts).toEqual({ "2024-01": "30" });
        expect(rows[1]?.amounts).toEqual({ "2024-01": "5" });
    });
});
