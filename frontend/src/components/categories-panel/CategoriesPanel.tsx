import { closestCenter, DndContext } from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import useCategoriesPanelState from "../../hooks/useCategoriesPanelState";
import CreateCategoryForm from "./CreateCategoryForm";
import SortableCategoryCard from "./SortableCategoryCard";

interface CategoriesPanelProps {
    onClose: () => void;
    width: number;
}

export default function CategoriesPanel({ onClose, width }: CategoriesPanelProps): JSX.Element {
    const {
        categories,
        isLoading,
        isError,
        categoryIds,
        sensors,
        handleCategoryDragEnd,
        handleFilterDragEnd,
        handleDeleteFilter,
        isDeletePending,
    } = useCategoriesPanelState();

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
                        onDragEnd={handleCategoryDragEnd}
                    >
                        <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
                            {categories.map((category) => (
                                <SortableCategoryCard
                                    key={category.id}
                                    category={category}
                                    onFilterDragEnd={handleFilterDragEnd}
                                    onDeleteFilter={handleDeleteFilter}
                                    isDeletePending={isDeletePending}
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
