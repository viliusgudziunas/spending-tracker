import { UseMutationResult, UseQueryResult, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Report, ReportFull, ReportManualFilter } from "../clients/backendClient/responseParsers";
import { client } from "../shared/stores/client";
import {
    PatchReportPayload,
    CreateReportManualFilterPayload,
    CreateReportPayload,
    PutReportAssignmentPayload,
} from "../clients/backendClient/types";

export const REPORTS_QUERY_KEY = ["reports"] as const;

export function useReportsQuery(): UseQueryResult<Report[]> {
    return useQuery({
        queryKey: REPORTS_QUERY_KEY,
        queryFn: () => client.fetchReports(),
    });
}

export function useReportQuery(reportId: string): UseQueryResult<ReportFull> {
    return useQuery({
        queryKey: [...REPORTS_QUERY_KEY, reportId],
        queryFn: async () => await client.fetchReport(reportId),
    });
}

export function useCreateReportMutation(): UseMutationResult<Report, Error, CreateReportPayload> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateReportPayload) => await client.createReport(payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: REPORTS_QUERY_KEY });
        },
    });
}

export function useGenerateReportMutation(): UseMutationResult<ReportFull, Error, string> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (reportId: string) => await client.generateReport(reportId),
        onSuccess: async (_data, reportId) => {
            await queryClient.invalidateQueries({ queryKey: [...REPORTS_QUERY_KEY, reportId] });
        },
    });
}

export function useDeleteReportMutation(): UseMutationResult<void, Error, string> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (reportId: string) => await client.deleteReport(reportId),
        onSuccess: async (_data, reportId) => {
            await queryClient.invalidateQueries({ queryKey: REPORTS_QUERY_KEY });
            queryClient.removeQueries({ queryKey: [...REPORTS_QUERY_KEY, reportId] });
        },
    });
}

interface PatchReportVariables {
    reportId: string;
    payload: PatchReportPayload;
}

export function usePatchReportMutation(): UseMutationResult<Report, Error, PatchReportVariables> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ reportId, payload }: PatchReportVariables) => await client.patchReport(reportId, payload),
        onSuccess: async (_data, { reportId }) => {
            await queryClient.invalidateQueries({ queryKey: REPORTS_QUERY_KEY });
            await queryClient.invalidateQueries({ queryKey: [...REPORTS_QUERY_KEY, reportId] });
        },
    });
}

interface CreateReportManualFilterVariables {
    reportId: string;
    payload: CreateReportManualFilterPayload;
}

export function useCreateReportManualFilterMutation(): UseMutationResult<
    ReportManualFilter,
    Error,
    CreateReportManualFilterVariables
> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ reportId, payload }: CreateReportManualFilterVariables) =>
            await client.createReportManualFilter(reportId, payload),
        onSuccess: async (_data, { reportId }) => {
            await queryClient.invalidateQueries({ queryKey: [...REPORTS_QUERY_KEY, reportId] });
        },
    });
}

interface AssignReportTransactionVariables {
    reportId: string;
    transactionId: string;
    payload: PutReportAssignmentPayload;
}

export function useAssignReportTransactionMutation(): UseMutationResult<
    ReportFull,
    Error,
    AssignReportTransactionVariables
> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ reportId, transactionId, payload }: AssignReportTransactionVariables) =>
            await client.assignReportTransaction(reportId, transactionId, payload),
        onSuccess: async (_data, { reportId }) => {
            await queryClient.invalidateQueries({ queryKey: [...REPORTS_QUERY_KEY, reportId] });
        },
    });
}

interface RemoveReportTransactionAssignmentVariables {
    reportId: string;
    transactionId: string;
}

export function useRemoveReportTransactionAssignmentMutation(): UseMutationResult<
    ReportFull,
    Error,
    RemoveReportTransactionAssignmentVariables
> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ reportId, transactionId }: RemoveReportTransactionAssignmentVariables) =>
            await client.removeReportTransactionAssignment(reportId, transactionId),
        onSuccess: async (_data, { reportId }) => {
            await queryClient.invalidateQueries({ queryKey: [...REPORTS_QUERY_KEY, reportId] });
        },
    });
}
