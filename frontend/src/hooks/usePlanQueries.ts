import {
    useMutation,
    type UseMutationResult,
    useQuery,
    useQueryClient,
    type UseQueryResult,
} from "@tanstack/react-query";

import { type PlanSection } from "@/clients/backendClient/responseParsers";
import { type CreatePlanSectionPayload, type UpdatePlanSectionPayload } from "@/clients/backendClient/types";
import { client } from "@/shared/stores/client";

export const PLAN_SECTIONS_QUERY_KEY = ["plan", "sections"] as const;

export function usePlanSectionsQuery(): UseQueryResult<PlanSection[]> {
    return useQuery({
        queryKey: PLAN_SECTIONS_QUERY_KEY,
        queryFn: () => client.fetchPlanSections(),
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
