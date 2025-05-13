import axios from "axios";
import { API_URL } from "../../config";
import { parseApiOverride, parseApiReport } from "./api.parser";
import { Override, Report, ReportFull } from "./api.types.parsed";
import { parseIntoCreateOverridePayload } from "./apiService.parser";

const fetchReports = async (): Promise<Report[]> => {
    try {
        const response = await axios.get(`${API_URL}/reports`);
        return response.data;
    } catch (error) {
        console.error("Error fetching reports:", error);
        throw error;
    }
};

export interface CreateReportPayload {
    bankStatement: File;
    name: string;
}

const createReport = async (payload: CreateReportPayload): Promise<Report> => {
    const formData = new FormData();
    formData.append("file", payload.bankStatement);
    formData.append("name", payload.name);

    try {
        const response = await axios.post(`${API_URL}/reports`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    } catch (error) {
        console.error("Error creating report:", error);
        throw error;
    }
};

const fetchReport = async (reportId: string): Promise<ReportFull> => {
    try {
        const response = await axios.get(`${API_URL}/reports/${reportId}`);
        return parseApiReport(response.data);
    } catch (error) {
        console.error("Error fetching report:", error);
        throw error;
    }
};

const generateReport = async (reportId: string): Promise<ReportFull> => {
    try {
        const response = await axios.post(`${API_URL}/reports/${reportId}/generate`);
        return parseApiReport(response.data);
    } catch (error) {
        console.error("Error generating report:", error);
        throw error;
    }
};

interface AlterToReportLinePayload {
    filterId: string;
    transactionId: string;
}

export interface CreateOverridePayload {
    filterId: string;
    transactionId: string;
}

const createOverride = async (payload: AlterToReportLinePayload): Promise<Override> => {
    try {
        const parsedPayload = parseIntoCreateOverridePayload(payload);
        const response = await axios.post(`${API_URL}/overrides`, parsedPayload);
        return parseApiOverride(response.data);
    } catch (error) {
        console.error("Error generating report:", error);
        throw error;
    }
};

const deleteOverride = async (transactionId: string): Promise<void> => {
    try {
        await axios.delete(`${API_URL}/overrides/${transactionId}`);
    } catch (error) {
        console.error("Error deleting override:", error);
        throw error;
    }
};

export default {
    createOverride,
    createReport,
    fetchReport,
    fetchReports,
    generateReport,
    deleteOverride,
};
