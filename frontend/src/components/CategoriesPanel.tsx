import {
    closestCenter,
    DndContext,
    type DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { arrayMove } from "@dnd-kit/sortable";
import { Category, Filter, RuleGroup } from "../services/rules/api.types.parsed";
import {
    CATEGORIES_QUERY_KEY,
    useCategoriesQuery,
    useCreateCategoryMutation,
    useUpdateCategoryMutation,
} from "../services/categories/queries";

interface CategoriesPanelProps {
    onClose: () => void;
    width: number;
}

export default function CategoriesPanel({ onClose, width }: CategoriesPanelProps): JSX.Element {
    const { data: categories, isLoading, isError } = useCategoriesQuery();
    const updateMutation = useUpdateCategoryMutation();
    const queryClient = useQueryClient();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const categoryIds = useMemo(() => categories?.map((c) => c.id) ?? [], [categories]);

    const handleDragEnd = useCallback(
        (event: DragEndEvent): void => {
            const { active, over } = event;
            if (over === null || active.id === over.id || categories === undefined) return;

            const oldIndex = categories.findIndex((c) => c.id === active.id);
            const newIndex = categories.findIndex((c) => c.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const reordered = arrayMove(categories, oldIndex, newIndex).map((c, i) => ({
                ...c,
                position: i + 1,
            }));
            queryClient.setQueryData(CATEGORIES_QUERY_KEY, reordered);

            const newPosition = categories[newIndex].position;
            void updateMutation.mutateAsync({
                categoryId: active.id as string,
                payload: { position: newPosition },
            });
        },
        [categories, updateMutation, queryClient],
    );

    return (
        <div className="sticky top-4 flex shrink-0 flex-col gap-3 self-start" style={{ width }}>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="m-0 text-lg font-semibold text-slate-900">Categories</h2>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                    &#x2715;
                </button>
            </div>

            <div className="flex max-h-[calc(100vh-8rem)] flex-col gap-2 overflow-y-auto">
                {isLoading ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                        <p className="m-0 text-sm text-slate-400">Loading categories...</p>
                    </div>
                ) : null}

                {isError ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                        <p className="m-0 text-sm text-red-500">Failed to load categories.</p>
                    </div>
                ) : null}

                {categories !== undefined && categories.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                        <p className="m-0 text-sm text-slate-400">No categories yet.</p>
                    </div>
                ) : null}

                {categories !== undefined && categories.length > 0 ? (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
                            {categories.map((category) => (
                                <SortableCategoryCard key={category.id} category={category} />
                            ))}
                        </SortableContext>
                    </DndContext>
                ) : null}

                <CreateCategoryForm />
            </div>
        </div>
    );
}

interface SortableCategoryCardProps {
    category: Category;
}

function SortableCategoryCard({ category }: SortableCategoryCardProps): JSX.Element {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
        id: category.id,
    });
    const [expanded, setExpanded] = useState(false);

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
                        <ul className="m-0 flex list-none flex-col gap-1 p-0">
                            {category.filters.map((filter) => (
                                <FilterItem key={filter.id} filter={filter} />
                            ))}
                        </ul>
                    )}
                </div>
            ) : null}
        </div>
    );
}

interface FilterItemProps {
    filter: Filter;
}

function FilterItem({ filter }: FilterItemProps): JSX.Element {
    const [expanded, setExpanded] = useState(false);

    return (
        <li>
            <button
                type="button"
                onClick={(): void => setExpanded((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition hover:bg-slate-50"
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

interface RuleGroupItemProps {
    ruleGroup: RuleGroup;
}

function RuleGroupItem({ ruleGroup }: RuleGroupItemProps): JSX.Element {
    return (
        <div className="py-1">
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                {ruleGroup.operator}
            </span>
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                {ruleGroup.rules.map((rule) => (
                    <li key={rule.id} className="flex items-center gap-1.5 py-0.5 text-[11px] text-slate-500">
                        <span className="font-medium text-slate-600">{rule.type}</span>
                        <span className="text-slate-400">{rule.operator}</span>
                        <span className="truncate text-slate-700">{rule.value}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function CreateCategoryForm(): JSX.Element {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState("");
    const createMutation = useCreateCategoryMutation();

    const handleSubmit = useCallback(
        async (e: React.FormEvent): Promise<void> => {
            e.preventDefault();
            if (name.trim() === "") return;
            await createMutation.mutateAsync({ name: name.trim() });
            setName("");
            setIsOpen(false);
        },
        [name, createMutation],
    );

    if (!isOpen) {
        return (
            <button
                type="button"
                onClick={(): void => setIsOpen(true)}
                className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-xs font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
            >
                + New Category
            </button>
        );
    }

    return (
        <form
            onSubmit={(e): void => void handleSubmit(e)}
            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
            <input
                type="text"
                value={name}
                onChange={(e): void => setName(e.target.value)}
                placeholder="Category name"
                autoFocus
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={name.trim() === "" || createMutation.isPending}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {createMutation.isPending ? "Creating..." : "Create"}
                </button>
                <button
                    type="button"
                    onClick={(): void => {
                        setIsOpen(false);
                        setName("");
                    }}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
