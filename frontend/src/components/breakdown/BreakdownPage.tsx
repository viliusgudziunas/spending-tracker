import { type ColDef, type ICellRendererParams, themeQuartz } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useMemo } from "react";

import { type Breakdown } from "@/clients/backendClient/responseParsers";
import { useBreakdownQuery } from "@/hooks/useReportsQueries";

const EUR_FORMAT = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

type BreakdownRowKind = "category" | "filter" | "unidentified";

interface BreakdownGridRow {
    id: string;
    label: string;
    kind: BreakdownRowKind;
    amounts: Record<string, string>;
}

function formatMonthHeader(month: string): string {
    const [year, monthNumber] = month.split("-");
    const date = new Date(Date.UTC(Number(year), Number(monthNumber) - 1, 1));
    return date.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}

function formatEur(value: string | undefined): string {
    if (value === undefined || value === "") {
        return "";
    }
    const amount = Number(value);
    if (Number.isNaN(amount)) {
        return "";
    }
    return EUR_FORMAT.format(amount);
}

function buildBreakdownRows(breakdown: Breakdown): BreakdownGridRow[] {
    const rows: BreakdownGridRow[] = [];
    for (const category of breakdown.categories) {
        rows.push({
            id: `category:${category.id}`,
            label: category.name,
            kind: "category",
            amounts: category.amounts,
        });
        for (const filter of category.filters) {
            rows.push({
                id: filter.key,
                label: filter.name,
                kind: "filter",
                amounts: filter.amounts,
            });
        }
    }
    rows.push({
        id: "unidentified",
        label: "Unidentified",
        kind: "unidentified",
        amounts: breakdown.unidentified.amounts,
    });
    return rows;
}

function LabelCell(params: ICellRendererParams<BreakdownGridRow, string>): JSX.Element {
    const label = params.value ?? "";
    if (params.data?.kind === "filter") {
        return <span className="pl-4">{label}</span>;
    }
    return <>{label}</>;
}

function breakdownRowClass(params: { data?: BreakdownGridRow }): string {
    if (params.data?.kind === "category") {
        return "font-semibold text-slate-900";
    }
    if (params.data?.kind === "unidentified") {
        return "italic text-slate-600";
    }
    return "text-slate-600";
}

export default function BreakdownPage(): JSX.Element {
    const { data: breakdown, isLoading, isError } = useBreakdownQuery();

    const rows = useMemo(() => {
        if (breakdown === undefined || breakdown.months.length === 0) {
            return [];
        }
        return buildBreakdownRows(breakdown);
    }, [breakdown]);

    const columnDefs = useMemo<ColDef<BreakdownGridRow>[]>(() => {
        const months = breakdown?.months ?? [];
        const monthColumns: ColDef<BreakdownGridRow>[] = months.map((month) => ({
            colId: month,
            headerName: formatMonthHeader(month),
            valueGetter: (params): string => params.data?.amounts[month] ?? "0",
            valueFormatter: (params): string => formatEur(params.value),
            type: "rightAligned",
            width: 130,
        }));
        return [
            {
                field: "label",
                headerName: "",
                pinned: "left",
                lockPosition: true,
                minWidth: 220,
                width: 260,
                cellRenderer: LabelCell,
            },
            ...monthColumns,
        ];
    }, [breakdown?.months]);

    const defaultColDef = useMemo<ColDef<BreakdownGridRow>>(
        () => ({
            resizable: false,
            sortable: false,
            filter: false,
            suppressMovable: true,
        }),
        [],
    );

    if (isLoading) {
        return (
            <main className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
                <p className="m-0 text-sm text-slate-400">Loading breakdown...</p>
            </main>
        );
    }

    if (isError || breakdown === undefined) {
        return (
            <main className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
                <p className="m-0 text-sm text-red-500">Failed to load breakdown.</p>
            </main>
        );
    }

    if (breakdown.months.length === 0) {
        return (
            <main className="flex flex-col gap-4">
                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h1 className="m-0 text-2xl font-semibold text-slate-900">Breakdown</h1>
                    <p className="mb-0 mt-3 text-sm text-slate-600">
                        No months to show yet. Set a month on a report, then generate it. Reports without a month, or
                        that have never been generated, are left out.
                    </p>
                </section>
            </main>
        );
    }

    return (
        <main className="flex flex-col gap-4">
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h1 className="m-0 text-2xl font-semibold text-slate-900">Breakdown</h1>
                <p className="mb-0 mt-1 text-sm text-slate-500">Spending by category across months.</p>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <AgGridReact<BreakdownGridRow>
                    theme={themeQuartz}
                    columnDefs={columnDefs}
                    rowData={rows}
                    defaultColDef={defaultColDef}
                    domLayout="autoHeight"
                    getRowId={(params): string => params.data.id}
                    getRowClass={breakdownRowClass}
                    enableCellTextSelection={true}
                    ensureDomOrder={true}
                />
            </section>
        </main>
    );
}
