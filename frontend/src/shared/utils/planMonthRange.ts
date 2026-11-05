import { z } from "zod";

const MonthKeySchema = z.string().regex(/^[0-9]{4}-(0[1-9]|1[0-2])(?![\s\S])/, "Use YYYY-MM format.");
const MAX_PLAN_MONTHS = 120;

function monthIndex(month: string): number {
    return Number(month.slice(0, 4)) * 12 + Number(month.slice(5)) - 1;
}

export const PlanMonthsSchema = z
    .array(MonthKeySchema)
    .min(1)
    .max(MAX_PLAN_MONTHS)
    .refine(
        (months) =>
            months.every((month, index) => index === 0 || monthIndex(month) === monthIndex(months[index - 1]) + 1),
        "Plan months must be consecutive and ordered.",
    );

const PlanMonthRangeSchema = z
    .object({ from: MonthKeySchema, to: MonthKeySchema })
    .refine(
        (range) => monthIndex(range.to) >= monthIndex(range.from),
        "The first month must not be after the last month.",
    )
    .refine(
        (range) => monthIndex(range.to) - monthIndex(range.from) + 1 <= MAX_PLAN_MONTHS,
        "Choose at most 120 months.",
    );

export type PlanMonthRange = z.infer<typeof PlanMonthRangeSchema>;

function formatPlanMonth(date: Date): string {
    return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getInitialPlanMonthRange(today: Date): PlanMonthRange {
    const lastMonth = new Date(today);
    lastMonth.setDate(1);
    lastMonth.setMonth(lastMonth.getMonth() + 5);
    return parsePlanMonthRange({ from: formatPlanMonth(today), to: formatPlanMonth(lastMonth) });
}

export function parsePlanMonthRange(range: PlanMonthRange): PlanMonthRange {
    return PlanMonthRangeSchema.parse(range);
}
