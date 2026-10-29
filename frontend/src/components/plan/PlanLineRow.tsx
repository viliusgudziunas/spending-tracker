import { type FormEvent, useState } from "react";

import { type PlanLine } from "@/clients/backendClient/responseParsers";
import { useRenamePlanLineMutation } from "@/hooks/usePlanQueries";

interface PlanLineRowProps {
    line: PlanLine;
    lineCount: number;
    isOrderPending: boolean;
    onMove: (lineId: string, position: number) => void;
    onDelete: (line: PlanLine) => void;
}

export default function PlanLineRow({
    line,
    lineCount,
    isOrderPending,
    onMove,
    onDelete,
}: PlanLineRowProps): JSX.Element {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState("");
    const renameMutation = useRenamePlanLineMutation();

    function startEditing(): void {
        setName(line.name);
        setIsEditing(true);
    }

    function closeForm(): void {
        setIsEditing(false);
        renameMutation.reset();
    }

    function handleRename(event: FormEvent): void {
        event.preventDefault();
        const trimmedName = name.trim();
        if (trimmedName === "" || renameMutation.isPending) return;
        if (trimmedName === line.name) {
            closeForm();
            return;
        }
        renameMutation.mutate({ lineId: line.id, payload: { name: trimmedName } }, { onSuccess: closeForm });
    }

    return (
        <li className="border-b border-slate-100 px-2 py-2 text-sm text-slate-700">
            {isEditing ? (
                <form onSubmit={handleRename} className="flex flex-wrap items-center gap-2">
                    <input
                        autoFocus
                        value={name}
                        onChange={(event): void => setName(event.target.value)}
                        disabled={renameMutation.isPending}
                        aria-label={`Rename row ${line.name}`}
                        className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                    />
                    <button
                        type="submit"
                        disabled={name.trim() === "" || renameMutation.isPending}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {renameMutation.isPending ? "Saving..." : "Save"}
                    </button>
                    <button
                        type="button"
                        onClick={closeForm}
                        disabled={renameMutation.isPending}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                </form>
            ) : (
                <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 break-words">{line.name}</span>
                    <button
                        type="button"
                        onClick={() => onMove(line.id, line.position - 1)}
                        disabled={line.position === 1 || isOrderPending}
                        aria-label={`Move row ${line.name} up`}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        ↑
                    </button>
                    <button
                        type="button"
                        onClick={() => onMove(line.id, line.position + 1)}
                        disabled={line.position === lineCount || isOrderPending}
                        aria-label={`Move row ${line.name} down`}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        ↓
                    </button>
                    <button
                        type="button"
                        onClick={startEditing}
                        disabled={isOrderPending}
                        aria-label={`Rename row ${line.name}`}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    >
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(line)}
                        disabled={isOrderPending}
                        aria-label={`Delete row ${line.name}`}
                        className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Delete
                    </button>
                </div>
            )}
            {renameMutation.error !== null ? (
                <p role="alert" className="mb-0 mt-2 text-sm text-red-600">
                    {renameMutation.error.message}
                </p>
            ) : null}
        </li>
    );
}
