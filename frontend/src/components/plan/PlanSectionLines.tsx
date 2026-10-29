import { type FormEvent, useState } from "react";

import { type PlanLine, type PlanSection } from "@/clients/backendClient/responseParsers";
import { useCreatePlanLineMutation, useDeletePlanLineMutation, useMovePlanLineMutation } from "@/hooks/usePlanQueries";

import PlanLineRow from "./PlanLineRow";

export default function PlanSectionLines({ section }: { section: PlanSection }): JSX.Element {
    const [name, setName] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const createMutation = useCreatePlanLineMutation();
    const moveMutation = useMovePlanLineMutation();
    const deleteMutation = useDeletePlanLineMutation();
    const isOrderPending = createMutation.isPending || moveMutation.isPending || deleteMutation.isPending;
    const orderError = moveMutation.error ?? deleteMutation.error;

    function handleMove(lineId: string, position: number): void {
        if (isOrderPending || position < 1 || position > section.lines.length) return;
        deleteMutation.reset();
        moveMutation.mutate({ lineId, payload: { position } });
    }

    function handleDelete(line: PlanLine): void {
        if (isOrderPending || !window.confirm(`Delete plan row "${line.name}"?`)) return;
        moveMutation.reset();
        deleteMutation.mutate(line.id);
    }

    function closeForm(): void {
        setName("");
        setIsCreating(false);
        createMutation.reset();
    }

    function handleCreate(event: FormEvent): void {
        event.preventDefault();
        const trimmedName = name.trim();
        if (trimmedName === "" || isOrderPending) return;
        createMutation.mutate({ sectionId: section.id, payload: { name: trimmedName } }, { onSuccess: closeForm });
    }

    return (
        <div className="ml-9 min-w-0 basis-full border-t border-slate-100 pt-2">
            <ul aria-label={`Rows in ${section.name}`} className="m-0 list-none p-0">
                {section.lines.map((line) => (
                    <PlanLineRow
                        key={line.id}
                        line={line}
                        lineCount={section.lines.length}
                        isOrderPending={isOrderPending}
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
                <form onSubmit={handleCreate} className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                        autoFocus
                        value={name}
                        onChange={(event): void => setName(event.target.value)}
                        disabled={isOrderPending}
                        aria-label={`New row in ${section.name}`}
                        placeholder="New row name"
                        className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                    />
                    <button
                        type="submit"
                        disabled={name.trim() === "" || isOrderPending}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {createMutation.isPending ? "Adding..." : "Add row"}
                    </button>
                    <button
                        type="button"
                        onClick={closeForm}
                        disabled={createMutation.isPending}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                </form>
            ) : (
                <button
                    type="button"
                    onClick={() => setIsCreating(true)}
                    aria-label={`Add row to ${section.name}`}
                    className="mt-2 rounded-md px-2 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                >
                    + Add row
                </button>
            )}
            {createMutation.error !== null ? (
                <p role="alert" className="mb-0 mt-2 text-sm text-red-600">
                    {createMutation.error.message}
                </p>
            ) : null}
        </div>
    );
}
