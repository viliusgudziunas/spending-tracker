import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef, type RowClickedEvent } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReportCategory, ReportFull, ReportFilter, Transaction } from "../services/reports/api.types.parsed";
import { useGenerateReportMutation, useReportQuery } from "../services/reports/queries";

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
    { field: "description", headerName: "Description", flex: 2, minWidth: 200 },
    { field: "amount", headerName: "Amount", width: 110 },
    { field: "fee", headerName: "Fee", width: 90 },
    { field: "currency", headerName: "Currency", width: 100 },
    { field: "state", headerName: "State", width: 110 },
    { field: "balance", headerName: "Balance", width: 110 },
    { field: "startedDate", headerName: "Started", width: 160 },
    { field: "completedDate", headerName: "Completed", width: 160 },
];

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

function buildCategoryTsv(category: ReportCategory): string {
    return category.filters.map((filter) => `${filter.amount}\t${filter.name}\t${category.name}`).join("\n");
}

interface ReportDetailPageProps {
    reportId: string;
}

const MIN_PANEL_WIDTH = 300;
const MAX_PANEL_WIDTH = 800;
const DEFAULT_PANEL_WIDTH = 420;

export default function ReportDetailPage({ reportId }: ReportDetailPageProps): JSX.Element {
    const { data: report, isLoading, isError } = useReportQuery(reportId);
    const generateMutation = useGenerateReportMutation();
    const [selectedFilter, setSelectedFilter] = useState<ReportFilter | null>(null);
    const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
    const isDragging = useRef(false);

    const handleFilterClick = useCallback((filter: ReportFilter): void => {
        setSelectedFilter((prev) => (prev?.id === filter.id ? null : filter));
    }, []);

    const handleClosePanel = useCallback((): void => {
        setSelectedFilter(null);
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
                    <button
                        type="button"
                        onClick={(): void => void generateMutation.mutateAsync(reportId)}
                        disabled={generateMutation.isPending}
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {generateMutation.isPending ? "Generating..." : "Generate"}
                    </button>
                </div>

                <ReportSections
                    report={report}
                    onFilterClick={handleFilterClick}
                    selectedFilterId={selectedFilter?.id ?? null}
                />
            </div>

            {selectedFilter !== null ? (
                <>
                    <div
                        onMouseDown={handleMouseDown}
                        className="group flex w-3 shrink-0 cursor-col-resize items-stretch justify-center"
                    >
                        <div className="w-px bg-slate-200 transition-colors group-hover:w-0.5 group-hover:bg-slate-400" />
                    </div>
                    <TransactionPanel filter={selectedFilter} onClose={handleClosePanel} width={panelWidth} />
                </>
            ) : null}
        </div>
    );
}

interface ReportSectionsProps {
    report: ReportFull;
    onFilterClick: (filter: ReportFilter) => void;
    selectedFilterId: string | null;
}

function ReportSections({ report, onFilterClick, selectedFilterId }: ReportSectionsProps): JSX.Element {
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

            {hasUnidentified ? <UnidentifiedSection transactions={report.unidentifiedTransactions} /> : null}
        </>
    );
}

interface CategorySectionProps {
    category: ReportCategory;
    onFilterClick: (filter: ReportFilter) => void;
    selectedFilterId: string | null;
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
}

function UnidentifiedSection({ transactions }: UnidentifiedSectionProps): JSX.Element {
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
            <h2 className="m-0 text-base font-semibold text-slate-700">
                Unidentified Transactions ({transactions.length})
            </h2>

            <div className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
                <AgGridReact<Transaction>
                    theme={themeQuartz}
                    columnDefs={TRANSACTION_COLUMNS}
                    rowData={transactions}
                    defaultColDef={defaultColDef}
                    domLayout="autoHeight"
                    enableCellTextSelection={true}
                    ensureDomOrder={true}
                />
            </div>
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
