import {
    closestCenter,
    DndContext,
    type DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";

import { type Category, type Filter } from "@/clients/backendClient/responseParsers";

import CreateFilterForm from "./CreateFilterForm";
import SortableFilterItem from "./SortableFilterItem";

interface SortableCategoryCardProps {
    category: Category;
    onFilterDragEnd: (categoryId: string, event: DragEndEvent) => void;
    onDeleteFilter: (filter: Filter) => Promise<void>;
    isDeletePending: boolean;
}

export default function SortableCategoryCard({
    category,
    onFilterDragEnd,
    onDeleteFilter,
    isDeletePending,
}: SortableCategoryCardProps): JSX.Element {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
        id: category.id,
    });
    const [expanded, setExpanded] = useState(false);
    const filterSensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
    const filterIds = useMemo(() => category.filters.map((filter) => filter.id), [category.filters]);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`rounded-xl border bg-white shadow-sm ${isDragging ? "border-blue-300 shadow-md" : "border-slate-200"}`}
        >
            <div className="flex items-center gap-1 px-2 py-3">
                <button
                    type="button"
                    ref={setActivatorNodeRef}
                    {...attributes}
                    {...listeners}
                    className="flex h-8 w-6 shrink-0 cursor-grab items-center justify-center rounded text-slate-300 transition hover:text-slate-500 active:cursor-grabbing"
                >
                    <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
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
                    className="flex min-w-0 flex-1 items-center justify-between rounded-md px-2 py-0.5 text-left transition hover:bg-slate-50"
                >
                    <div className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-800">{category.name}</span>
                        <span className="text-xs text-slate-400">
                            {category.filters.length} filter{category.filters.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-90" : ""}`}
                    >
                        <polyline points="6 3 11 8 6 13" />
                    </svg>
                </button>
            </div>

            {expanded ? (
                <div className="border-t border-slate-100 px-4 py-2">
                    {category.filters.length === 0 ? (
                        <p className="m-0 py-2 text-xs text-slate-400">No filters in this category.</p>
                    ) : (
                        <DndContext
                            sensors={filterSensors}
                            collisionDetection={closestCenter}
                            modifiers={[restrictToVerticalAxis]}
                            onDragEnd={(event): void => onFilterDragEnd(category.id, event)}
                        >
                            <SortableContext items={filterIds} strategy={verticalListSortingStrategy}>
                                <ul className="m-0 flex list-none flex-col gap-1 p-0">
                                    {category.filters.map((filter) => (
                                        <SortableFilterItem
                                            key={filter.id}
                                            filter={filter}
                                            onDelete={onDeleteFilter}
                                            isDeletePending={isDeletePending}
                                        />
                                    ))}
                                </ul>
                            </SortableContext>
                        </DndContext>
                    )}
                    <div className="mt-2">
                        <CreateFilterForm categoryId={category.id} />
                    </div>
                </div>
            ) : null}
        </div>
    );
}
