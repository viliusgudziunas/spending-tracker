import { useState } from "react";

import { type PlanLine } from "@/clients/backendClient/responseParsers";

import EditPlanLineForm from "./EditPlanLineForm";

const EUR_FORMAT = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

interface PlanLineRowProps {
    sectionId: string;
    line: PlanLine;
    lineCount: number;
    disabled: boolean;
    onMove: (lineId: string, position: number) => void;
    onDelete: (line: PlanLine) => void;
}

export default function PlanLineRow({
    sectionId,
    line,
    lineCount,
    disabled,
    onMove,
    onDelete,
}: PlanLineRowProps): JSX.Element {
    const [isEditing, setIsEditing] = useState(false);

    return (
        <li className="border-b border-slate-100 px-2 py-2 text-sm text-slate-700">
            {isEditing ? (
                <EditPlanLineForm
                    sectionId={sectionId}
                    line={line}
                    disabled={disabled}
                    onClose={() => setIsEditing(false)}
                />
            ) : (
                <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 break-words">{line.name}</span>
                    <span className="text-right tabular-nums">
                        {line.fixedAmountCents === null ? "—" : EUR_FORMAT.format(line.fixedAmountCents / 100)}
                    </span>
                    <button
                        type="button"
                        onClick={() => onMove(line.id, line.position - 1)}
                        disabled={line.position === 1 || disabled}
                        aria-label={`Move row ${line.name} up`}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        ↑
                    </button>
                    <button
                        type="button"
                        onClick={() => onMove(line.id, line.position + 1)}
                        disabled={line.position === lineCount || disabled}
                        aria-label={`Move row ${line.name} down`}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        ↓
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        disabled={disabled}
                        aria-label={`Edit row ${line.name}`}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    >
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(line)}
                        disabled={disabled}
                        aria-label={`Delete row ${line.name}`}
                        className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Delete
                    </button>
                </div>
            )}
        </li>
    );
}
