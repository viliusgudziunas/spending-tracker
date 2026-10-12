import { type BreakdownCategory } from "@/clients/backendClient/responseParsers";

export type BreakdownCategoryVisibility = "visible" | "partial" | "hidden";

export function breakdownFilterKeys(categories: readonly BreakdownCategory[]): string[] {
    return categories.flatMap((category) => category.filters.map((filter) => filter.key));
}

export function hiddenBreakdownRowCount(
    categories: readonly BreakdownCategory[],
    hiddenFilterKeys: readonly string[],
): number {
    const available = new Set(breakdownFilterKeys(categories));
    return hiddenFilterKeys.filter((key) => available.has(key)).length;
}

export function breakdownCategoryVisibility(
    filterKeys: readonly string[],
    hiddenFilterKeys: readonly string[],
): BreakdownCategoryVisibility {
    const hidden = new Set(hiddenFilterKeys);
    let hiddenCount = 0;
    for (const key of filterKeys) {
        if (hidden.has(key)) {
            hiddenCount += 1;
        }
    }
    if (hiddenCount === 0) {
        return "visible";
    }
    if (hiddenCount === filterKeys.length) {
        return "hidden";
    }
    return "partial";
}

export function toggleHiddenBreakdownFilter(hiddenFilterKeys: readonly string[], filterKey: string): string[] {
    if (hiddenFilterKeys.includes(filterKey)) {
        return hiddenFilterKeys.filter((key) => key !== filterKey);
    }
    return [...hiddenFilterKeys, filterKey];
}

export function toggleHiddenBreakdownCategory(
    hiddenFilterKeys: readonly string[],
    filterKeys: readonly string[],
): string[] {
    if (breakdownCategoryVisibility(filterKeys, hiddenFilterKeys) === "visible") {
        return [...hiddenFilterKeys, ...filterKeys];
    }
    const categoryKeys = new Set(filterKeys);
    return hiddenFilterKeys.filter((key) => !categoryKeys.has(key));
}

export function initialExpandedBreakdownCategories(
    categories: readonly BreakdownCategory[],
    hiddenFilterKeys: readonly string[],
): string[] {
    const expanded = new Set<string>();
    const firstWithFilters = categories.find((category) => category.filters.length > 0);
    if (firstWithFilters !== undefined) {
        expanded.add(firstWithFilters.id);
    }
    for (const category of categories) {
        const filterKeys = category.filters.map((filter) => filter.key);
        if (filterKeys.length > 0 && breakdownCategoryVisibility(filterKeys, hiddenFilterKeys) === "partial") {
            expanded.add(category.id);
        }
    }
    return [...expanded];
}
