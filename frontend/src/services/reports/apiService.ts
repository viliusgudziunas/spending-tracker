import axios from "axios";
import { API_URL } from "../../config";
import { parseApiReport } from "./api.parser";
import { Report, ReportFull } from "./api.types.parsed";

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
    if (!API_URL) {
        throw new Error("API URL is not configured. Set VITE_API_URL in frontend env.");
    }

    const formData = new FormData();
    formData.append("file", payload.bankStatement);
    formData.append("name", payload.name);

    try {
        const response = await axios.post(`${API_URL}/reports`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    } catch (error: unknown) {
        console.error("Error creating report:", error);
        if (axios.isAxiosError(error)) {
            if (!error.response) {
                throw new Error(`Cannot connect to backend at ${API_URL}. Is the backend server running?`);
            }
            const detail =
                typeof error.response?.data?.detail === "string"
                    ? error.response.data.detail
                    : "Request failed while creating report.";
            throw new Error(detail);
        }
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

export default {
    createReport,
    fetchReport,
    fetchReports,
    generateReport,
};
