import { type DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { Filter } from "../clients/backendClient/responseParsers";
import { CATEGORIES_QUERY_KEY, useCategoriesQuery, useUpdateCategoryMutation } from "./useCategoryQueries";
import { useDeleteFilterMutation, useUpdateFilterPositionMutation } from "./useFilterQueries";

interface UseCategoriesPanelStateResult {
    categories: ReturnType<typeof useCategoriesQuery>["data"];
    isLoading: boolean;
    isError: boolean;
    categoryIds: string[];
    sensors: ReturnType<typeof useSensors>;
    handleCategoryDragEnd: (event: DragEndEvent) => void;
    handleFilterDragEnd: (categoryId: string, event: DragEndEvent) => void;
    handleDeleteFilter: (filter: Filter) => Promise<void>;
    isDeletePending: boolean;
}

function useCategoriesPanelState(): UseCategoriesPanelStateResult {
    const { data: categories, isLoading, isError } = useCategoriesQuery();
    const updateMutation = useUpdateCategoryMutation();
    const updateFilterPositionMutation = useUpdateFilterPositionMutation();
    const deleteFilterMutation = useDeleteFilterMutation();
    const queryClient = useQueryClient();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const categoryIds = useMemo(() => categories?.map((category) => category.id) ?? [], [categories]);

    const handleCategoryDragEnd = useCallback(
        (event: DragEndEvent): void => {
            const { active, over } = event;
            if (over === null || active.id === over.id || categories === undefined) return;

            const oldIndex = categories.findIndex((category) => category.id === active.id);
            const newIndex = categories.findIndex((category) => category.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const reordered = arrayMove(categories, oldIndex, newIndex).map((category, index) => ({
                ...category,
                position: index + 1,
            }));
            queryClient.setQueryData(CATEGORIES_QUERY_KEY, reordered);

            const newPosition = categories[newIndex].position;
            void updateMutation.mutateAsync({
                categoryId: active.id as string,
                payload: { position: newPosition },
            });
        },
        [categories, queryClient, updateMutation],
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

    return {
        categories,
        isLoading,
        isError,
        categoryIds,
        sensors,
        handleCategoryDragEnd,
        handleFilterDragEnd,
        handleDeleteFilter,
        isDeletePending: deleteFilterMutation.isPending,
    };
}

export default useCategoriesPanelState;
