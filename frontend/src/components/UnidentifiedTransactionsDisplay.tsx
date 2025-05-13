import useModal from "../hooks/useModal";
import { Transaction } from "../services/reports/api.types.parsed";
import AddToFilterModal from "./AddToFilterModal";
import AddToReportLineModal from "./AddToReportLineModal";
import CreateFilterModal from "./CreateFilterModal";

export interface UnidentifiedTransactionsDisplayProps {
    transactions: Transaction[];
}

const UnidentifiedTransactionsDisplay: React.FC<UnidentifiedTransactionsDisplayProps> = ({ transactions }) => {
    const modalStore = useModal();

    return (
        <div>
            <h1>Unidentified</h1>
            <table>
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
                    {transactions.map((transaction) => (
                        <tr key={transaction.id}>
                            <td>{transaction.description}</td>
                            <td>{transaction.amount}</td>
                            <td>{transaction.startedDate}</td>
                            <td>{transaction.completedDate || "N/A"}</td>
                            <td>
                                <button
                                    style={{ marginRight: "5px", padding: "5px 10px", cursor: "pointer" }}
                                    onClick={() =>
                                        modalStore.actions.showModal(<CreateFilterModal transaction={transaction} />)
                                    }
                                >
                                    Create Filter
                                </button>
                                <button
                                    style={{ marginRight: "5px", padding: "5px 10px", cursor: "pointer" }}
                                    onClick={() =>
                                        modalStore.actions.showModal(<AddToFilterModal transaction={transaction} />)
                                    }
                                >
                                    Add to Filter
                                </button>
                                <button
                                    style={{ marginRight: "5px", padding: "5px 10px", cursor: "pointer" }}
                                    onClick={() =>
                                        modalStore.actions.showModal(<AddToReportLineModal transaction={transaction} />)
                                    }
                                >
                                    Add to Report Line
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default UnidentifiedTransactionsDisplay;
