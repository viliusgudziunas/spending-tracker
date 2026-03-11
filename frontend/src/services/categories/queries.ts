import { UseMutationResult, UseQueryResult, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import rulesApi, {
    CreateCategoryPayload,
    CreateFilterPayload,
    UpdateCategoryPayload,
    UpdateFilterPositionPayload,
} from "../rules/apiService";
import { Category, Filter } from "../rules/api.types.parsed";

export const CATEGORIES_QUERY_KEY = ["categories"] as const;

export function useCategoriesQuery(): UseQueryResult<Category[]> {
    return useQuery({
        queryKey: CATEGORIES_QUERY_KEY,
        queryFn: rulesApi.fetchCategories,
    });
}

export function useCreateCategoryMutation(): UseMutationResult<Category, Error, CreateCategoryPayload> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateCategoryPayload) => await rulesApi.createCategory(payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
        },
    });
}

interface UpdateCategoryVariables {
    categoryId: string;
    payload: UpdateCategoryPayload;
}

export function useUpdateCategoryMutation(): UseMutationResult<Category, Error, UpdateCategoryVariables> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ categoryId, payload }: UpdateCategoryVariables) =>
            await rulesApi.updateCategory(categoryId, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
        },
    });
}

export function useCreateFilterMutation(): UseMutationResult<Filter, Error, CreateFilterPayload> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateFilterPayload) => await rulesApi.createFilter(payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
        },
    });
}

interface UpdateFilterPositionVariables {
    filterId: string;
    payload: UpdateFilterPositionPayload;
}

export function useUpdateFilterPositionMutation(): UseMutationResult<Filter, Error, UpdateFilterPositionVariables> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ filterId, payload }: UpdateFilterPositionVariables) =>
            await rulesApi.updateFilterPosition(filterId, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
        },
    });
}

export function useDeleteFilterMutation(): UseMutationResult<void, Error, string> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (filterId: string) => await rulesApi.deleteFilter(filterId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
        },
    });
}
