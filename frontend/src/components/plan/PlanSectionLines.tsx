import { useState } from "react";

import { type PlanGridSection, type PlanLine } from "@/clients/backendClient/responseParsers";
import {
    useCreatePlanLineMutation,
    useDeletePlanLineMutation,
    useIsPlanSectionSaving,
    useMovePlanLineMutation,
} from "@/hooks/usePlanQueries";

import CreatePlanLineForm from "./CreatePlanLineForm";
import PlanLineRow from "./PlanLineRow";

const EUR_FORMAT = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

export default function PlanSectionLines({
    section,
    months,
}: {
    section: PlanGridSection;
    months: string[];
}): JSX.Element {
    const [isCreating, setIsCreating] = useState(false);
    const createMutation = useCreatePlanLineMutation();
    const moveMutation = useMovePlanLineMutation();
    const deleteMutation = useDeletePlanLineMutation();
    const isSaving = useIsPlanSectionSaving(section.id);
    const isPending = createMutation.isPending || moveMutation.isPending || deleteMutation.isPending || isSaving;
    const orderError = moveMutation.error ?? deleteMutation.error;

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
        <div className="col-span-full grid grid-cols-subgrid">
            <ul
                aria-label={`Rows in ${section.name}`}
                className="col-span-full m-0 grid grid-cols-subgrid list-none p-0"
            >
                {section.lines.map((line) => (
                    <PlanLineRow
                        key={line.id}
                        sectionId={section.id}
                        line={line}
                        months={months}
                        lineCount={section.lines.length}
                        disabled={isPending}
                        onMove={handleMove}
                        onDelete={handleDelete}
                    />
                ))}
            </ul>
            {isCreating || orderError !== null || createMutation.error !== null ? (
                <div className="@xl/plan:sticky left-0 z-10 col-start-1 bg-white px-3 py-2">
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
                    ) : null}
                    {createMutation.error !== null ? (
                        <p role="alert" className="mb-0 mt-2 text-sm text-red-600">
                            {createMutation.error.message}
                        </p>
                    ) : null}
                </div>
            ) : null}
            <div className="col-span-full grid grid-cols-subgrid border-y border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
                <div className="@xl/plan:sticky left-0 z-10 flex items-center justify-between gap-2 bg-slate-50 px-3 py-2">
                    <span>Monthly total</span>
                    {!isCreating ? (
                        <button
                            type="button"
                            onClick={() => setIsCreating(true)}
                            disabled={isPending}
                            aria-label={`Add row to ${section.name}`}
                            className="shrink-0 rounded px-1 text-xs font-normal text-slate-500 hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            + Add row
                        </button>
                    ) : null}
                </div>
                {months.map((month) => (
                    <span
                        key={month}
                        aria-label={`${section.name} total ${month}`}
                        className="border-l border-slate-200 px-3 py-2 text-right tabular-nums"
                    >
                        {EUR_FORMAT.format(section.totalsCents[month] / 100)}
                    </span>
                ))}
            </div>
        </div>
    );
}
