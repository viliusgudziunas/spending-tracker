export function parsePlanAmountInput(input: string): number | null {
    const amount = input.trim();
    if (amount === "") {
        return null;
    }
    if (!/^[0-9]{1,10}(?:[.,][0-9]{1,2})?$/.test(amount)) {
        throw new Error("Enter a non-negative amount with at most 10 whole digits and 2 decimal places.");
    }

    const [whole, fraction = ""] = amount.replace(",", ".").split(".");
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

export function sumPlanAmounts(amountsCents: readonly (number | null)[]): number {
    return amountsCents.reduce<number>((total, amount) => total + (amount ?? 0), 0);
}
