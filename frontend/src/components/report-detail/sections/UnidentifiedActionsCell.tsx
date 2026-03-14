import { Transaction } from "../../../clients/backendClient/responseParsers";

interface UnidentifiedActionsCellProps {
    transaction: Transaction;
    onCreateRuleFilter: (transaction: Transaction) => void;
    onCreateReportFilter: (transaction: Transaction) => void;
    onAddToRuleGroup: (transaction: Transaction) => void;
}

export default function UnidentifiedActionsCell({
    transaction,
    onCreateRuleFilter,
    onCreateReportFilter,
    onAddToRuleGroup,
}: UnidentifiedActionsCellProps): JSX.Element {
    return (
        <div className="flex h-full w-full items-center justify-center gap-1.5">
            <button
                type="button"
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={(event): void => {
                    event.stopPropagation();
                    onCreateRuleFilter(transaction);
                }}
            >
                Create rule filter
            </button>
            <button
                type="button"
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={(event): void => {
                    event.stopPropagation();
                    onCreateReportFilter(transaction);
                }}
            >
                Create report filter
            </button>
            <button
                type="button"
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={(event): void => {
                    event.stopPropagation();
                    onAddToRuleGroup(transaction);
                }}
            >
                Edit rule filter
            </button>
        </div>
    );
}
