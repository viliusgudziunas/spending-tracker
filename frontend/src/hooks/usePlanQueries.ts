import {
    keepPreviousData,
    useIsFetching,
    useIsMutating,
    useMutation,
    type UseMutationResult,
    useQuery,
    useQueryClient,
    type UseQueryResult,
} from "@tanstack/react-query";

import { type PlanGrid, type PlanLine, type PlanSection } from "@/clients/backendClient/responseParsers";
import {
    type CreatePlanLinePayload,
    type CreatePlanSectionPayload,
    type MovePlanLinePayload,
    type UpdatePlanLinePayload,
    type UpdatePlanSectionPayload,
} from "@/clients/backendClient/types";
import { client } from "@/shared/stores/client";
import { type PlanMonthRange } from "@/shared/utils/planMonthRange";

export const PLAN_QUERY_KEY = ["plan"] as const;
const PLAN_LINE_UPDATE_MUTATION_KEY = ["plan", "line", "update"] as const;

export function usePlanQuery(range: PlanMonthRange): UseQueryResult<PlanGrid> {
    return useQuery({
        queryKey: [...PLAN_QUERY_KEY, range.from, range.to],
        queryFn: () => client.fetchPlan(range),
        placeholderData: keepPreviousData,
    });
}

export function useIsPlanPending(): boolean {
    const fetching = useIsFetching({ queryKey: PLAN_QUERY_KEY });
    const saving = useIsMutating({ mutationKey: PLAN_QUERY_KEY });
    return fetching > 0 || saving > 0;
}

interface CreatePlanLineVariables {
    sectionId: string;
    payload: CreatePlanLinePayload;
}

export function useCreatePlanLineMutation(): UseMutationResult<PlanLine, Error, CreatePlanLineVariables> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: PLAN_QUERY_KEY,
        mutationFn: ({ sectionId, payload }: CreatePlanLineVariables) => client.createPlanLine(sectionId, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEY });
        },
    });
}

interface UpdatePlanLineVariables {
    lineId: string;
    payload: UpdatePlanLinePayload;
}

export function useIsPlanSectionSaving(sectionId: string): boolean {
    return useIsMutating({ mutationKey: [...PLAN_LINE_UPDATE_MUTATION_KEY, sectionId] }) > 0;
}

export function useUpdatePlanLineMutation(
    sectionId: string,
): UseMutationResult<PlanLine, Error, UpdatePlanLineVariables> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: [...PLAN_LINE_UPDATE_MUTATION_KEY, sectionId],
        mutationFn: ({ lineId, payload }: UpdatePlanLineVariables) => client.updatePlanLine(lineId, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEY });
        },
    });
}

interface MovePlanLineVariables {
    lineId: string;
    payload: MovePlanLinePayload;
}

export function useMovePlanLineMutation(): UseMutationResult<PlanLine, Error, MovePlanLineVariables> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: PLAN_QUERY_KEY,
        mutationFn: ({ lineId, payload }: MovePlanLineVariables) => client.movePlanLine(lineId, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEY });
        },
    });
}

export function useDeletePlanLineMutation(): UseMutationResult<void, Error, string> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: PLAN_QUERY_KEY,
        mutationFn: (lineId: string) => client.deletePlanLine(lineId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEY });
        },
    });
}

export function useCreatePlanSectionMutation(): UseMutationResult<PlanSection, Error, CreatePlanSectionPayload> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: PLAN_QUERY_KEY,
        mutationFn: async (payload: CreatePlanSectionPayload) => await client.createPlanSection(payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEY });
        },
    });
}

interface UpdatePlanSectionVariables {
    sectionId: string;
    payload: UpdatePlanSectionPayload;
}

export function useUpdatePlanSectionMutation(): UseMutationResult<PlanSection, Error, UpdatePlanSectionVariables> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: PLAN_QUERY_KEY,
        mutationFn: async ({ sectionId, payload }: UpdatePlanSectionVariables) =>
            await client.updatePlanSection(sectionId, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEY });
        },
    });
}

export function useDeletePlanSectionMutation(): UseMutationResult<void, Error, string> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: PLAN_QUERY_KEY,
        mutationFn: async (sectionId: string) => await client.deletePlanSection(sectionId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEY });
        },
    });
}
