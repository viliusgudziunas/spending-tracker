import { type ColDef, type RowClickedEvent, themeQuartz } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useMemo, useState } from "react";
import { ReportCategory, ReportFilter } from "../../../clients/backendClient/responseParsers";
import { FILTER_COLUMNS } from "../constants";
import { buildCategoryTsv, buildFilterRows } from "../helpers";
import type { FilterRow } from "../constants";

interface CategorySectionProps {
    category: ReportCategory;
    onFilterClick: (filter: ReportFilter) => void;
    selectedFilterId: string | null;
}

export default function CategorySection({
    category,
    onFilterClick,
    selectedFilterId,
}: CategorySectionProps): JSX.Element {
    const [copied, setCopied] = useState(false);
    const rows = useMemo(() => buildFilterRows(category.filters), [category.filters]);
    const filterById = useMemo(
        () => new Map(category.filters.map((filter) => [filter.id, filter])),
        [category.filters],
    );

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
