import { type CellContextMenuEvent, type ColDef, themeQuartz } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useMemo, useState } from "react";

import { type ReportFilter, type Transaction } from "@/clients/backendClient/responseParsers";
import AnchoredMenu from "@/components/report-detail/AnchoredMenu";
import { getTransactionRowClass, isManualSource, TRANSACTION_COLUMNS } from "@/components/report-detail/constants";

interface TransactionPanelProps {
    filter: ReportFilter;
    onClose: () => void;
    onMoveToAnotherFilter?: (transaction: Transaction) => void;
    onRemoveManualAssignment: (transaction: Transaction) => Promise<void>;
    isRemovingManualAssignment: boolean;
    width: number;
}

interface ContextMenuState {
    transaction: Transaction;
    x: number;
    y: number;
}

export default function TransactionPanel({
    filter,
    onClose,
    onMoveToAnotherFilter,
    onRemoveManualAssignment,
    isRemovingManualAssignment,
    width,
}: TransactionPanelProps): JSX.Element {
    const [contextMenuState, setContextMenuState] = useState<ContextMenuState | null>(null);

    const defaultColDef = useMemo<ColDef<Transaction>>(
        () => ({
            resizable: false,
            sortable: true,
            filter: true,
        }),
        [],
    );
    const getRowClass = useCallback(
        (params: { data: Transaction | undefined }): string => getTransactionRowClass(params.data?.source),
        [],
    );

    const handleCellContextMenu = useCallback(
        (event: CellContextMenuEvent<Transaction>): void => {
            const transaction = event.data;
            if (transaction === undefined) {
                setContextMenuState(null);
                return;
            }

            const mouseEvent = event.event as MouseEvent | undefined;
            mouseEvent?.preventDefault();
            if (onMoveToAnotherFilter === undefined && !isManualSource(transaction.source)) {
                setContextMenuState(null);
                return;
            }
            setContextMenuState({
                transaction,
                x: mouseEvent?.clientX ?? 0,
                y: mouseEvent?.clientY ?? 0,
            });
        },
        [onMoveToAnotherFilter],
    );

    const closeContextMenu = useCallback((): void => {
        setContextMenuState(null);
    }, []);

    const hasRowActions =
        filter.transactions.length > 0 &&
        (onMoveToAnotherFilter !== undefined ||
            filter.transactions.some((transaction) => isManualSource(transaction.source)));

    return (
        <div
            className="sticky top-4 flex shrink-0 flex-col gap-3 self-start"
            style={{ width }}
            onContextMenu={(event): void => event.preventDefault()}
        >
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="min-w-0">
                    <h2 className="m-0 truncate text-lg font-semibold text-slate-900">{filter.name}</h2>
                    <p className="m-0 mt-0.5 text-xs text-slate-400">
                        {filter.transactions.length} transaction{filter.transactions.length !== 1 ? "s" : ""}
                        {" \u00b7 "}
                        {filter.amount}
                    </p>
                    {hasRowActions ? (
                        <p className="m-0 mt-0.5 text-xs text-slate-500">Right-click a row to open quick actions.</p>
                    ) : null}
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
                <div className="transaction-panel-scroll-area max-h-[calc(100vh-8rem)] overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="w-full">
                        <AgGridReact<Transaction>
                            theme={themeQuartz}
                            columnDefs={TRANSACTION_COLUMNS}
                            rowData={filter.transactions}
                            defaultColDef={defaultColDef}
                            onCellContextMenu={handleCellContextMenu}
                            onCellClicked={closeContextMenu}
                            getRowClass={getRowClass}
                            domLayout="autoHeight"
                            enableCellTextSelection={true}
                            ensureDomOrder={true}
                        />
                    </div>
                </div>
            ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                    <p className="m-0 text-sm text-slate-400">No transactions.</p>
                </div>
            )}
            {contextMenuState !== null ? (
                <AnchoredMenu x={contextMenuState.x} y={contextMenuState.y} onClose={closeContextMenu}>
                    {onMoveToAnotherFilter !== undefined ? (
                        <button
                            type="button"
                            className="block w-full rounded px-2 py-1.5 text-left text-xs text-slate-700 transition hover:bg-slate-50"
                            onClick={(): void => {
                                onMoveToAnotherFilter(contextMenuState.transaction);
                                closeContextMenu();
                            }}
                        >
                            Move to another filter
                        </button>
                    ) : null}
                    {isManualSource(contextMenuState.transaction.source) ? (
                        <button
                            type="button"
                            disabled={isRemovingManualAssignment}
                            className="block w-full rounded px-2 py-1.5 text-left text-xs text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={(): void => {
                                void onRemoveManualAssignment(contextMenuState.transaction);
                                closeContextMenu();
                            }}
                        >
                            Remove manual assignment
                        </button>
                    ) : null}
                </AnchoredMenu>
            ) : null}
        </div>
    );
}
