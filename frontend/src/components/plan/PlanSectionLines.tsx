import { useState } from "react";

import { type PlanLine, type PlanSection } from "@/clients/backendClient/responseParsers";
import {
    useCreatePlanLineMutation,
    useDeletePlanLineMutation,
    useIsPlanSectionSaving,
    useMovePlanLineMutation,
} from "@/hooks/usePlanQueries";
import { sumPlanAmounts } from "@/shared/utils/planAmounts";

import CreatePlanLineForm from "./CreatePlanLineForm";
import PlanLineRow from "./PlanLineRow";

const EUR_FORMAT = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

export default function PlanSectionLines({ section }: { section: PlanSection }): JSX.Element {
    const [isCreating, setIsCreating] = useState(false);
    const createMutation = useCreatePlanLineMutation();
    const moveMutation = useMovePlanLineMutation();
    const deleteMutation = useDeletePlanLineMutation();
    const isSaving = useIsPlanSectionSaving(section.id);
    const isPending = createMutation.isPending || moveMutation.isPending || deleteMutation.isPending || isSaving;
    const orderError = moveMutation.error ?? deleteMutation.error;
    const totalCents = sumPlanAmounts(section.lines.map((line) => line.fixedAmountCents));

    function handleMove(lineId: string, position: number): void {
        if (isPending || position < 1 || position > section.lines.length) return;
        deleteMutation.reset();
        moveMutation.mutate({ lineId, payload: { position } });
    }

    function handleDelete(line: PlanLine): void {
        if (isPending || !window.confirm(`Delete plan row "${line.name}"?`)) return;
        moveMutation.reset();
        deleteMutation.mutate(line.id);
    }

    function closeForm(): void {
        setIsCreating(false);
        createMutation.reset();
    }

    function handleCreate(name: string): void {
        const trimmedName = name.trim();
        if (trimmedName === "" || isPending) return;
        createMutation.mutate({ sectionId: section.id, payload: { name: trimmedName } }, { onSuccess: closeForm });
    }

    return (
        <div className="ml-9 min-w-0 basis-full border-t border-slate-100 pt-2">
            <ul aria-label={`Rows in ${section.name}`} className="m-0 list-none p-0">
                {section.lines.map((line) => (
                    <PlanLineRow
                        key={line.id}
                        sectionId={section.id}
                        line={line}
                        lineCount={section.lines.length}
                        disabled={isPending}
                        onMove={handleMove}
                        onDelete={handleDelete}
                    />
                ))}
            </ul>
            {orderError !== null ? (
                <p role="alert" className="mb-0 mt-2 text-sm text-red-600">
                    {orderError.message}
                </p>
            ) : null}
            {isCreating ? (
                <CreatePlanLineForm
                    sectionName={section.name}
                    isPending={isPending}
                    isCreatePending={createMutation.isPending}
                    onSubmit={handleCreate}
                    onCancel={closeForm}
                />
            ) : (
                <button
                    type="button"
                    onClick={() => setIsCreating(true)}
                    disabled={isPending}
                    aria-label={`Add row to ${section.name}`}
                    className="mt-2 rounded-md px-2 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    + Add row
                </button>
            )}
            {createMutation.error !== null ? (
                <p role="alert" className="mb-0 mt-2 text-sm text-red-600">
                    {createMutation.error.message}
                </p>
            ) : null}
            <div className="flex items-center justify-between gap-2 px-2 py-2 text-sm font-semibold text-slate-700">
                <span>Monthly total</span>
                <span className="text-right tabular-nums">{EUR_FORMAT.format(totalCents / 100)}</span>
            </div>
        </div>
    );
}
