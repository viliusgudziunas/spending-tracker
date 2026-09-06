import { type CellContextMenuEvent, type ColDef, themeQuartz } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { type Transaction } from "@/clients/backendClient/responseParsers";
import {
    getTransactionRowClass,
    TRANSACTION_COLUMNS,
    UNIDENTIFIED_COLUMNS_STATE_STORAGE_KEY,
} from "@/components/report-detail/constants";

import UnidentifiedInnerHeader from "./UnidentifiedInnerHeader";
import UnidentifiedRowContextMenu from "./UnidentifiedRowContextMenu";

interface UnidentifiedSectionProps {
    transactions: Transaction[];
    onCreateRuleFilter: (transaction: Transaction) => void;
    onCreateReportFilter: (transaction: Transaction) => void;
    onAddToRuleGroup: (transaction: Transaction) => void;
    onAddToReportFilter: (transaction: Transaction) => void;
}

interface ContextMenuState {
    transaction: Transaction;
    x: number;
    y: number;
}

export default function UnidentifiedSection({
    transactions,
    onCreateRuleFilter,
    onCreateReportFilter,
    onAddToRuleGroup,
    onAddToReportFilter,
}: UnidentifiedSectionProps): JSX.Element {
    const gridRef = useRef<AgGridReact<Transaction>>(null);
    const columnsMenuRef = useRef<HTMLDivElement | null>(null);
    const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
    const [contextMenuState, setContextMenuState] = useState<ContextMenuState | null>(null);

    const toggleableColumns = useMemo(
        () =>
            TRANSACTION_COLUMNS.filter((column) => typeof column.field === "string").map((column) => ({
                field: column.field as string,
                headerName: column.headerName ?? (column.field as string),
            })),
        [],
    );

    const syncColumnVisibility = useCallback((): void => {
        const api = gridRef.current?.api;
        if (api === undefined) return;

        const nextVisibility: Record<string, boolean> = {};
        toggleableColumns.forEach((column) => {
            const gridColumn = api.getColumn(column.field);
            nextVisibility[column.field] = gridColumn?.isVisible() ?? true;
        });
        setColumnVisibility(nextVisibility);
    }, [toggleableColumns]);

    const persistColumnsState = useCallback((): void => {
        if (typeof window === "undefined") return;
        const api = gridRef.current?.api;
        if (api === undefined) return;

        const allowedColIds = new Set(toggleableColumns.map((column) => column.field));
        const stateToPersist = api
            .getColumnState()
            .filter((columnState) => allowedColIds.has(columnState.colId))
            .map((columnState) => ({
                colId: columnState.colId,
                hide: columnState.hide ?? false,
            }));

        window.localStorage.setItem(UNIDENTIFIED_COLUMNS_STATE_STORAGE_KEY, JSON.stringify(stateToPersist));
    }, [toggleableColumns]);

    const restoreColumnsState = useCallback((): void => {
        if (typeof window === "undefined") return;
        const api = gridRef.current?.api;
        if (api === undefined) return;

        const rawState = window.localStorage.getItem(UNIDENTIFIED_COLUMNS_STATE_STORAGE_KEY);
        if (rawState === null) return;

        try {
            const parsedState: unknown = JSON.parse(rawState);
            if (!Array.isArray(parsedState)) return;

            const validState = parsedState
                .filter(
                    (item): item is { colId: string; hide?: boolean } =>
                        typeof item === "object" &&
                        item !== null &&
                        "colId" in item &&
                        typeof (item as { colId: unknown }).colId === "string" &&
                        (!("hide" in item) || typeof (item as { hide: unknown }).hide === "boolean"),
                )
                .map((item) => ({ colId: item.colId, hide: item.hide ?? false }));

            if (validState.length === 0) return;
            api.applyColumnState({ state: validState, applyOrder: true });
        } catch {
            // Ignore malformed local storage state and fallback to default order.
        }
    }, []);

    const handleOpenColumnsMenu = useCallback((): void => {
        syncColumnVisibility();
        setIsColumnsMenuOpen((open) => !open);
    }, [syncColumnVisibility]);

    const toggleColumnVisibility = useCallback(
        (field: string): void => {
            const api = gridRef.current?.api;
            if (api === undefined) return;
            const gridColumn = api.getColumn(field);
            if (gridColumn === null) return;

            api.setColumnsVisible([field], !gridColumn.isVisible());
            syncColumnVisibility();
        },
        [syncColumnVisibility],
    );

    useEffect(() => {
        if (!isColumnsMenuOpen) return;
        const handleOutsideClick = (event: MouseEvent): void => {
            const target = event.target as Node;
            if (columnsMenuRef.current?.contains(target)) return;
            setIsColumnsMenuOpen(false);
        };
        window.addEventListener("mousedown", handleOutsideClick);
        return (): void => window.removeEventListener("mousedown", handleOutsideClick);
    }, [isColumnsMenuOpen]);

    const handleGridReady = useCallback((): void => {
        restoreColumnsState();
        syncColumnVisibility();
    }, [restoreColumnsState, syncColumnVisibility]);

    const handleCellContextMenu = useCallback((event: CellContextMenuEvent<Transaction>): void => {
        const transaction = event.data;
        if (transaction === undefined) return;

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
    const getRowClass = useCallback(
        (params: { data: Transaction | undefined }): string => getTransactionRowClass(params.data?.source),
        [],
    );

    const unidentifiedColumns = useMemo<ColDef<Transaction>[]>(
        () => [
            ...TRANSACTION_COLUMNS.map((column) => ({
                ...column,
                headerComponentParams: {
                    ...(column.headerComponentParams ?? {}),
                    innerHeaderComponent: UnidentifiedInnerHeader,
                    innerHeaderComponentParams: {
                        onOpenColumnsMenu: handleOpenColumnsMenu,
                    },
                },
            })),
        ],
        [handleOpenColumnsMenu],
    );

    const defaultColDef = useMemo<ColDef<Transaction>>(
        () => ({
            resizable: false,
            sortable: true,
            filter: false,
        }),
        [],
    );

    return (
        <div className="relative flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <h2 className="m-0 text-base font-semibold text-slate-700">
                    Unidentified Transactions ({transactions.length})
                </h2>
                <div ref={columnsMenuRef} className="relative">
                    <button
                        type="button"
                        onClick={handleOpenColumnsMenu}
                        className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                        Columns
                    </button>
                    {isColumnsMenuOpen ? (
                        <div className="absolute right-0 z-20 mt-1.5 min-w-[180px] rounded-md border border-slate-200 bg-white p-2 shadow-lg">
                            <div className="mb-1 text-[11px] font-semibold text-slate-500">Toggle columns</div>
                            <div className="flex max-h-56 flex-col gap-1 overflow-auto">
                                {toggleableColumns.map((column) => {
                                    const checked = columnVisibility[column.field] ?? true;
                                    return (
                                        <label
                                            key={column.field}
                                            className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs text-slate-700 transition hover:bg-slate-50"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={(): void => toggleColumnVisibility(column.field)}
                                            />
                                            <span>{column.headerName}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
            <p className="m-0 text-xs text-slate-500">Right-click a row to open quick actions.</p>

            <div
                className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white"
                onContextMenu={(event): void => event.preventDefault()}
            >
                <AgGridReact<Transaction>
                    ref={gridRef}
                    theme={themeQuartz}
                    columnDefs={unidentifiedColumns}
                    rowData={transactions}
                    defaultColDef={defaultColDef}
                    onGridReady={handleGridReady}
                    onColumnVisible={(): void => {
                        syncColumnVisibility();
                        persistColumnsState();
                    }}
                    onColumnMoved={persistColumnsState}
                    onCellContextMenu={handleCellContextMenu}
                    onCellClicked={closeContextMenu}
                    getRowClass={getRowClass}
                    domLayout="autoHeight"
                    enableCellTextSelection={true}
                    ensureDomOrder={true}
                />
            </div>
            {contextMenuState !== null ? (
                <UnidentifiedRowContextMenu
                    transaction={contextMenuState.transaction}
                    x={contextMenuState.x}
                    y={contextMenuState.y}
                    onClose={closeContextMenu}
                    onCreateRuleFilter={onCreateRuleFilter}
                    onCreateReportFilter={onCreateReportFilter}
                    onAddToRuleGroup={onAddToRuleGroup}
                    onAddToReportFilter={onAddToReportFilter}
                />
            ) : null}
        </div>
    );
}
