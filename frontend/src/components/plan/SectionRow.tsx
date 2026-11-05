import { type PlanSection } from "@/clients/backendClient/responseParsers";

interface SectionRowProps {
    section: PlanSection;
    isFirst: boolean;
    isLast: boolean;
    isUpdatePending: boolean;
    isDeletePending: boolean;
    onStartEditing: (section: PlanSection) => void;
    onMove: (section: PlanSection, position: number) => void;
    onDelete: (section: PlanSection) => void;
}

export default function SectionRow({
    section,
    isFirst,
    isLast,
    isUpdatePending,
    isDeletePending,
    onStartEditing,
    onMove,
    onDelete,
}: SectionRowProps): JSX.Element {
    return (
        <>
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="truncate text-sm font-semibold text-slate-800">{section.name}</span>
                {section.isIncome ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Income
                    </span>
                ) : null}
            </div>

            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={(): void => onMove(section, section.position - 1)}
                    disabled={isFirst || isUpdatePending}
                    aria-label={`Move ${section.name} up`}
                    title="Move up"
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    ↑
                </button>
                <button
                    type="button"
                    onClick={(): void => onMove(section, section.position + 1)}
                    disabled={isLast || isUpdatePending}
                    aria-label={`Move ${section.name} down`}
                    title="Move down"
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    ↓
                </button>
                <button
                    type="button"
                    onClick={(): void => onStartEditing(section)}
                    disabled={isUpdatePending || isDeletePending}
                    aria-label={`Rename ${section.name}`}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                >
                    Edit
                </button>
                <button
                    type="button"
                    onClick={(): void => onDelete(section)}
                    disabled={isDeletePending || isUpdatePending}
                    className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                >
                    Delete
                </button>
            </div>
        </>
    );
}
