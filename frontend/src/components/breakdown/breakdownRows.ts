import { type Breakdown } from "@/clients/backendClient/responseParsers";

export type BreakdownRowKind = "category" | "filter" | "unidentified";

export interface BreakdownGridRow {
    id: string;
    label: string;
    kind: BreakdownRowKind;
    amounts: Record<string, string>;
}

export function visibleBreakdownRows(breakdown: Breakdown, hiddenFilterKeys: readonly string[]): BreakdownGridRow[] {
    const hidden = new Set(hiddenFilterKeys);
    const rows: BreakdownGridRow[] = [];
    for (const category of breakdown.categories) {
        rows.push({
            id: `category:${category.id}`,
            label: category.name,
            kind: "category",
            amounts: category.amounts,
        });
        for (const filter of category.filters) {
            if (hidden.has(filter.key)) {
                continue;
            }
            rows.push({
                id: filter.key,
                label: filter.name,
                kind: "filter",
                amounts: filter.amounts,
            });
        }
    }
    rows.push({
        id: "unidentified",
        label: "Unidentified",
        kind: "unidentified",
        amounts: breakdown.unidentified.amounts,
    });
    return rows;
}
