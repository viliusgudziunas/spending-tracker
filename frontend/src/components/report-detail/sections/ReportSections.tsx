import { type ReportFilter, type ReportFull, type Transaction } from "@/clients/backendClient/responseParsers";

import CategorySection from "./CategorySection";
import UnidentifiedSection from "./UnidentifiedSection";

interface ReportSectionsProps {
    report: ReportFull;
    onFilterClick: (filter: ReportFilter) => void;
    onCreateRuleFilter: (transaction: Transaction) => void;
    onCreateReportFilter: (transaction: Transaction) => void;
    onAddToRuleGroup: (transaction: Transaction) => void;
    onAddToReportFilter: (transaction: Transaction) => void;
    selectedFilterId: string | null;
}

export default function ReportSections({
    report,
    onFilterClick,
    onCreateRuleFilter,
    onCreateReportFilter,
    onAddToRuleGroup,
    onAddToReportFilter,
    selectedFilterId,
}: ReportSectionsProps): JSX.Element {
    const hasCategories = report.categories.length > 0;
    const hasUnidentified = report.unidentifiedTransactions.length > 0;

    if (!hasCategories && !hasUnidentified) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <p className="m-0 text-sm text-slate-400">No transactions in this report yet.</p>
            </div>
        );
    }

    return (
        <>
            {report.categories.map((category) => (
                <CategorySection
                    key={category.id}
                    category={category}
                    onFilterClick={onFilterClick}
                    selectedFilterId={selectedFilterId}
                />
            ))}

            {hasUnidentified ? (
                <UnidentifiedSection
                    transactions={report.unidentifiedTransactions}
                    onCreateRuleFilter={onCreateRuleFilter}
                    onCreateReportFilter={onCreateReportFilter}
                    onAddToRuleGroup={onAddToRuleGroup}
                    onAddToReportFilter={onAddToReportFilter}
                />
            ) : null}
        </>
    );
}
