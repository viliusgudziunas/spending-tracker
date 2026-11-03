import { type FormEvent, useState } from "react";

import { type PlanLine } from "@/clients/backendClient/responseParsers";
import { type UpdatePlanLinePayload } from "@/clients/backendClient/types";
import { useUpdatePlanLineMutation } from "@/hooks/usePlanQueries";
import { parsePlanAmountInput, serializePlanAmount } from "@/shared/utils/planAmounts";

interface EditPlanLineFormProps {
    sectionId: string;
    line: PlanLine;
    disabled: boolean;
    onClose: () => void;
}

export default function EditPlanLineForm({ sectionId, line, disabled, onClose }: EditPlanLineFormProps): JSX.Element {
    const [name, setName] = useState(line.name);
    const [amount, setAmount] = useState(serializePlanAmount(line.fixedAmountCents) ?? "");
    const [validationError, setValidationError] = useState<string | null>(null);
    const updateMutation = useUpdatePlanLineMutation(sectionId);
    const isPending = disabled || updateMutation.isPending;
    const error = validationError ?? updateMutation.error?.message;

    function handleSubmit(event: FormEvent): void {
        event.preventDefault();
        const trimmedName = name.trim();
        if (trimmedName === "" || isPending) return;
        setValidationError(null);
        updateMutation.reset();

        let fixedAmountCents: number | null;
        try {
            fixedAmountCents = parsePlanAmountInput(amount);
        } catch (error: unknown) {
            setValidationError(error instanceof Error ? error.message : "Enter a valid monthly amount.");
            return;
        }

        const payload: UpdatePlanLinePayload = {};
        if (trimmedName !== line.name) payload.name = trimmedName;
        if (fixedAmountCents !== line.fixedAmountCents) payload.fixedAmountCents = fixedAmountCents;
        if (Object.keys(payload).length === 0) {
            onClose();
            return;
        }
        updateMutation.mutate({ lineId: line.id, payload }, { onSuccess: onClose });
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
            <input
                autoFocus
                value={name}
                onChange={(event): void => setName(event.target.value)}
                disabled={isPending}
                aria-label={`Row name for ${line.name}`}
                className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
            <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event): void => setAmount(event.target.value)}
                disabled={isPending}
                aria-label={`Monthly amount in euros for ${line.name}`}
                placeholder="Monthly € (optional)"
                className="w-40 rounded-md border border-slate-300 px-3 py-1.5 text-right text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
            <button
                type="submit"
                disabled={name.trim() === "" || isPending}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {updateMutation.isPending ? "Saving..." : "Save"}
            </button>
            <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
                Cancel
            </button>
            {error ? (
                <p role="alert" className="m-0 basis-full text-sm text-red-600">
                    {error}
                </p>
            ) : null}
        </form>
    );
}
