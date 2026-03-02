import { UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query";
import { Report } from "./api.types.parsed";
import reportsApi, { CreateReportPayload } from "./apiService";

export const REPORTS_QUERY_KEY = ["reports"] as const;

export function useCreateReportMutation(): UseMutationResult<Report, Error, CreateReportPayload> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateReportPayload) => await reportsApi.createReport(payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: REPORTS_QUERY_KEY });
        },
    });
}
