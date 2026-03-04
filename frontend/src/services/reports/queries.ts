import { UseMutationResult, UseQueryResult, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Report, ReportFull } from "./api.types.parsed";
import reportsApi, { CreateReportPayload } from "./apiService";

export const REPORTS_QUERY_KEY = ["reports"] as const;

export function useReportsQuery(): UseQueryResult<Report[]> {
    return useQuery({
        queryKey: REPORTS_QUERY_KEY,
        queryFn: reportsApi.fetchReports,
    });
}

export function useReportQuery(reportId: string): UseQueryResult<ReportFull> {
    return useQuery({
        queryKey: [...REPORTS_QUERY_KEY, reportId],
        queryFn: async () => await reportsApi.fetchReport(reportId),
    });
}

export function useCreateReportMutation(): UseMutationResult<Report, Error, CreateReportPayload> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateReportPayload) => await reportsApi.createReport(payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: REPORTS_QUERY_KEY });
        },
    });
}

export function useGenerateReportMutation(): UseMutationResult<ReportFull, Error, string> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (reportId: string) => await reportsApi.generateReport(reportId),
        onSuccess: async (_data, reportId) => {
            await queryClient.invalidateQueries({ queryKey: [...REPORTS_QUERY_KEY, reportId] });
        },
    });
}
