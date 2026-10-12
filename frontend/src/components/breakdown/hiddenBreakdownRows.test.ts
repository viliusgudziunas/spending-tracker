import { describe, expect, it } from "vitest";

import { dropUnavailableHiddenRows, parseHiddenBreakdownRows } from "./hiddenBreakdownRows";

describe("parseHiddenBreakdownRows", () => {
    it("returns an empty list for malformed storage", () => {
        expect(parseHiddenBreakdownRows(null)).toEqual([]);
        expect(parseHiddenBreakdownRows("{")).toEqual([]);
        expect(parseHiddenBreakdownRows(JSON.stringify({ hidden: true }))).toEqual([]);
        expect(parseHiddenBreakdownRows(JSON.stringify(["rule:rent", 1]))).toEqual([]);
        expect(parseHiddenBreakdownRows(JSON.stringify(["rule:rent", "rule:rent"]))).toEqual(["rule:rent"]);
    });
});

describe("dropUnavailableHiddenRows", () => {
    it("keeps only keys still present", () => {
        const hiddenFilterKeys = ["rule:rent", "legacy:old"];
        const availableKeys = ["rule:rent", "manual:groceries:lidl"];

        expect(dropUnavailableHiddenRows(hiddenFilterKeys, availableKeys)).toEqual(["rule:rent"]);

        const stillPresent = ["rule:rent"];
        expect(dropUnavailableHiddenRows(stillPresent, availableKeys)).toBe(stillPresent);
    });
});
