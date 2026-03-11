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
import { Category, Filter, RuleGroup, RuleOperator, RuleType } from "../services/rules/api.types.parsed";
import {
    CATEGORIES_QUERY_KEY,
    useCategoriesQuery,
    useCreateCategoryMutation,
    useDeleteFilterMutation,
    useCreateFilterMutation,
    useUpdateCategoryMutation,
    useUpdateFilterPositionMutation,
} from "../services/categories/queries";

interface CategoriesPanelProps {
    onClose: () => void;
    width: number;
}

export default function CategoriesPanel({ onClose, width }: CategoriesPanelProps): JSX.Element {
    const { data: categories, isLoading, isError } = useCategoriesQuery();
    const updateMutation = useUpdateCategoryMutation();
    const updateFilterPositionMutation = useUpdateFilterPositionMutation();
    const deleteFilterMutation = useDeleteFilterMutation();
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

    const handleFilterDragEnd = useCallback(
        (categoryId: string, event: DragEndEvent): void => {
            const { active, over } = event;
            if (categories === undefined) return;

            const category = categories.find((currentCategory) => currentCategory.id === categoryId);
            if (category === undefined) return;

            const oldIndex = category.filters.findIndex((filter) => filter.id === active.id);
            if (oldIndex === -1) return;

            let newIndex = -1;
            if (over !== null) {
                if (active.id === over.id) {
                    // Near top/bottom edges, dnd-kit can still report active item as the collision target.
                    // Use drag direction to resolve boundary moves instead of treating it as a no-op.
                    if (event.delta.y < 0) {
                        newIndex = 0;
                    } else if (event.delta.y > 0) {
                        newIndex = category.filters.length - 1;
                    } else {
                        return;
                    }
                } else {
                    newIndex = category.filters.findIndex((filter) => filter.id === over.id);
                }
            } else {
                // When dropping near list boundaries, dnd-kit can resolve no "over" target.
                // Treat upward drags as move-to-top and downward drags as move-to-bottom.
                newIndex = event.delta.y < 0 ? 0 : category.filters.length - 1;
            }
            if (newIndex === -1 || newIndex === oldIndex) return;

            const reorderedFilters = arrayMove(category.filters, oldIndex, newIndex).map((filter, index) => ({
                ...filter,
                position: index,
            }));
            queryClient.setQueryData(
                CATEGORIES_QUERY_KEY,
                categories.map((currentCategory) =>
                    currentCategory.id === categoryId
                        ? { ...currentCategory, filters: reorderedFilters }
                        : currentCategory,
                ),
            );

            const newPosition = newIndex;
            void updateFilterPositionMutation.mutateAsync({
                filterId: active.id as string,
                payload: { position: newPosition },
            });
        },
        [categories, queryClient, updateFilterPositionMutation],
    );

    const handleDeleteFilter = useCallback(
        async (filter: Filter): Promise<void> => {
            const shouldDelete = window.confirm(`Delete filter "${filter.name}"?`);
            if (!shouldDelete) return;

            await deleteFilterMutation.mutateAsync(filter.id);
        },
        [deleteFilterMutation],
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
                                <SortableCategoryCard
                                    key={category.id}
                                    category={category}
                                    onFilterDragEnd={handleFilterDragEnd}
                                    onDeleteFilter={handleDeleteFilter}
                                    isDeletePending={deleteFilterMutation.isPending}
                                />
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
    onFilterDragEnd: (categoryId: string, event: DragEndEvent) => void;
    onDeleteFilter: (filter: Filter) => Promise<void>;
    isDeletePending: boolean;
}

function SortableCategoryCard({
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

interface SortableFilterItemProps {
    filter: Filter;
    onDelete: (filter: Filter) => Promise<void>;
    isDeletePending: boolean;
}

function SortableFilterItem({ filter, onDelete, isDeletePending }: SortableFilterItemProps): JSX.Element {
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

interface CreateFilterFormProps {
    categoryId: string;
}

interface CreateFilterRuleDraft {
    type: RuleType;
    operator: RuleOperator;
    value: string;
}

interface CreateFilterRuleGroupDraft {
    operator: "AND";
    rules: CreateFilterRuleDraft[];
}

const DEFAULT_FILTER_RULE: CreateFilterRuleDraft = {
    type: "DESCRIPTION",
    operator: "EQUAL",
    value: "",
};

const DEFAULT_FILTER_RULE_GROUP: CreateFilterRuleGroupDraft = {
    operator: "AND",
    rules: [{ ...DEFAULT_FILTER_RULE }],
};

function CreateFilterForm({ categoryId }: CreateFilterFormProps): JSX.Element {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState("");
    const [ruleGroups, setRuleGroups] = useState<CreateFilterRuleGroupDraft[]>([
        { ...DEFAULT_FILTER_RULE_GROUP, rules: [{ ...DEFAULT_FILTER_RULE }] },
    ]);
    const createFilterMutation = useCreateFilterMutation();

    const handleSubmit = useCallback(
        async (e: React.FormEvent): Promise<void> => {
            e.preventDefault();
            const trimmedName = name.trim();
            if (trimmedName === "") return;

            const parsedRuleGroups = ruleGroups.map((group) => ({
                operator: group.operator,
                rules: group.rules.map((rule) => ({
                    ...rule,
                    value: rule.value.trim(),
                })),
            }));
            const hasInvalidRules = parsedRuleGroups.some(
                (group) => group.rules.length === 0 || group.rules.some((rule) => rule.value === ""),
            );
            if (hasInvalidRules) return;

            await createFilterMutation.mutateAsync({
                name: trimmedName,
                categoryId,
                ruleGroups: parsedRuleGroups,
            });
            setName("");
            setRuleGroups([{ ...DEFAULT_FILTER_RULE_GROUP, rules: [{ ...DEFAULT_FILTER_RULE }] }]);
            setIsOpen(false);
        },
        [categoryId, createFilterMutation, name, ruleGroups],
    );

    if (!isOpen) {
        return (
            <button
                type="button"
                onClick={(): void => setIsOpen(true)}
                className="w-full rounded-md border border-dashed border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
            >
                + New Filter
            </button>
        );
    }

    return (
        <form
            onSubmit={(e): void => void handleSubmit(e)}
            className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
        >
            <input
                type="text"
                value={name}
                onChange={(e): void => setName(e.target.value)}
                placeholder="Filter name"
                autoFocus
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
            {ruleGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-600">
                            Rule Group {groupIndex + 1} (AND)
                        </span>
                        <button
                            type="button"
                            disabled={ruleGroups.length === 1}
                            onClick={(): void =>
                                setRuleGroups((currentGroups) =>
                                    currentGroups.filter((_, currentGroupIndex) => currentGroupIndex !== groupIndex),
                                )
                            }
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Remove Group
                        </button>
                    </div>
                    {group.rules.map((rule, ruleIndex) => (
                        <div
                            key={ruleIndex}
                            className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-2"
                        >
                            <div className="grid grid-cols-2 gap-2">
                                <select
                                    value={rule.type}
                                    onChange={(e): void =>
                                        setRuleGroups((currentGroups) =>
                                            currentGroups.map((currentGroup, currentGroupIndex) =>
                                                currentGroupIndex === groupIndex
                                                    ? {
                                                          ...currentGroup,
                                                          rules: currentGroup.rules.map(
                                                              (currentRule, currentRuleIndex) =>
                                                                  currentRuleIndex === ruleIndex
                                                                      ? {
                                                                            ...currentRule,
                                                                            type: e.target.value as RuleType,
                                                                        }
                                                                      : currentRule,
                                                          ),
                                                      }
                                                    : currentGroup,
                                            ),
                                        )
                                    }
                                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                >
                                    <option value="DESCRIPTION">Description</option>
                                    <option value="AMOUNT">Amount</option>
                                </select>
                                <select
                                    value={rule.operator}
                                    onChange={(e): void =>
                                        setRuleGroups((currentGroups) =>
                                            currentGroups.map((currentGroup, currentGroupIndex) =>
                                                currentGroupIndex === groupIndex
                                                    ? {
                                                          ...currentGroup,
                                                          rules: currentGroup.rules.map(
                                                              (currentRule, currentRuleIndex) =>
                                                                  currentRuleIndex === ruleIndex
                                                                      ? {
                                                                            ...currentRule,
                                                                            operator: e.target.value as RuleOperator,
                                                                        }
                                                                      : currentRule,
                                                          ),
                                                      }
                                                    : currentGroup,
                                            ),
                                        )
                                    }
                                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                >
                                    <option value="EQUAL">= Equal</option>
                                    <option value="NOT_EQUAL">&#x2260; Not equal</option>
                                    <option value="GREATER_THAN">&gt; Greater than</option>
                                    <option value="LESS_THAN">&lt; Less than</option>
                                    <option value="GREATER_THAN_EQUAL">&gt;= Greater/equal</option>
                                    <option value="LESS_THAN_EQUAL">&lt;= Less/equal</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={rule.value}
                                    onChange={(e): void =>
                                        setRuleGroups((currentGroups) =>
                                            currentGroups.map((currentGroup, currentGroupIndex) =>
                                                currentGroupIndex === groupIndex
                                                    ? {
                                                          ...currentGroup,
                                                          rules: currentGroup.rules.map(
                                                              (currentRule, currentRuleIndex) =>
                                                                  currentRuleIndex === ruleIndex
                                                                      ? { ...currentRule, value: e.target.value }
                                                                      : currentRule,
                                                          ),
                                                      }
                                                    : currentGroup,
                                            ),
                                        )
                                    }
                                    placeholder={
                                        rule.type === "AMOUNT"
                                            ? "Amount value (e.g. 12.50)"
                                            : 'Description value (e.g. "Netflix")'
                                    }
                                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                />
                                <button
                                    type="button"
                                    disabled={group.rules.length === 1}
                                    onClick={(): void =>
                                        setRuleGroups((currentGroups) =>
                                            currentGroups.map((currentGroup, currentGroupIndex) =>
                                                currentGroupIndex === groupIndex
                                                    ? {
                                                          ...currentGroup,
                                                          rules: currentGroup.rules.filter(
                                                              (_, currentRuleIndex) => currentRuleIndex !== ruleIndex,
                                                          ),
                                                      }
                                                    : currentGroup,
                                            ),
                                        )
                                    }
                                    className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={(): void =>
                            setRuleGroups((currentGroups) =>
                                currentGroups.map((currentGroup, currentGroupIndex) =>
                                    currentGroupIndex === groupIndex
                                        ? {
                                              ...currentGroup,
                                              rules: [...currentGroup.rules, { ...DEFAULT_FILTER_RULE }],
                                          }
                                        : currentGroup,
                                ),
                            )
                        }
                        className="w-full rounded-md border border-dashed border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
                    >
                        + New Rule
                    </button>
                </div>
            ))}
            <button
                type="button"
                onClick={(): void =>
                    setRuleGroups((currentGroups) => [
                        ...currentGroups,
                        { ...DEFAULT_FILTER_RULE_GROUP, rules: [{ ...DEFAULT_FILTER_RULE }] },
                    ])
                }
                className="w-full rounded-md border border-dashed border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
            >
                + New Rule Group
            </button>
            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={
                        name.trim() === "" ||
                        ruleGroups.some(
                            (group) => group.rules.length === 0 || group.rules.some((rule) => rule.value.trim() === ""),
                        ) ||
                        createFilterMutation.isPending
                    }
                    className="rounded-md bg-blue-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {createFilterMutation.isPending ? "Creating..." : "Create"}
                </button>
                <button
                    type="button"
                    onClick={(): void => {
                        setIsOpen(false);
                        setName("");
                        setRuleGroups([{ ...DEFAULT_FILTER_RULE_GROUP, rules: [{ ...DEFAULT_FILTER_RULE }] }]);
                    }}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
