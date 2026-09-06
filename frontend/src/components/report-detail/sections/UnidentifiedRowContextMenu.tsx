import { type Transaction } from "@/clients/backendClient/responseParsers";
import AnchoredMenu from "@/components/report-detail/AnchoredMenu";

interface UnidentifiedRowContextMenuProps {
    transaction: Transaction;
    x: number;
    y: number;
    onClose: () => void;
    onCreateRuleFilter: (transaction: Transaction) => void;
    onCreateReportFilter: (transaction: Transaction) => void;
    onAddToRuleGroup: (transaction: Transaction) => void;
    onAddToReportFilter: (transaction: Transaction) => void;
}

export default function UnidentifiedRowContextMenu({
    transaction,
    x,
    y,
    onClose,
    onCreateRuleFilter,
    onCreateReportFilter,
    onAddToRuleGroup,
    onAddToReportFilter,
}: UnidentifiedRowContextMenuProps): JSX.Element {
    return (
        <AnchoredMenu x={x} y={y} onClose={onClose}>
            <button
                type="button"
                className="block w-full rounded px-2 py-1.5 text-left text-xs text-slate-700 transition hover:bg-slate-50"
                onClick={(): void => {
                    onCreateRuleFilter(transaction);
                    onClose();
                }}
            >
                Create new rule
            </button>
            <button
                type="button"
                className="block w-full rounded px-2 py-1.5 text-left text-xs text-slate-700 transition hover:bg-slate-50"
                onClick={(): void => {
                    onAddToRuleGroup(transaction);
                    onClose();
                }}
            >
                Update existing rule
            </button>
            <button
                type="button"
                className="block w-full rounded px-2 py-1.5 text-left text-xs text-slate-700 transition hover:bg-slate-50"
                onClick={(): void => {
                    onCreateReportFilter(transaction);
                    onClose();
                }}
            >
                Create one-time rule
            </button>
            <button
                type="button"
                className="block w-full rounded px-2 py-1.5 text-left text-xs text-slate-700 transition hover:bg-slate-50"
                onClick={(): void => {
                    onAddToReportFilter(transaction);
                    onClose();
                }}
            >
                Assign to existing rule
            </button>
        </AnchoredMenu>
    );
}
