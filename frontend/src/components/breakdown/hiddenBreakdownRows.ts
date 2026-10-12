export const HIDDEN_BREAKDOWN_ROWS_STORAGE_KEY = "app:breakdown:hidden-filter-keys";

export function parseHiddenBreakdownRows(raw: string | null): string[] {
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

export function dropUnavailableHiddenRows(hiddenFilterKeys: string[], availableKeys: readonly string[]): string[] {
    const available = new Set(availableKeys);
    const next = hiddenFilterKeys.filter((key) => available.has(key));
    if (next.length === hiddenFilterKeys.length) {
        return hiddenFilterKeys;
    }
    return next;
}

export function readHiddenBreakdownRows(storage: Pick<Storage, "getItem">): string[] {
    return parseHiddenBreakdownRows(storage.getItem(HIDDEN_BREAKDOWN_ROWS_STORAGE_KEY));
}

export function writeHiddenBreakdownRows(storage: Pick<Storage, "setItem">, hiddenFilterKeys: string[]): void {
    storage.setItem(HIDDEN_BREAKDOWN_ROWS_STORAGE_KEY, JSON.stringify(hiddenFilterKeys));
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === "string");
}
