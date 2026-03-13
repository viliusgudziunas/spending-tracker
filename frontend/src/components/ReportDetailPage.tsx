import {
    AllCommunityModule,
    ModuleRegistry,
    themeQuartz,
    type ColDef,
    type IHeaderParams,
    type ICellRendererParams,
    type RowClickedEvent,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useFilterForm from "../hooks/useFilterForm";
import { RULE_OPERATORS, RULE_TYPES } from "../clients/backendClient/schemas";
import {
    ReportCategory,
    ReportFilter,
    ReportFull,
    RuleOperator,
    RuleType,
    Transaction,
} from "../clients/backendClient/responseParsers";
import { useCategoriesQuery } from "../hooks/useCategoryQueries";
import { useCreateFilterMutation, usePutFilterRuleGroupsMutation } from "../hooks/useFilterQueries";
import { useGenerateReportMutation, useReportQuery } from "../hooks/useReportsQueries";
import CategoriesPanel from "./CategoriesPanel";

ModuleRegistry.registerModules([AllCommunityModule]);

interface FilterRow {
    id: string;
    name: string;
    amount: string;
    transactionCount: number;
}

const FILTER_COLUMNS: ColDef<FilterRow>[] = [
    { field: "amount", headerName: "Amount", width: 120 },
    { field: "name", headerName: "Description", flex: 1, minWidth: 200 },
    {
        field: "transactionCount",
        headerName: "#",
        width: 80,
        cellClass: "text-slate-400",
    },
];

const TRANSACTION_COLUMNS: ColDef<Transaction>[] = [
    { field: "type", headerName: "Type", width: 140 },
    { field: "product", headerName: "Product", width: 140 },
    { field: "description", headerName: "Description", flex: 2, minWidth: 200 },
    { field: "amount", headerName: "Amount", width: 110 },
    { field: "fee", headerName: "Fee", width: 90 },
    { field: "currency", headerName: "Currency", width: 100 },
    { field: "state", headerName: "State", width: 110 },
    { field: "source", headerName: "Source", width: 120 },
    { field: "balance", headerName: "Balance", width: 110 },
    { field: "startedDate", headerName: "Started", width: 160 },
    { field: "completedDate", headerName: "Completed", width: 160 },
];

const OPERATOR_LABELS: Record<RuleOperator, string> = {
    EQUAL: "= Equal",
    NOT_EQUAL: "≠ Not equal",
    GREATER_THAN: "> Greater than",
    LESS_THAN: "< Less than",
    GREATER_THAN_EQUAL: ">= Greater/equal",
    LESS_THAN_EQUAL: "<= Less/equal",
};

const RULE_TYPE_LABELS: Record<RuleType, string> = {
    DESCRIPTION: "Description",
    AMOUNT: "Amount",
    PRODUCT: "Product",
};

const UNIDENTIFIED_COLUMNS_STATE_STORAGE_KEY = "report-detail:unidentified:columns-state";

function buildFilterRows(filters: ReportFilter[]): FilterRow[] {
    return filters
        .filter((filter) => filter.transactions.length > 0)
        .map((filter) => ({
            id: filter.id,
            name: filter.name,
            amount: filter.amount,
            transactionCount: filter.transactions.length,
        }));
}

function getTransactionRuleValue(transaction: Transaction, ruleType: RuleType): string {
    switch (ruleType) {
        case "DESCRIPTION":
            return transaction.description;
        case "PRODUCT":
            return transaction.product;
        case "AMOUNT":
            return String(transaction.amount);
        default:
            return transaction.description;
    }
}

interface ReportDetailPageProps {
    reportId: string;
}

const MIN_PANEL_WIDTH = 300;
const MAX_PANEL_WIDTH = 800;
const DEFAULT_PANEL_WIDTH = 420;

type RightPanel =
    | { kind: "filter"; filter: ReportFilter }
    | { kind: "categories" }
    | { kind: "create-filter"; transaction: Transaction }
    | { kind: "add-rule-group"; transaction: Transaction };

export default function ReportDetailPage({ reportId }: ReportDetailPageProps): JSX.Element {
    const { data: report, isLoading, isError } = useReportQuery(reportId);
    const generateMutation = useGenerateReportMutation();
    const [rightPanel, setRightPanel] = useState<RightPanel | null>(null);
    const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
    const isDragging = useRef(false);

    const handleFilterClick = useCallback((filter: ReportFilter): void => {
        setRightPanel((prev) =>
            prev?.kind === "filter" && prev.filter.id === filter.id ? null : { kind: "filter", filter },
        );
    }, []);

    const handleToggleCategories = useCallback((): void => {
        setRightPanel((prev) => (prev?.kind === "categories" ? null : { kind: "categories" }));
    }, []);

    const handleClosePanel = useCallback((): void => {
        setRightPanel(null);
    }, []);

    const handleCreateFilterFromTransaction = useCallback((transaction: Transaction): void => {
        setRightPanel({ kind: "create-filter", transaction });
    }, []);

    const handleAddToRuleGroupFromTransaction = useCallback((transaction: Transaction): void => {
        setRightPanel({ kind: "add-rule-group", transaction });
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent): void => {
        e.preventDefault();
        isDragging.current = true;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent): void => {
            if (!isDragging.current) return;
            const newWidth = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, window.innerWidth - e.clientX - 20));
            setPanelWidth(newWidth);
        };

        const handleMouseUp = (): void => {
            if (!isDragging.current) return;
            isDragging.current = false;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return (): void => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
                <p className="text-sm text-slate-400">Loading report...</p>
            </div>
        );
    }

    if (isError || report === undefined) {
        return (
            <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
                <p className="text-sm text-red-500">Failed to load report.</p>
            </div>
        );
    }

    return (
        <div className="flex">
            <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h1 className="m-0 text-2xl font-semibold text-slate-900">{report.name}</h1>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleToggleCategories}
                            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                                rightPanel?.kind === "categories"
                                    ? "border-blue-300 bg-blue-50 text-blue-700"
                                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                            Categories
                        </button>
                        <button
                            type="button"
                            onClick={(): void => void generateMutation.mutateAsync(reportId)}
                            disabled={generateMutation.isPending}
                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {generateMutation.isPending ? "Generating..." : "Generate"}
                        </button>
                    </div>
                </div>

                <ReportSections
                    report={report}
                    onFilterClick={handleFilterClick}
                    onCreateFilter={handleCreateFilterFromTransaction}
                    onAddToRuleGroup={handleAddToRuleGroupFromTransaction}
                    selectedFilterId={rightPanel?.kind === "filter" ? rightPanel.filter.id : null}
                />
            </div>

            {rightPanel !== null ? (
                <>
                    <div
                        onMouseDown={handleMouseDown}
                        className="group flex w-3 shrink-0 cursor-col-resize items-stretch justify-center"
                    >
                        <div className="w-px bg-slate-200 transition-colors group-hover:w-0.5 group-hover:bg-slate-400" />
                    </div>
                    {rightPanel.kind === "filter" ? (
                        <TransactionPanel filter={rightPanel.filter} onClose={handleClosePanel} width={panelWidth} />
                    ) : null}
                    {rightPanel.kind === "categories" ? (
                        <CategoriesPanel onClose={handleClosePanel} width={panelWidth} />
                    ) : null}
                    {rightPanel.kind === "create-filter" ? (
                        <CreateTransactionFilterPanel
                            reportId={reportId}
                            transaction={rightPanel.transaction}
                            onClose={handleClosePanel}
                            width={panelWidth}
                        />
                    ) : null}
                    {rightPanel.kind === "add-rule-group" ? (
                        <AddToRuleGroupPanel
                            reportId={reportId}
                            transaction={rightPanel.transaction}
                            onClose={handleClosePanel}
                            width={panelWidth}
                        />
                    ) : null}
                </>
            ) : null}
        </div>
    );
}

interface ReportSectionsProps {
    report: ReportFull;
    onFilterClick: (filter: ReportFilter) => void;
    onCreateFilter: (transaction: Transaction) => void;
    onAddToRuleGroup: (transaction: Transaction) => void;
    selectedFilterId: string | null;
}

function ReportSections({
    report,
    onFilterClick,
    onCreateFilter,
    onAddToRuleGroup,
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
                    onCreateFilter={onCreateFilter}
                    onAddToRuleGroup={onAddToRuleGroup}
                />
            ) : null}
        </>
    );
}

interface CategorySectionProps {
    category: ReportCategory;
    onFilterClick: (filter: ReportFilter) => void;
    selectedFilterId: string | null;
}

function buildCategoryTsv(category: ReportCategory): string {
    return category.filters
        .filter((filter) => filter.transactions.length > 0)
        .map((filter) => `${filter.amount}\t${filter.name}`)
        .join("\n");
}

function CategorySection({ category, onFilterClick, selectedFilterId }: CategorySectionProps): JSX.Element {
    const [copied, setCopied] = useState(false);
    const rows = useMemo(() => buildFilterRows(category.filters), [category.filters]);
    const filterById = useMemo(() => new Map(category.filters.map((f) => [f.id, f])), [category.filters]);

    const defaultColDef = useMemo<ColDef<FilterRow>>(
        () => ({
            resizable: false,
            sortable: false,
            filter: false,
        }),
        [],
    );

    const handleCopy = useCallback(async (): Promise<void> => {
        const tsv = buildCategoryTsv(category);
        await navigator.clipboard.writeText(tsv);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }, [category]);

    const handleRowClicked = useCallback(
        (event: RowClickedEvent<FilterRow>): void => {
            const row = event.data;
            if (row === undefined) return;
            const filter = filterById.get(row.id);
            if (filter !== undefined) {
                onFilterClick(filter);
            }
        },
        [filterById, onFilterClick],
    );

    const getRowClass = useCallback(
        (params: { data: FilterRow | undefined }): string => {
            if (params.data?.id === selectedFilterId) {
                return "bg-blue-50";
            }
            return "cursor-pointer";
        },
        [selectedFilterId],
    );

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <h2 className="m-0 text-base font-semibold text-slate-700">{category.name}</h2>
                <button
                    type="button"
                    onClick={(): void => void handleCopy()}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                >
                    {copied ? "Copied!" : "Copy"}
                </button>
            </div>

            <div className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
                <AgGridReact<FilterRow>
                    theme={themeQuartz}
                    columnDefs={FILTER_COLUMNS}
                    rowData={rows}
                    defaultColDef={defaultColDef}
                    domLayout="autoHeight"
                    enableCellTextSelection={true}
                    ensureDomOrder={true}
                    onRowClicked={handleRowClicked}
                    getRowClass={getRowClass}
                />
            </div>
        </div>
    );
}

interface UnidentifiedSectionProps {
    transactions: Transaction[];
    onCreateFilter: (transaction: Transaction) => void;
    onAddToRuleGroup: (transaction: Transaction) => void;
}

interface UnidentifiedInnerHeaderParams extends IHeaderParams<Transaction> {
    onOpenColumnsMenu?: () => void;
}

function UnidentifiedInnerHeader({ displayName, onOpenColumnsMenu }: UnidentifiedInnerHeaderParams): JSX.Element {
    return (
        <div className="flex w-full items-center gap-1">
            <span className="min-w-0 flex-1 truncate">{displayName}</span>
            <button
                type="button"
                aria-label="Open columns menu"
                className="h-5 w-5 shrink-0 rounded text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                onClick={(event): void => {
                    event.stopPropagation();
                    onOpenColumnsMenu?.();
                }}
            >
                ⋮
            </button>
        </div>
    );
}

function UnidentifiedSection({
    transactions,
    onCreateFilter,
    onAddToRuleGroup,
}: UnidentifiedSectionProps): JSX.Element {
    const gridRef = useRef<AgGridReact<Transaction>>(null);
    const columnsMenuRef = useRef<HTMLDivElement | null>(null);
    const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});

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
            {
                colId: "actions",
                headerName: "Actions",
                width: 220,
                minWidth: 220,
                pinned: "right",
                suppressMovable: true,
                sortable: false,
                filter: false,
                resizable: false,
                cellStyle: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                },
                cellRenderer: (params: ICellRendererParams<Transaction>): JSX.Element | null => {
                    if (params.data === undefined) return null;
                    return (
                        <UnidentifiedActionsCell
                            transaction={params.data}
                            onCreateFilter={onCreateFilter}
                            onAddToRuleGroup={onAddToRuleGroup}
                        />
                    );
                },
            },
        ],
        [handleOpenColumnsMenu, onAddToRuleGroup, onCreateFilter],
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
        <div className="flex flex-col gap-2">
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

            <div className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
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
                    domLayout="autoHeight"
                    enableCellTextSelection={true}
                    ensureDomOrder={true}
                />
            </div>
        </div>
    );
}

interface UnidentifiedActionsCellProps {
    transaction: Transaction;
    onCreateFilter: (transaction: Transaction) => void;
    onAddToRuleGroup: (transaction: Transaction) => void;
}

function UnidentifiedActionsCell({
    transaction,
    onCreateFilter,
    onAddToRuleGroup,
}: UnidentifiedActionsCellProps): JSX.Element {
    return (
        <div className="flex h-full w-full items-center justify-center gap-1.5">
            <button
                type="button"
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={(event): void => {
                    event.stopPropagation();
                    onCreateFilter(transaction);
                }}
            >
                Create filter
            </button>
            <button
                type="button"
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={(event): void => {
                    event.stopPropagation();
                    onAddToRuleGroup(transaction);
                }}
            >
                Add to filter
            </button>
        </div>
    );
}

interface CreateTransactionFilterPanelProps {
    reportId: string;
    transaction: Transaction;
    onClose: () => void;
    width: number;
}

function CreateTransactionFilterPanel({
    reportId,
    transaction,
    onClose,
    width,
}: CreateTransactionFilterPanelProps): JSX.Element {
    const filterFormStore = useFilterForm();
    const { data: categories, isLoading: isCategoriesLoading, isError: isCategoriesError } = useCategoriesQuery();
    const createFilterMutation = useCreateFilterMutation();
    const generateReportMutation = useGenerateReportMutation();
    const [submitError, setSubmitError] = useState<string | null>(null);

    const isSubmitting = createFilterMutation.isPending || generateReportMutation.isPending;

    useEffect(() => {
        filterFormStore.actions.resetFilter();
        filterFormStore.actions.changeFilter("name", transaction.description);
        filterFormStore.actions.initNewFilter(transaction.description);
        setSubmitError(null);
    }, [transaction]);

    const handleSubmit = useCallback(
        async (event: React.FormEvent): Promise<void> => {
            event.preventDefault();
            const { name, categoryId, ruleGroups } = filterFormStore.state.filter;
            if (name.trim() === "" || categoryId === "" || ruleGroups.length === 0) return;

            const parsedRuleGroups = ruleGroups.map((group) => ({
                operator: group.operator,
                rules: group.rules.map((rule) => ({
                    type: rule.type,
                    operator: rule.operator,
                    value: rule.value.trim(),
                })),
            }));
            const hasInvalidRules = parsedRuleGroups.some(
                (group) => group.rules.length === 0 || group.rules.some((rule) => rule.value === ""),
            );
            if (hasInvalidRules) return;

            setSubmitError(null);
            try {
                await createFilterMutation.mutateAsync({
                    name: name.trim(),
                    categoryId,
                    ruleGroups: parsedRuleGroups,
                });
                await generateReportMutation.mutateAsync(reportId);
                onClose();
            } catch (error: unknown) {
                if (error instanceof Error && error.message.trim().length > 0) {
                    setSubmitError(error.message);
                } else {
                    setSubmitError("Failed to create filter.");
                }
            }
        },
        [createFilterMutation, filterFormStore.state.filter, generateReportMutation, onClose, reportId],
    );

    return (
        <div
            className="sticky top-4 flex max-h-[calc(100vh-2rem)] shrink-0 flex-col gap-3 self-start"
            style={{ width }}
        >
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="min-w-0">
                    <h2 className="m-0 truncate text-lg font-semibold text-slate-900">Create Filter</h2>
                    <p className="m-0 mt-0.5 text-xs text-slate-400">From selected unidentified transaction</p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                    &#x2715;
                </button>
            </div>

            <form
                onSubmit={(event): void => void handleSubmit(event)}
                className="min-h-0 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    <div className="font-semibold text-slate-700">Transaction</div>
                    <div className="mt-1 truncate">{transaction.description || "(empty description)"}</div>
                    <div className="mt-1 text-slate-500">
                        {transaction.amount} {transaction.currency}
                    </div>
                </div>

                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                    Filter name
                    <input
                        type="text"
                        value={filterFormStore.state.filter.name}
                        onChange={(event): void => filterFormStore.actions.changeFilter("name", event.target.value)}
                        className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                        required
                    />
                </label>

                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                    Category
                    <select
                        value={filterFormStore.state.filter.categoryId}
                        onChange={(event): void =>
                            filterFormStore.actions.changeFilter("categoryId", event.target.value)
                        }
                        className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                        required
                        disabled={isCategoriesLoading || isCategoriesError}
                    >
                        <option value="">Select category</option>
                        {(categories ?? []).map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </label>

                {filterFormStore.state.filter.ruleGroups.map((group, groupIndex) => (
                    <div
                        key={group.id}
                        className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-2.5"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-700">
                                Rule Group {groupIndex + 1} (AND)
                            </span>
                            <button
                                type="button"
                                disabled={filterFormStore.state.filter.ruleGroups.length === 1}
                                onClick={(): void => filterFormStore.actions.removeRuleGroup(group.id as string)}
                                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Remove Group
                            </button>
                        </div>

                        {group.rules.map((rule) => (
                            <div key={rule.id} className="rounded-md border border-slate-200 bg-white p-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        value={rule.type}
                                        onChange={(event): void => {
                                            const nextType = event.target.value as RuleType;
                                            filterFormStore.actions.changeRule(
                                                group.id as string,
                                                rule.id as string,
                                                "type",
                                                nextType,
                                            );
                                            filterFormStore.actions.changeRule(
                                                group.id as string,
                                                rule.id as string,
                                                "value",
                                                getTransactionRuleValue(transaction, nextType),
                                            );
                                        }}
                                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                    >
                                        {RULE_TYPES.map((type) => (
                                            <option key={`${rule.id}-${type}`} value={type}>
                                                {RULE_TYPE_LABELS[type]}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={rule.operator}
                                        onChange={(event): void =>
                                            filterFormStore.actions.changeRule(
                                                group.id as string,
                                                rule.id as string,
                                                "operator",
                                                event.target.value as RuleOperator,
                                            )
                                        }
                                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                    >
                                        {RULE_OPERATORS.map((operator) => (
                                            <option key={`${rule.id}-${operator}`} value={operator}>
                                                {OPERATOR_LABELS[operator]}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mt-2 flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={rule.value}
                                        onChange={(event): void =>
                                            filterFormStore.actions.changeRule(
                                                group.id as string,
                                                rule.id as string,
                                                "value",
                                                event.target.value,
                                            )
                                        }
                                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                        placeholder={
                                            rule.type === "AMOUNT"
                                                ? "Amount value"
                                                : rule.type === "PRODUCT"
                                                  ? "Product value"
                                                  : "Description value"
                                        }
                                    />
                                    <button
                                        type="button"
                                        disabled={group.rules.length === 1}
                                        onClick={(): void =>
                                            filterFormStore.actions.removeRule(group.id as string, rule.id as string)
                                        }
                                        className="shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={(): void => filterFormStore.actions.addRule(group.id as string)}
                            className="w-full rounded-md border border-dashed border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
                        >
                            + New Rule
                        </button>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={(): void => filterFormStore.actions.addRuleGroup()}
                    className="w-full rounded-md border border-dashed border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
                >
                    + New Rule Group
                </button>

                {isCategoriesError ? <div className="text-xs text-red-600">Failed to load categories.</div> : null}
                {submitError !== null ? <div className="text-xs text-red-600">{submitError}</div> : null}

                <div className="flex gap-2">
                    <button
                        type="submit"
                        disabled={
                            isSubmitting ||
                            filterFormStore.state.filter.name.trim() === "" ||
                            filterFormStore.state.filter.categoryId === "" ||
                            filterFormStore.state.filter.ruleGroups.some(
                                (group) =>
                                    group.rules.length === 0 || group.rules.some((rule) => rule.value.trim() === ""),
                            )
                        }
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSubmitting ? "Creating..." : "Create filter"}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

interface AddToRuleGroupPanelProps {
    reportId: string;
    transaction: Transaction;
    onClose: () => void;
    width: number;
}

function AddToRuleGroupPanel({ reportId, transaction, onClose, width }: AddToRuleGroupPanelProps): JSX.Element {
    const filterFormStore = useFilterForm();
    const { data: categories, isLoading: isCategoriesLoading, isError: isCategoriesError } = useCategoriesQuery();
    const putFilterRuleGroupsMutation = usePutFilterRuleGroupsMutation();
    const generateReportMutation = useGenerateReportMutation();
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [selectedFilterId, setSelectedFilterId] = useState("");
    const [submitError, setSubmitError] = useState<string | null>(null);

    const selectedCategory = useMemo(
        () => (categories ?? []).find((category) => category.id === selectedCategoryId),
        [categories, selectedCategoryId],
    );
    const selectedFilter = useMemo(
        () => selectedCategory?.filters.find((filter) => filter.id === selectedFilterId),
        [selectedCategory, selectedFilterId],
    );

    const isSubmitting = putFilterRuleGroupsMutation.isPending || generateReportMutation.isPending;

    useEffect(() => {
        filterFormStore.actions.resetFilter();
        setSelectedCategoryId("");
        setSelectedFilterId("");
        setSubmitError(null);
    }, [transaction]);

    useEffect(() => {
        filterFormStore.actions.resetFilter();
        setSelectedFilterId("");
    }, [selectedCategoryId]);

    useEffect(() => {
        if (selectedFilter === undefined) {
            filterFormStore.actions.resetFilter();
            return;
        }
        filterFormStore.actions.initExistingFilter(selectedFilter);
    }, [selectedFilter]);

    const handleSubmit = useCallback(
        async (event: React.FormEvent): Promise<void> => {
            event.preventDefault();
            if (selectedFilter === undefined) return;
            const ruleGroups = filterFormStore.state.filter.ruleGroups;
            if (ruleGroups.length === 0) return;

            const hasInvalidRules = ruleGroups.some(
                (group) => group.rules.length === 0 || group.rules.some((rule) => rule.value.trim() === ""),
            );
            if (hasInvalidRules) return;

            setSubmitError(null);
            try {
                await putFilterRuleGroupsMutation.mutateAsync({
                    filterId: selectedFilter.id,
                    payload: {
                        ruleGroups: ruleGroups.map((group) => ({
                            id: group.id?.startsWith("temp-") ? undefined : group.id,
                            operator: group.operator,
                            rules: group.rules.map((rule) => ({
                                id: rule.id?.startsWith("temp-") ? undefined : rule.id,
                                type: rule.type,
                                operator: rule.operator,
                                value: rule.value.trim(),
                            })),
                        })),
                    },
                });
                await generateReportMutation.mutateAsync(reportId);
                onClose();
            } catch (error: unknown) {
                if (error instanceof Error && error.message.trim().length > 0) {
                    setSubmitError(error.message);
                } else {
                    setSubmitError("Failed to update rule group.");
                }
            }
        },
        [
            filterFormStore.state.filter.ruleGroups,
            generateReportMutation,
            onClose,
            putFilterRuleGroupsMutation,
            reportId,
            selectedFilter,
        ],
    );

    return (
        <div
            className="sticky top-4 flex max-h-[calc(100vh-2rem)] shrink-0 flex-col gap-3 self-start"
            style={{ width }}
        >
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="min-w-0">
                    <h2 className="m-0 truncate text-lg font-semibold text-slate-900">Add to Rule Group</h2>
                    <p className="m-0 mt-0.5 text-xs text-slate-400">From selected unidentified transaction</p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                    &#x2715;
                </button>
            </div>

            <form
                onSubmit={(event): void => void handleSubmit(event)}
                className="min-h-0 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    <div className="font-semibold text-slate-700">Transaction</div>
                    <div className="mt-1 truncate">{transaction.description || "(empty description)"}</div>
                    <div className="mt-1 text-slate-500">
                        {transaction.amount} {transaction.currency}
                    </div>
                </div>

                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                    Category
                    <select
                        value={selectedCategoryId}
                        onChange={(event): void => setSelectedCategoryId(event.target.value)}
                        className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                        disabled={isCategoriesLoading || isCategoriesError}
                        required
                    >
                        <option value="">Select category</option>
                        {(categories ?? []).map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                    Filter
                    <select
                        value={selectedFilterId}
                        onChange={(event): void => setSelectedFilterId(event.target.value)}
                        className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                        disabled={selectedCategory === undefined}
                        required
                    >
                        <option value="">Select filter</option>
                        {(selectedCategory?.filters ?? []).map((filter) => (
                            <option key={filter.id} value={filter.id}>
                                {filter.name}
                            </option>
                        ))}
                    </select>
                </label>

                {selectedFilter !== undefined ? (
                    <>
                        {filterFormStore.state.filter.ruleGroups.map((group, groupIndex) => (
                            <div
                                key={group.id}
                                className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-2.5"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-semibold text-slate-700">
                                        Rule Group {groupIndex + 1} ({group.operator})
                                    </span>
                                    <button
                                        type="button"
                                        disabled={filterFormStore.state.filter.ruleGroups.length === 1}
                                        onClick={(): void =>
                                            filterFormStore.actions.removeRuleGroup(group.id as string)
                                        }
                                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        Remove Group
                                    </button>
                                </div>

                                {group.rules.map((rule) => (
                                    <div key={rule.id} className="rounded-md border border-slate-200 bg-white p-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <select
                                                value={rule.type}
                                                onChange={(event): void => {
                                                    const nextType = event.target.value as RuleType;
                                                    filterFormStore.actions.changeRule(
                                                        group.id as string,
                                                        rule.id as string,
                                                        "type",
                                                        nextType,
                                                    );
                                                    filterFormStore.actions.changeRule(
                                                        group.id as string,
                                                        rule.id as string,
                                                        "value",
                                                        getTransactionRuleValue(transaction, nextType),
                                                    );
                                                }}
                                                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                            >
                                                {RULE_TYPES.map((type) => (
                                                    <option key={`${rule.id}-${type}`} value={type}>
                                                        {RULE_TYPE_LABELS[type]}
                                                    </option>
                                                ))}
                                            </select>
                                            <select
                                                value={rule.operator}
                                                onChange={(event): void =>
                                                    filterFormStore.actions.changeRule(
                                                        group.id as string,
                                                        rule.id as string,
                                                        "operator",
                                                        event.target.value as RuleOperator,
                                                    )
                                                }
                                                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                            >
                                                {RULE_OPERATORS.map((operator) => (
                                                    <option key={`${rule.id}-${operator}`} value={operator}>
                                                        {OPERATOR_LABELS[operator]}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="mt-2 flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={rule.value}
                                                onChange={(event): void =>
                                                    filterFormStore.actions.changeRule(
                                                        group.id as string,
                                                        rule.id as string,
                                                        "value",
                                                        event.target.value,
                                                    )
                                                }
                                                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                placeholder={
                                                    rule.type === "AMOUNT"
                                                        ? "Amount value"
                                                        : rule.type === "PRODUCT"
                                                          ? "Product value"
                                                          : "Description value"
                                                }
                                            />
                                            <button
                                                type="button"
                                                disabled={group.rules.length === 1}
                                                onClick={(): void =>
                                                    filterFormStore.actions.removeRule(
                                                        group.id as string,
                                                        rule.id as string,
                                                    )
                                                }
                                                className="shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={(): void => filterFormStore.actions.addRule(group.id as string)}
                                    className="w-full rounded-md border border-dashed border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
                                >
                                    + New Rule
                                </button>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={(): void =>
                                filterFormStore.actions.addRuleGroup(
                                    getTransactionRuleValue(transaction, "DESCRIPTION"),
                                )
                            }
                            className="w-full rounded-md border border-dashed border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
                        >
                            + New Rule Group
                        </button>
                    </>
                ) : (
                    <div className="rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-500">
                        Select a filter to edit rule groups.
                    </div>
                )}

                {isCategoriesError ? <div className="text-xs text-red-600">Failed to load categories.</div> : null}
                {submitError !== null ? <div className="text-xs text-red-600">{submitError}</div> : null}

                <div className="flex gap-2">
                    <button
                        type="submit"
                        disabled={
                            isSubmitting ||
                            selectedCategoryId === "" ||
                            selectedFilterId === "" ||
                            filterFormStore.state.filter.ruleGroups.length === 0 ||
                            filterFormStore.state.filter.ruleGroups.some(
                                (group) =>
                                    group.rules.length === 0 || group.rules.some((rule) => rule.value.trim() === ""),
                            )
                        }
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSubmitting ? "Saving..." : "Save rule groups"}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

interface TransactionPanelProps {
    filter: ReportFilter;
    onClose: () => void;
    width: number;
}

function TransactionPanel({ filter, onClose, width }: TransactionPanelProps): JSX.Element {
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
