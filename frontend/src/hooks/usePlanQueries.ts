import {
    useMutation,
    type UseMutationResult,
    useQuery,
    useQueryClient,
    type UseQueryResult,
} from "@tanstack/react-query";

import { type PlanLine, type PlanSection } from "@/clients/backendClient/responseParsers";
import {
    type CreatePlanLinePayload,
    type CreatePlanSectionPayload,
    type MovePlanLinePayload,
    type RenamePlanLinePayload,
    type UpdatePlanSectionPayload,
} from "@/clients/backendClient/types";
import { client } from "@/shared/stores/client";

export const PLAN_SECTIONS_QUERY_KEY = ["plan", "sections"] as const;

export function usePlanSectionsQuery(): UseQueryResult<PlanSection[]> {
    return useQuery({
        queryKey: PLAN_SECTIONS_QUERY_KEY,
        queryFn: () => client.fetchPlanSections(),
    });
}

interface CreatePlanLineVariables {
    sectionId: string;
    payload: CreatePlanLinePayload;
}

export function useCreatePlanLineMutation(): UseMutationResult<PlanLine, Error, CreatePlanLineVariables> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ sectionId, payload }: CreatePlanLineVariables) => client.createPlanLine(sectionId, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: PLAN_SECTIONS_QUERY_KEY });
        },
    });
}

interface RenamePlanLineVariables {
    lineId: string;
    payload: RenamePlanLinePayload;
}

export function useRenamePlanLineMutation(): UseMutationResult<PlanLine, Error, RenamePlanLineVariables> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ lineId, payload }: RenamePlanLineVariables) => client.renamePlanLine(lineId, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: PLAN_SECTIONS_QUERY_KEY });
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
        mutationFn: ({ lineId, payload }: MovePlanLineVariables) => client.movePlanLine(lineId, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: PLAN_SECTIONS_QUERY_KEY });
        },
    });
}

export function useDeletePlanLineMutation(): UseMutationResult<void, Error, string> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (lineId: string) => client.deletePlanLine(lineId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: PLAN_SECTIONS_QUERY_KEY });
        },
    });
}

export function useCreatePlanSectionMutation(): UseMutationResult<PlanSection, Error, CreatePlanSectionPayload> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreatePlanSectionPayload) => await client.createPlanSection(payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: PLAN_SECTIONS_QUERY_KEY });
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
        mutationFn: async ({ sectionId, payload }: UpdatePlanSectionVariables) =>
            await client.updatePlanSection(sectionId, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: PLAN_SECTIONS_QUERY_KEY });
        },
    });
}

export function useDeletePlanSectionMutation(): UseMutationResult<void, Error, string> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (sectionId: string) => await client.deletePlanSection(sectionId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: PLAN_SECTIONS_QUERY_KEY });
        },
    });
}
