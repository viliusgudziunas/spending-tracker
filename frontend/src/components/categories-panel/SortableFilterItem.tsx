import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRef, useState } from "react";

import { type Filter } from "@/clients/backendClient/responseParsers";
import { useRenameFilterMutation } from "@/hooks/useFilterQueries";

import EditFilterRuleGroupsForm from "./EditFilterRuleGroupsForm";
import RuleGroupItem from "./RuleGroupItem";

interface SortableFilterItemProps {
    filter: Filter;
    onDelete: (filter: Filter) => Promise<void>;
    isDeletePending: boolean;
}

export default function SortableFilterItem({
    filter,
    onDelete,
    isDeletePending,
}: SortableFilterItemProps): JSX.Element {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
        id: filter.id,
    });
    const [expanded, setExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameDraft, setRenameDraft] = useState(filter.name);
    const renameInputRef = useRef<HTMLInputElement>(null);
    const renameMutation = useRenameFilterMutation();
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 11 : undefined,
    };

    const startRenaming = (): void => {
        setRenameDraft(filter.name);
        setIsRenaming(true);
        requestAnimationFrame(() => renameInputRef.current?.select());
    };

    const submitRename = (): void => {
        const trimmed = renameDraft.trim();
        if (trimmed === "" || trimmed === filter.name) {
            setIsRenaming(false);
            return;
        }
        renameMutation.mutate(
            { filterId: filter.id, payload: { name: trimmed } },
            { onSettled: () => setIsRenaming(false) },
        );
    };

    const cancelRename = (): void => {
        setIsRenaming(false);
        setRenameDraft(filter.name);
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
                {isRenaming ? (
                    <input
                        ref={renameInputRef}
                        type="text"
                        value={renameDraft}
                        onChange={(e): void => setRenameDraft(e.target.value)}
                        onKeyDown={(e): void => {
                            if (e.key === "Enter") submitRename();
                            if (e.key === "Escape") cancelRename();
                        }}
                        onBlur={submitRename}
                        disabled={renameMutation.isPending}
                        className="min-w-0 flex-1 rounded-md border border-blue-300 px-2 py-1 text-xs font-medium text-slate-700 outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
                        aria-label={`Rename filter ${filter.name}`}
                    />
                ) : (
                    <button
                        type="button"
                        onClick={(): void => setExpanded((prev) => !prev)}
                        onDoubleClick={startRenaming}
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
                )}
                <button
                    type="button"
                    onClick={startRenaming}
                    disabled={isRenaming}
                    className="rounded-md px-2 py-1 text-[10px] font-semibold text-amber-600 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Rename filter ${filter.name}`}
                    title="Rename filter"
                >
                    Rename
                </button>
                <button
                    type="button"
                    onClick={(): void => {
                        setIsEditing(true);
                        setExpanded(true);
                    }}
                    className="rounded-md px-2 py-1 text-[10px] font-semibold text-blue-600 transition hover:bg-blue-50"
                    aria-label={`Edit filter ${filter.name}`}
                    title="Edit filter rules"
                >
                    Edit
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

            {expanded && isEditing ? (
                <div className="ml-2 mt-1 pl-2">
                    <EditFilterRuleGroupsForm filter={filter} onClose={(): void => setIsEditing(false)} />
                </div>
            ) : null}

            {expanded && !isEditing && filter.ruleGroups.length > 0 ? (
                <div className="ml-2 border-l border-slate-100 pl-2">
                    {filter.ruleGroups.map((group) => (
                        <RuleGroupItem key={group.id} ruleGroup={group} />
                    ))}
                </div>
            ) : null}
        </li>
    );
}
