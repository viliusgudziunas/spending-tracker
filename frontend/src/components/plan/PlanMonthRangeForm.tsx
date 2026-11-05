import { type FormEvent, useState } from "react";
import { ZodError } from "zod";

import { parsePlanMonthRange, type PlanMonthRange } from "@/shared/utils/planMonthRange";

interface PlanMonthRangeFormProps {
    range: PlanMonthRange;
    isPending: boolean;
    onApply: (range: PlanMonthRange) => void;
}

export default function PlanMonthRangeForm({ range, isPending, onApply }: PlanMonthRangeFormProps): JSX.Element {
    const [draft, setDraft] = useState(range);
    const [error, setError] = useState<string | null>(null);

    function handleSubmit(event: FormEvent): void {
        event.preventDefault();
        if (isPending) return;

        let nextRange: PlanMonthRange;
        try {
            nextRange = parsePlanMonthRange(draft);
        } catch (error: unknown) {
            setError(error instanceof ZodError ? error.issues[0].message : "Choose a valid month range.");
            return;
        }
        setError(null);
        onApply(nextRange);
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm text-slate-600">
                From
                <input
                    type="month"
                    value={draft.from}
                    onChange={(event) => setDraft({ ...draft, from: event.target.value })}
                    className="rounded-md border border-slate-300 px-3 py-2 text-slate-800"
                />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
                To
                <input
                    type="month"
                    value={draft.to}
                    onChange={(event) => setDraft({ ...draft, to: event.target.value })}
                    className="rounded-md border border-slate-300 px-3 py-2 text-slate-800"
                />
            </label>
            <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
                Apply
            </button>
            <span role="status" className="py-2 text-sm text-slate-500">
                {isPending ? "Updating plan…" : ""}
            </span>
            {error !== null ? (
                <p role="alert" className="m-0 basis-full text-sm text-red-600">
                    {error}
                </p>
            ) : null}
        </form>
    );
}
