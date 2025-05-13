import { createContext, PropsWithChildren, useState } from "react";
import { Override, Report, ReportFull } from "../services/reports/api.types.parsed";
import reportsApi from "../services/reports/apiService";

interface CreateReportPayload {
    bankStatement: File;
    name: string;
}

interface AlterToReportLinePayload {
    filterId: string;
    transactionId: string;
}

export interface ReportsContextType {
    actions: {
        addToReportLine: (payload: AlterToReportLinePayload) => Promise<Override>;
        createReport: (payload: CreateReportPayload) => Promise<Report>;
        fetchReport: (id: string) => Promise<ReportFull>;
        fetchReports: () => Promise<void>;
        generateReport: (id: string) => Promise<ReportFull>;
        removeFromReportLine: (id: string) => Promise<void>;
        selectReport: (report: ReportFull) => void;
    };
    state: {
        reports: Report[];
        selectedReport: ReportFull | null;
    };
}

const defaultContext: ReportsContextType = {
    actions: {
        addToReportLine: async () => ({} as Override),
        createReport: async () => ({} as Report),
        fetchReport: async () => ({} as ReportFull),
        fetchReports: async () => {},
        generateReport: async () => ({} as ReportFull),
        removeFromReportLine: async () => {},
        selectReport: () => {},
    },
    state: {
        reports: [],
        selectedReport: null,
    },
};

export const ReportsContext = createContext<ReportsContextType>(defaultContext);

export const ReportsProvider: React.FC<PropsWithChildren> = ({ children }) => {
    const [reports, setReports] = useState<Report[]>([]);
    const [selectedReport, setSelectedReport] = useState<ReportFull | null>(null);

    const addToReportLine = async (payload: AlterToReportLinePayload): Promise<Override> =>
        await reportsApi.createOverride(payload);
    const createReport = async (payload: CreateReportPayload): Promise<Report> =>
        await reportsApi.createReport(payload);
    const fetchReport = async (id: string): Promise<ReportFull> => await reportsApi.fetchReport(id);
    const fetchReports = async (): Promise<void> => setReports(await reportsApi.fetchReports());
    const generateReport = async (id: string): Promise<ReportFull> => await reportsApi.generateReport(id);
    const removeFromReportLine = async (transactionId: string): Promise<void> =>
        await reportsApi.deleteOverride(transactionId);
    const selectReport = (report: ReportFull): void => setSelectedReport(report);

    return (
        <ReportsContext.Provider
            value={{
                actions: {
                    addToReportLine,
                    createReport,
                    fetchReport,
                    fetchReports,
                    generateReport,
                    removeFromReportLine,
                    selectReport,
                },
                state: {
                    reports,
                    selectedReport,
                },
            }}
        >
            {children}
        </ReportsContext.Provider>
    );
};
