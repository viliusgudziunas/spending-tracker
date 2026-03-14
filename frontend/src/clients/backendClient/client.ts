import { AxiosError, AxiosInstance } from "axios";
import { createAxiosClient } from "../createAxiosClient";
import {
    Category,
    Filter,
    parseApiReport,
    parseApiReportManualFilter,
    parseApiReports,
    parseApiCategories,
    parseApiCategory,
    parseApiFilter,
    Report,
    ReportFull,
    ReportManualFilter,
    ReportSchema,
} from "./responseParsers";
import {
    parseIntoCreateApiFilterPayload,
    parseIntoPutApiFilterRuleGroupsPayload,
    parseIntoUpdateApiFilterPayload,
} from "./requestMappers";
import {
    CreateCategoryPayload,
    CreateFilterPayload,
    CreateReportManualFilterPayload,
    CreateReportPayload,
    PutFilterRuleGroupsPayload,
    PutReportAssignmentPayload,
    UpdateCategoryPayload,
    UpdateFilterPayload,
    UpdateFilterPositionPayload,
} from "./types";

function parseAxiosError(error: unknown, fallbackMessage: string): Error {
    if (!(error instanceof AxiosError)) {
        return new Error(fallbackMessage);
    }

    if (error.response === undefined) {
        return new Error("Cannot connect to backend. Is the backend server running?");
    }

    const detail =
        typeof error.response.data === "object" &&
        error.response.data !== null &&
        "detail" in error.response.data &&
        typeof error.response.data.detail === "string"
            ? error.response.data.detail
            : fallbackMessage;

    return new Error(detail);
}

class BackendClient {
    constructor(private readonly http: AxiosInstance) {}

    async fetchReports(): Promise<Report[]> {
        const response = await this.http.get("/reports");
        return parseApiReports(response.data);
    }

    async createReport(payload: CreateReportPayload): Promise<Report> {
        const formData = new FormData();
        formData.append("file", payload.bankStatement);
        formData.append("name", payload.name);

        try {
            const response = await this.http.post("/reports", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return ReportSchema.parse(response.data);
        } catch (error: unknown) {
            throw parseAxiosError(error, "Request failed while creating report.");
        }
    }

    async fetchReport(reportId: string): Promise<ReportFull> {
        const response = await this.http.get(`/reports/${reportId}`);
        return parseApiReport(response.data);
    }

    async generateReport(reportId: string): Promise<ReportFull> {
        const response = await this.http.post(`/reports/${reportId}/generate`);
        return parseApiReport(response.data);
    }

    async deleteReport(reportId: string): Promise<void> {
        try {
            await this.http.delete(`/reports/${reportId}`);
        } catch (error: unknown) {
            throw parseAxiosError(error, "Request failed while deleting report.");
        }
    }

    async createReportManualFilter(
        reportId: string,
        payload: CreateReportManualFilterPayload,
    ): Promise<ReportManualFilter> {
        const response = await this.http.post(`/reports/${reportId}/manual-filters`, {
            name: payload.name,
            category_id: payload.categoryId,
            position: payload.position,
        });
        return parseApiReportManualFilter(response.data);
    }

    async assignReportTransaction(
        reportId: string,
        transactionId: string,
        payload: PutReportAssignmentPayload,
    ): Promise<ReportFull> {
        const response = await this.http.put(`/reports/${reportId}/transactions/${transactionId}/assignment`, {
            target_rule_filter_id: payload.targetRuleFilterId,
            target_report_filter_id: payload.targetReportFilterId,
        });
        return parseApiReport(response.data);
    }

    async createCategory(payload: CreateCategoryPayload): Promise<Category> {
        const response = await this.http.post("/categories", payload);
        return parseApiCategory(response.data);
    }

    async updateCategory(categoryId: string, payload: UpdateCategoryPayload): Promise<Category> {
        const response = await this.http.patch(`/categories/${categoryId}`, payload);
        return parseApiCategory(response.data);
    }

    async fetchCategories(): Promise<Category[]> {
        const response = await this.http.get("/categories");
        return parseApiCategories(response.data);
    }

    async createFilter(payload: CreateFilterPayload): Promise<Filter> {
        const response = await this.http.post("/filters", parseIntoCreateApiFilterPayload(payload));
        return parseApiFilter(response.data);
    }

    async updateFilter(filterId: string, payload: UpdateFilterPayload): Promise<Filter> {
        const response = await this.http.put(`/filters/${filterId}`, parseIntoUpdateApiFilterPayload(payload));
        return parseApiFilter(response.data);
    }

    async updateFilterPosition(filterId: string, payload: UpdateFilterPositionPayload): Promise<Filter> {
        const response = await this.http.patch(`/filters/${filterId}`, payload);
        return parseApiFilter(response.data);
    }

    async deleteFilter(filterId: string): Promise<void> {
        await this.http.delete(`/filters/${filterId}`);
    }

    async putFilterRuleGroups(filterId: string, payload: PutFilterRuleGroupsPayload): Promise<Filter> {
        const response = await this.http.put(
            `/filters/${filterId}/rule-groups`,
            parseIntoPutApiFilterRuleGroupsPayload(payload),
        );
        return parseApiFilter(response.data);
    }
}

export function createBackendClient(baseUrl: string): BackendClient {
    return new BackendClient(createAxiosClient(baseUrl));
}
