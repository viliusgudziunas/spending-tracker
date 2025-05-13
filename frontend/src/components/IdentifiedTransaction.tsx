import { useState } from "react";
import unlink_icon from "../assets/unlink-icon.png";
import useReports from "../hooks/useReports";
import { ReportFilter } from "../services/reports/api.types.parsed";

export interface IdentifiedTransactionProps {
    filter: ReportFilter;
}

const IdentifiedTransaction: React.FC<IdentifiedTransactionProps> = ({ filter }) => {
    const store = useReports();
    const [expanded, setExpanded] = useState(false);

    const handleRemoveFromReportLine = async (transactionId: string): Promise<void> => {
        if (store.state.selectedReport === null) return;

        try {
            await store.actions.removeFromReportLine(transactionId);
            const report = await store.actions.fetchReport(store.state.selectedReport.id);
            store.actions.selectReport(report);
        } catch (error) {
            console.error("Error removing transaction from report line:", error);
        }
    };

    return (
        <>
            <tr key={filter.id}>
                <td>{(-parseFloat(filter.amount)).toString()}</td>
                <td>{filter.name}</td>
                <td style={{ textAlign: "center" }}>
                    <button onClick={() => setExpanded(!expanded)} style={{ cursor: "pointer" }}>
                        ...
                    </button>
                </td>
            </tr>
            {expanded && (
                <tr>
                    <td colSpan={3} style={{ padding: 0 }}>
                        <div style={{ width: "100%", overflowX: "auto" }}>
                            <table style={{ width: "max-content", minWidth: "100%" }}>
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th>Amount</th>
                                        <th>Started Date</th>
                                        <th>Completed Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filter.transactions.map((transaction) => {
                                        const isOverride = transaction.source === "override";
                                        return (
                                            <tr
                                                key={transaction.id}
                                                style={{ backgroundColor: isOverride ? "teal" : "lightgray" }}
                                            >
                                                <td>{transaction.description}</td>
                                                <td>{transaction.amount}</td>
                                                <td>{transaction.startedDate}</td>
                                                <td>{transaction.completedDate || "N/A"}</td>
                                                <td style={{ padding: 0 }}>
                                                    {isOverride && (
                                                        <button
                                                            style={{ width: "30px", padding: 0, display: "flex" }}
                                                            onClick={() => handleRemoveFromReportLine(transaction.id)}
                                                        >
                                                            <img
                                                                src={unlink_icon}
                                                                alt="Unlink Icon"
                                                                style={{ width: "100%" }}
                                                            />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
};

export default IdentifiedTransaction;
