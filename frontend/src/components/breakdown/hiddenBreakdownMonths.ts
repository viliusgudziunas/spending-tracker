export const HIDDEN_BREAKDOWN_MONTHS_STORAGE_KEY = "app:breakdown:hidden-months";

export function parseHiddenBreakdownMonths(raw: string | null): string[] {
    if (raw === null) {
        return [];
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return [];
    }

    if (!isStringArray(parsed)) {
        return [];
    }

    return [...new Set(parsed)];
}

export function dropUnavailableHiddenMonths(hiddenMonths: string[], availableMonths: string[]): string[] {
    const available = new Set(availableMonths);
    const next = hiddenMonths.filter((month) => available.has(month));
    if (next.length === hiddenMonths.length) {
        return hiddenMonths;
    }
    return next;
}

export function readHiddenBreakdownMonths(storage: Pick<Storage, "getItem">): string[] {
    return parseHiddenBreakdownMonths(storage.getItem(HIDDEN_BREAKDOWN_MONTHS_STORAGE_KEY));
}

export function writeHiddenBreakdownMonths(storage: Pick<Storage, "setItem">, hiddenMonths: string[]): void {
    storage.setItem(HIDDEN_BREAKDOWN_MONTHS_STORAGE_KEY, JSON.stringify(hiddenMonths));
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === "string");
}
