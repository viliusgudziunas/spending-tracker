import { ReportCategory } from "../services/reports/api.types.parsed";
import IdentifiedTransaction from "./IdentifiedTransaction";

interface IdentifiedTransactionsDisplayProps {
    categories: ReportCategory[];
}

const IdentifiedTransactionsDisplay: React.FC<IdentifiedTransactionsDisplayProps> = ({ categories }) => {
    return (
        <>
            {categories.map((category) => (
                <div key={category.id}>
                    <h1>{category.name}</h1>
                    <table style={{ width: "278px" }}>
                        <colgroup>
                            <col style={{ width: "67px" }} />
                            <col style={{ width: "211px" }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th>Amount</th>
                                <th>Description</th>
                                <th>Expand</th>
                            </tr>
                        </thead>
                        <tbody>
                            {category.filters
                                .filter((filter) => filter.transactions.length > 0)
                                .map((filter) => (
                                    <IdentifiedTransaction key={filter.id} filter={filter} />
                                ))}
                        </tbody>
                    </table>
                </div>
            ))}
        </>
    );
};

export default IdentifiedTransactionsDisplay;
