import { type CellContextMenuEvent, type ColDef, themeQuartz } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ReportFilter, Transaction } from "../../../clients/backendClient/responseParsers";
import { getContextMenuPosition } from "../contextMenu";
import { TRANSACTION_COLUMNS, getTransactionRowClass } from "../constants";

interface TransactionPanelProps {
    filter: ReportFilter;
    onClose: () => void;
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
    onRemoveManualAssignment,
    isRemovingManualAssignment,
    width,
}: TransactionPanelProps): JSX.Element {
    const contextMenuRef = useRef<HTMLDivElement | null>(null);
    const [contextMenuState, setContextMenuState] = useState<ContextMenuState | null>(null);
    const [contextMenuPosition, setContextMenuPosition] = useState<{ left: number; top: number } | null>(null);

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

    useEffect(() => {
        if (contextMenuState === null) return;
        const handleOutsideClick = (event: MouseEvent): void => {
            const target = event.target as Node;
            if (contextMenuRef.current?.contains(target)) return;
            setContextMenuState(null);
        };
        const handleEscape = (event: KeyboardEvent): void => {
            if (event.key !== "Escape") return;
            setContextMenuState(null);
        };
        window.addEventListener("mousedown", handleOutsideClick);
        window.addEventListener("keydown", handleEscape);
        return (): void => {
            window.removeEventListener("mousedown", handleOutsideClick);
            window.removeEventListener("keydown", handleEscape);
        };
    }, [contextMenuState]);

    useLayoutEffect(() => {
        if (contextMenuState === null) {
            setContextMenuPosition(null);
            return;
        }
        const menu = contextMenuRef.current;
        if (menu === null) return;

        const rect = menu.getBoundingClientRect();
        setContextMenuPosition(
            getContextMenuPosition({
                anchorX: contextMenuState.x,
                anchorY: contextMenuState.y,
                menuWidth: rect.width,
                menuHeight: rect.height,
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight,
            }),
        );
    }, [contextMenuState]);

    const handleCellContextMenu = useCallback((event: CellContextMenuEvent<Transaction>): void => {
        const transaction = event.data;
        if (transaction === undefined || transaction.source !== "manual") {
            setContextMenuState(null);
            return;
        }

        const mouseEvent = event.event as MouseEvent | undefined;
        mouseEvent?.preventDefault();
        setContextMenuState({
            transaction,
            x: mouseEvent?.clientX ?? 0,
            y: mouseEvent?.clientY ?? 0,
        });
    }, []);

    const closeContextMenu = useCallback((): void => {
        setContextMenuState(null);
    }, []);

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
                <div
                    ref={contextMenuRef}
                    className="fixed z-50 min-w-[220px] rounded-md border border-slate-200 bg-white p-1 shadow-xl"
                    style={{
                        left: contextMenuPosition?.left ?? contextMenuState.x,
                        top: contextMenuPosition?.top ?? contextMenuState.y,
                    }}
                >
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
                </div>
            ) : null}
        </div>
    );
}
