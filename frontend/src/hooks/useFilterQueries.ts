import { UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    CreateFilterPayload,
    PutFilterRuleGroupsPayload,
    UpdateFilterPositionPayload,
} from "../clients/backendClient/types";
import { Filter } from "../clients/backendClient/responseParsers";
import { client } from "../shared/stores/client";
import { CATEGORIES_QUERY_KEY } from "./useCategoryQueries";

export function useCreateFilterMutation(): UseMutationResult<Filter, Error, CreateFilterPayload> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateFilterPayload) => await client.createFilter(payload),
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
            await client.updateFilterPosition(filterId, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
        },
    });
}

export function useDeleteFilterMutation(): UseMutationResult<void, Error, string> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (filterId: string) => await client.deleteFilter(filterId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
        },
    });
}

interface PutFilterRuleGroupsVariables {
    filterId: string;
    payload: PutFilterRuleGroupsPayload;
}

export function usePutFilterRuleGroupsMutation(): UseMutationResult<Filter, Error, PutFilterRuleGroupsVariables> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ filterId, payload }: PutFilterRuleGroupsVariables) =>
            await client.putFilterRuleGroups(filterId, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
        },
    });
}
