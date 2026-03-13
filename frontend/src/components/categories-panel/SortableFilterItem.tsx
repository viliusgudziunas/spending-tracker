import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { Filter } from "../../clients/backendClient/responseParsers";
import RuleGroupItem from "./RuleGroupItem";

interface SortableFilterItemProps {
    filter: Filter;
    onDelete: (filter: Filter) => Promise<void>;
    isDeletePending: boolean;
}

export default function SortableFilterItem({ filter, onDelete, isDeletePending }: SortableFilterItemProps): JSX.Element {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
        id: filter.id,
    });
    const [expanded, setExpanded] = useState(false);
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 11 : undefined,
    };

    return (
        <li ref={setNodeRef} style={style} className={`rounded-md ${isDragging ? "bg-blue-50 shadow-sm" : ""}`}>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    ref={setActivatorNodeRef}
                    {...attributes}
                    {...listeners}
                    className="flex h-6 w-4 shrink-0 cursor-grab items-center justify-center rounded text-slate-300 transition hover:text-slate-500 active:cursor-grabbing"
                >
                    <svg width="8" height="12" viewBox="0 0 10 16" fill="currentColor">
                        <circle cx="3" cy="3" r="1.5" />
                        <circle cx="7" cy="3" r="1.5" />
                        <circle cx="3" cy="8" r="1.5" />
                        <circle cx="7" cy="8" r="1.5" />
                        <circle cx="3" cy="13" r="1.5" />
                        <circle cx="7" cy="13" r="1.5" />
                    </svg>
                </button>
                <button
                    type="button"
                    onClick={(): void => setExpanded((prev) => !prev)}
                    className="flex min-w-0 flex-1 items-center justify-between rounded-md px-2 py-1.5 text-left transition hover:bg-slate-50"
                >
                    <span className="truncate text-xs font-medium text-slate-700">{filter.name}</span>
                    {filter.ruleGroups.length > 0 ? (
                        <svg
                            width="12"
                            height="12"
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`shrink-0 text-slate-300 transition-transform ${expanded ? "rotate-90" : ""}`}
                        >
                            <polyline points="6 3 11 8 6 13" />
                        </svg>
                    ) : null}
                </button>
                <button
                    type="button"
                    onClick={(): void => void onDelete(filter)}
                    disabled={isDeletePending}
                    className="rounded-md px-2 py-1 text-[10px] font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Delete filter ${filter.name}`}
                    title="Delete filter"
                >
                    Delete
                </button>
            </div>

            {expanded && filter.ruleGroups.length > 0 ? (
                <div className="ml-2 border-l border-slate-100 pl-2">
                    {filter.ruleGroups.map((group) => (
                        <RuleGroupItem key={group.id} ruleGroup={group} />
                    ))}
                </div>
            ) : null}
        </li>
    );
}
