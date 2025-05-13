import useReports from "../hooks/useReports";
import IdentifiedTransactionsDisplay from "./IdentifiedTransactionsDisplay";
import UnidentifiedTransactionsDisplay from "./UnidentifiedTransactionsDisplay";

const MainSection: React.FC = () => {
    const reportsStore = useReports();

    if (!reportsStore.state.selectedReport) {
        return <div>Select a report</div>;
    }

    return (
        <>
            <h1>Report {reportsStore.state.selectedReport.name}</h1>
            <IdentifiedTransactionsDisplay categories={reportsStore.state.selectedReport.categories} />
            <UnidentifiedTransactionsDisplay
                transactions={reportsStore.state.selectedReport.unidentifiedTransactions}
            />
        </>
    );
};

export default MainSection;
