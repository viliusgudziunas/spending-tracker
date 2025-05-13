import { useEffect } from "react";
import useModal from "../hooks/useModal";
import useReports from "../hooks/useReports";
import CreateReportModal from "./CreateReportModal";

const Reports: React.FC = () => {
    const reportsStore = useReports();
    const modalStore = useModal();

    useEffect(() => {
        const _fetchReports = async (): Promise<void> => await reportsStore.actions.fetchReports();

        _fetchReports();
    }, []);

    const createReport = (): void => modalStore.actions.showModal(<CreateReportModal />);

    const selectReport = async (id: string): Promise<void> => {
        const report = await reportsStore.actions.fetchReport(id);
        reportsStore.actions.selectReport(report);
    };

    const generateReport = async (id: string): Promise<void> => {
        const report = await reportsStore.actions.generateReport(id);
        reportsStore.actions.selectReport(report);
    };

    return (
        <div style={{ margin: "12px" }}>
            <h1>Reports</h1>
            <button onClick={createReport}>Create New Report</button>
            {reportsStore.state.reports.map((report) => (
                <div key={report.id} style={{ marginTop: "12px", padding: "12px", border: "1px solid black" }}>
                    <div>{report.name}</div>
                    <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
                        <button onClick={() => selectReport(report.id)}>Select</button>
                        <button onClick={() => generateReport(report.id)}>Generate</button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Reports;
