import { type PlanSection } from "@/clients/backendClient/responseParsers";

import PlanSectionLines from "./PlanSectionLines";
import RenameSectionForm from "./RenameSectionForm";

interface SectionRowProps {
    section: PlanSection;
    isFirst: boolean;
    isLast: boolean;
    isEditing: boolean;
    isUpdatePending: boolean;
    isDeletePending: boolean;
    onCancelEditing: () => void;
    onStartEditing: (section: PlanSection) => void;
    onRename: (section: PlanSection, draftName: string) => Promise<void>;
    onMove: (section: PlanSection, position: number) => void;
    onDelete: (section: PlanSection) => void;
}

export default function SectionRow({
    section,
    isFirst,
    isLast,
    isEditing,
    isUpdatePending,
    isDeletePending,
    onCancelEditing,
    onStartEditing,
    onRename,
    onMove,
    onDelete,
}: SectionRowProps): JSX.Element {
    return (
        <li className="flex min-h-12 flex-wrap items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
            <span className="w-6 shrink-0 text-center text-xs font-medium text-slate-400">{section.position}</span>

            {isEditing ? (
                <RenameSectionForm
                    section={section}
                    isPending={isUpdatePending}
                    onSubmit={(name) => onRename(section, name)}
                    onCancel={onCancelEditing}
                />
            ) : (
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
            )}
            <PlanSectionLines section={section} />
        </li>
    );
}
