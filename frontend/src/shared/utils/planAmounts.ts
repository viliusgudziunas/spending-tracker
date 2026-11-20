export function parsePlanAmountInput(input: string): number | null {
    const trimmed = input.replace(/[\u00a0\u202f]/g, " ").trim();
    if (trimmed === "") {
        return null;
    }

    // Remove at most one currency marker; a second marker must fail validation.
    const amount = trimmed.replace(/^(?:€|EUR) *| *(?:€|EUR)$/i, "");
    const validFormat = [
        /^[0-9]+(?:[.,][0-9]{1,2})?$/,
        /^[0-9]{1,3}(?: [0-9]{3})+(?:[.,][0-9]{1,2})?$/,
        /^[0-9]{1,3}(?:\.[0-9]{3})+,[0-9]{1,2}$/,
        /^[0-9]{1,3}(?:,[0-9]{3})+\.[0-9]{1,2}$/,
    ].some((format) => format.test(amount));

    const decimalIndex = amount.search(/[.,][0-9]{1,2}$/);
    const wholePart = decimalIndex === -1 ? amount : amount.slice(0, decimalIndex);
    const fraction = decimalIndex === -1 ? "" : amount.slice(decimalIndex + 1);
    const whole = wholePart.replace(/[ .,]/g, "");
    if (!validFormat || whole.length > 10) {
        throw new Error(
            "Use an amount like 7157.02, 7 157,02 € or €7,157.02 (up to 10 whole digits and 2 decimals). Use spaces for whole thousands, e.g. 7 157.",
        );
    }

    return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function serializePlanAmount(amountCents: number | null): string | null {
    if (amountCents === null) {
        return null;
    }
    if (!Number.isSafeInteger(amountCents) || amountCents < 0 || amountCents > 999999999999) {
        throw new Error("Plan amount must be a whole number of cents between 0 and 999999999999.");
    }

    const whole = Math.floor(amountCents / 100);
    const fraction = String(amountCents % 100).padStart(2, "0");
    return `${whole}.${fraction}`;
}
