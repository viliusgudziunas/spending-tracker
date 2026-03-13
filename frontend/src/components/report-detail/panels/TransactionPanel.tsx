import { type ColDef, themeQuartz } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useMemo } from "react";
import { ReportFilter, Transaction } from "../../../clients/backendClient/responseParsers";
import { TRANSACTION_COLUMNS } from "../constants";

interface TransactionPanelProps {
    filter: ReportFilter;
    onClose: () => void;
    width: number;
}

export default function TransactionPanel({ filter, onClose, width }: TransactionPanelProps): JSX.Element {
    const defaultColDef = useMemo<ColDef<Transaction>>(
        () => ({
            resizable: false,
            sortable: true,
            filter: true,
        }),
        [],
    );

    return (
        <div className="sticky top-4 flex shrink-0 flex-col gap-3 self-start" style={{ width }}>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="min-w-0">
                    <h2 className="m-0 truncate text-lg font-semibold text-slate-900">{filter.name}</h2>
                    <p className="m-0 mt-0.5 text-xs text-slate-400">
                        {filter.transactions.length} transaction{filter.transactions.length !== 1 ? "s" : ""}
                        {" \u00b7 "}
                        {filter.amount}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                    &#x2715;
                </button>
            </div>

            {filter.transactions.length > 0 ? (
                <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <AgGridReact<Transaction>
                        theme={themeQuartz}
                        columnDefs={TRANSACTION_COLUMNS}
                        rowData={filter.transactions}
                        defaultColDef={defaultColDef}
                        domLayout="autoHeight"
                        enableCellTextSelection={true}
                        ensureDomOrder={true}
                    />
                </div>
            ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                    <p className="m-0 text-sm text-slate-400">No transactions.</p>
                </div>
            )}
        </div>
    );
}
