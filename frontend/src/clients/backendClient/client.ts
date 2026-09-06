import { AxiosError, type AxiosInstance } from "axios";

import { createAxiosClient } from "@/clients/createAxiosClient";

import {
    parseIntoCreateApiFilterPayload,
    parseIntoPutApiFilterRuleGroupsPayload,
    parseIntoUpdateApiFilterPayload,
} from "./requestMappers";
import {
    type Category,
    type Filter,
    parseApiCategories,
    parseApiCategory,
    parseApiFilter,
    parseApiPlanSection,
    parseApiPlanSections,
    parseApiReport,
    parseApiReportManualFilter,
    parseApiReports,
    type PlanSection,
    type Report,
    type ReportFull,
    type ReportManualFilter,
    ReportSchema,
} from "./responseParsers";
import { ApiErrorSchema } from "./schemas";
import {
    type CreateCategoryPayload,
    type CreateFilterPayload,
    type CreatePlanSectionPayload,
    type CreateReportManualFilterPayload,
    type CreateReportPayload,
    type PatchReportPayload,
    type PutFilterRuleGroupsPayload,
    type PutReportAssignmentPayload,
    type RenameFilterPayload,
    type UpdateCategoryPayload,
    type UpdateFilterPayload,
    type UpdateFilterPositionPayload,
    type UpdatePlanSectionPayload,
} from "./types";

function parseAxiosError(error: unknown, fallbackMessage: string): Error {
    if (!(error instanceof AxiosError)) {
        return new Error(fallbackMessage);
    }

    if (error.response === undefined) {
        return new Error("Cannot connect to backend. Is the backend server running?");
    }

    const parsedError = ApiErrorSchema.safeParse(error.response.data);
    if (!parsedError.success) {
        return new Error(fallbackMessage);
    }

    const detail = parsedError.data.detail;
    return new Error(typeof detail === "string" ? detail : detail.map((item) => item.msg).join("; "));
}

class BackendClient {
    constructor(private readonly http: AxiosInstance) {}

    async fetchReports(): Promise<Report[]> {
        const response = await this.http.get("/reports");
        return parseApiReports(response.data);
    }

    async createReport(payload: CreateReportPayload): Promise<Report> {
        const formData = new FormData();
        formData.append("upload_file", payload.bankStatement);
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

    async patchReport(reportId: string, payload: PatchReportPayload): Promise<Report> {
        try {
            const response = await this.http.patch(`/reports/${reportId}`, {
                name: payload.name,
            });
            return ReportSchema.parse(response.data);
        } catch (error: unknown) {
            throw parseAxiosError(error, "Request failed while updating report.");
        }
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

    async removeReportTransactionAssignment(reportId: string, transactionId: string): Promise<ReportFull> {
        try {
            const response = await this.http.delete(`/reports/${reportId}/transactions/${transactionId}/assignment`);
            return parseApiReport(response.data);
        } catch (error: unknown) {
            throw parseAxiosError(error, "Request failed while removing manual assignment.");
        }
    }

    async createCategory(payload: CreateCategoryPayload): Promise<Category> {
        try {
            const response = await this.http.post("/categories", payload);
            return parseApiCategory(response.data);
        } catch (error: unknown) {
            throw parseAxiosError(error, "Request failed while creating category.");
        }
    }

    async updateCategory(categoryId: string, payload: UpdateCategoryPayload): Promise<Category> {
        try {
            const response = await this.http.patch(`/categories/${categoryId}`, payload);
            return parseApiCategory(response.data);
        } catch (error: unknown) {
            throw parseAxiosError(error, "Request failed while updating category.");
        }
    }

    async fetchCategories(): Promise<Category[]> {
        const response = await this.http.get("/categories");
        return parseApiCategories(response.data);
    }

    async fetchPlanSections(): Promise<PlanSection[]> {
        const response = await this.http.get("/plan/sections");
        return parseApiPlanSections(response.data);
    }

    async createPlanSection(payload: CreatePlanSectionPayload): Promise<PlanSection> {
        try {
            const response = await this.http.post("/plan/sections", {
                name: payload.name,
                is_income: payload.isIncome ?? false,
            });
            return parseApiPlanSection(response.data);
        } catch (error: unknown) {
            throw parseAxiosError(error, "Request failed while creating plan section.");
        }
    }

    async updatePlanSection(sectionId: string, payload: UpdatePlanSectionPayload): Promise<PlanSection> {
        try {
            const response = await this.http.patch(`/plan/sections/${sectionId}`, {
                name: payload.name,
                position: payload.position,
                is_income: payload.isIncome,
            });
            return parseApiPlanSection(response.data);
        } catch (error: unknown) {
            throw parseAxiosError(error, "Request failed while updating plan section.");
        }
    }

    async deletePlanSection(sectionId: string): Promise<void> {
        try {
            await this.http.delete(`/plan/sections/${sectionId}`);
        } catch (error: unknown) {
            throw parseAxiosError(error, "Request failed while deleting plan section.");
        }
    }

    async createFilter(payload: CreateFilterPayload): Promise<Filter> {
        try {
            const response = await this.http.post("/filters", parseIntoCreateApiFilterPayload(payload));
            return parseApiFilter(response.data);
        } catch (error: unknown) {
            throw parseAxiosError(error, "Request failed while creating filter.");
        }
    }

    async updateFilter(filterId: string, payload: UpdateFilterPayload): Promise<Filter> {
        try {
            const response = await this.http.put(`/filters/${filterId}`, parseIntoUpdateApiFilterPayload(payload));
            return parseApiFilter(response.data);
        } catch (error: unknown) {
            throw parseAxiosError(error, "Request failed while updating filter.");
        }
    }

    async renameFilter(filterId: string, payload: RenameFilterPayload): Promise<Filter> {
        try {
            const response = await this.http.patch(`/filters/${filterId}`, payload);
            return parseApiFilter(response.data);
        } catch (error: unknown) {
            throw parseAxiosError(error, "Request failed while renaming filter.");
        }
    }

    async updateFilterPosition(filterId: string, payload: UpdateFilterPositionPayload): Promise<Filter> {
        try {
            const response = await this.http.patch(`/filters/${filterId}`, payload);
            return parseApiFilter(response.data);
        } catch (error: unknown) {
            throw parseAxiosError(error, "Request failed while moving filter.");
        }
    }

    async deleteFilter(filterId: string): Promise<void> {
        try {
            await this.http.delete(`/filters/${filterId}`);
        } catch (error: unknown) {
            throw parseAxiosError(error, "Request failed while deleting filter.");
        }
    }

    async putFilterRuleGroups(filterId: string, payload: PutFilterRuleGroupsPayload): Promise<Filter> {
        try {
            const response = await this.http.put(
                `/filters/${filterId}/rule-groups`,
                parseIntoPutApiFilterRuleGroupsPayload(payload),
            );
            return parseApiFilter(response.data);
        } catch (error: unknown) {
            throw parseAxiosError(error, "Request failed while updating filter rules.");
        }
    }
}

export function createBackendClient(baseUrl: string): BackendClient {
    return new BackendClient(createAxiosClient(baseUrl));
}
