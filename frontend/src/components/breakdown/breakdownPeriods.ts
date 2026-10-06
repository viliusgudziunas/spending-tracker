export interface BreakdownPeriodYear {
    year: string;
    months: string[];
}

export type YearVisibility = "visible" | "partial" | "hidden";

export function breakdownPeriodYears(months: readonly string[]): BreakdownPeriodYear[] {
    const years: BreakdownPeriodYear[] = [];
    for (const month of months) {
        const year = month.slice(0, 4);
        const current = years.at(-1);
        if (current !== undefined && current.year === year) {
            current.months.push(month);
            continue;
        }
        years.push({ year, months: [month] });
    }
    return years.reverse();
}

export function yearVisibility(months: readonly string[], hiddenMonths: readonly string[]): YearVisibility {
    const hidden = new Set(hiddenMonths);
    let hiddenCount = 0;
    for (const month of months) {
        if (hidden.has(month)) {
            hiddenCount += 1;
        }
    }
    if (hiddenCount === 0) {
        return "visible";
    }
    if (hiddenCount === months.length) {
        return "hidden";
    }
    return "partial";
}

export function visibleBreakdownMonths(months: readonly string[], hiddenMonths: readonly string[]): string[] {
    const hidden = new Set(hiddenMonths);
    return months.filter((month) => !hidden.has(month));
}

export function hiddenPeriodCount(months: readonly string[], hiddenMonths: readonly string[]): number {
    const available = new Set(months);
    return hiddenMonths.filter((month) => available.has(month)).length;
}

export function toggleHiddenMonth(hiddenMonths: readonly string[], month: string): string[] {
    if (hiddenMonths.includes(month)) {
        return hiddenMonths.filter((hiddenMonth) => hiddenMonth !== month);
    }
    return [...hiddenMonths, month];
}

export function toggleHiddenYear(hiddenMonths: readonly string[], yearMonths: readonly string[]): string[] {
    if (yearVisibility(yearMonths, hiddenMonths) === "visible") {
        return [...hiddenMonths, ...yearMonths];
    }
    const yearMonthSet = new Set(yearMonths);
    return hiddenMonths.filter((month) => !yearMonthSet.has(month));
}

export function initialExpandedYears(years: readonly BreakdownPeriodYear[], hiddenMonths: readonly string[]): string[] {
    const expanded = new Set<string>();
    const latestYear = years[0];
    if (latestYear !== undefined) {
        expanded.add(latestYear.year);
    }
    for (const year of years) {
        if (yearVisibility(year.months, hiddenMonths) === "partial") {
            expanded.add(year.year);
        }
    }
    return [...expanded];
}

export function formatBreakdownMonthName(month: string): string {
    const [year, monthNumber] = month.split("-");
    const date = new Date(Date.UTC(Number(year), Number(monthNumber) - 1, 1));
    return date.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
}
