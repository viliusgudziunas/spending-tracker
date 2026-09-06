import {
    useMutation,
    type UseMutationResult,
    useQuery,
    useQueryClient,
    type UseQueryResult,
} from "@tanstack/react-query";

import { type Category } from "@/clients/backendClient/responseParsers";
import { type CreateCategoryPayload, type UpdateCategoryPayload } from "@/clients/backendClient/types";
import { client } from "@/shared/stores/client";

export const CATEGORIES_QUERY_KEY = ["categories"] as const;

export function useCategoriesQuery(): UseQueryResult<Category[]> {
    return useQuery({
        queryKey: CATEGORIES_QUERY_KEY,
        queryFn: () => client.fetchCategories(),
    });
}

export function useCreateCategoryMutation(): UseMutationResult<Category, Error, CreateCategoryPayload> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateCategoryPayload) => await client.createCategory(payload),
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
            await client.updateCategory(categoryId, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
        },
    });
}
