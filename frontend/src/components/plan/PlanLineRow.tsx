import { useState } from "react";

import { type PlanGridLine, type PlanLine } from "@/clients/backendClient/responseParsers";

import EditPlanLineForm from "./EditPlanLineForm";

const EUR_FORMAT = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

interface PlanLineRowProps {
    sectionId: string;
    line: PlanGridLine;
    months: string[];
    lineCount: number;
    disabled: boolean;
    onMove: (lineId: string, position: number) => void;
    onDelete: (line: PlanLine) => void;
}

export default function PlanLineRow({
    sectionId,
    line,
    months,
    lineCount,
    disabled,
    onMove,
    onDelete,
}: PlanLineRowProps): JSX.Element {
    const [isEditing, setIsEditing] = useState(false);

    return (
        <li className="col-span-full grid grid-cols-subgrid border-b border-slate-100 text-sm text-slate-700">
            {isEditing ? (
                <div className="@xl/plan:sticky left-0 z-10 bg-white px-3 py-2">
                    <EditPlanLineForm
                        sectionId={sectionId}
                        line={line}
                        disabled={disabled}
                        onClose={() => setIsEditing(false)}
                    />
                </div>
            ) : (
                <div className="@xl/plan:sticky left-0 z-10 flex flex-wrap items-center gap-2 bg-white px-3 py-2">
                    <span className="min-w-24 flex-1 break-words">{line.name}</span>
                    <div className="flex shrink-0 items-center gap-1">
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
                </div>
            )}
            {months.map((month) => (
                <span
                    key={month}
                    aria-label={`${line.name} ${month}`}
                    className="flex items-center justify-end border-l border-slate-100 px-3 py-2 tabular-nums"
                >
                    {line.amountsCents[month] === null ? "—" : EUR_FORMAT.format(line.amountsCents[month] / 100)}
                </span>
            ))}
        </li>
    );
}
