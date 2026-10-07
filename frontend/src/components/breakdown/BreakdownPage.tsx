import { type ColDef, type ColGroupDef, type ICellRendererParams, themeQuartz } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { type Breakdown } from "@/clients/backendClient/responseParsers";
import { useBreakdownQuery } from "@/hooks/useReportsQueries";

import { formatBreakdownMonthName, visibleBreakdownMonths } from "./breakdownPeriods";
import BreakdownPeriodsControl from "./BreakdownPeriodsControl";
import {
    dropUnavailableHiddenMonths,
    readHiddenBreakdownMonths,
    writeHiddenBreakdownMonths,
} from "./hiddenBreakdownMonths";

const EUR_FORMAT = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

type BreakdownRowKind = "category" | "filter" | "unidentified";

interface BreakdownGridRow {
    id: string;
    label: string;
    kind: BreakdownRowKind;
    amounts: Record<string, string>;
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

function buildMonthGroups(months: string[]): ColGroupDef<BreakdownGridRow>[] {
    const groups: ColGroupDef<BreakdownGridRow>[] = [];
    for (const month of months) {
        const year = month.slice(0, 4);
        const column: ColDef<BreakdownGridRow> = {
            colId: month,
            headerName: formatBreakdownMonthName(month),
            valueGetter: (params): string => params.data?.amounts[month] ?? "0",
            valueFormatter: (params): string => formatEur(params.value),
            type: "rightAligned",
            width: 110,
        };
        const currentGroup = groups.at(-1);
        if (currentGroup !== undefined && currentGroup.headerName === year) {
            currentGroup.children.push(column);
            continue;
        }
        groups.push({
            headerName: year,
            marryChildren: true,
            // Keep the year centered over its months while the header scrolls.
            suppressStickyLabel: true,
            children: [column],
        });
    }
    return groups;
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

function handleBreakdownHorizontalWheel(event: WheelEvent): void {
    const grid = event.currentTarget;
    if (!(grid instanceof HTMLElement)) {
        return;
    }
    const { deltaX, deltaY, shiftKey } = event;
    const horizontal = shiftKey || Math.abs(deltaX) > Math.abs(deltaY);
    if (!horizontal) {
        return;
    }
    const center = grid.querySelector(".ag-center-cols-viewport");
    if (!(center instanceof HTMLElement) || center.scrollWidth <= center.clientWidth) {
        return;
    }
    event.preventDefault();
    center.scrollLeft += deltaX !== 0 ? deltaX : deltaY;
    const header = grid.querySelector(".ag-header-viewport");
    if (header instanceof HTMLElement) {
        header.scrollLeft = center.scrollLeft;
    }
    const scrollbar = grid.querySelector(".ag-body-horizontal-scroll-viewport");
    if (scrollbar instanceof HTMLElement) {
        scrollbar.scrollLeft = center.scrollLeft;
    }
}

function readStoredHiddenBreakdownMonths(): string[] {
    if (typeof window === "undefined") {
        return [];
    }
    return readHiddenBreakdownMonths(window.localStorage);
}

export default function BreakdownPage(): JSX.Element {
    const { data: breakdown, isLoading, isError } = useBreakdownQuery();
    const [hiddenMonths, setHiddenMonths] = useState<string[]>(readStoredHiddenBreakdownMonths);
    const [trackedMonths, setTrackedMonths] = useState<readonly string[] | undefined>(undefined);
    if (breakdown !== undefined && breakdown.months.length > 0 && breakdown.months !== trackedMonths) {
        setTrackedMonths(breakdown.months);
        setHiddenMonths((current) => dropUnavailableHiddenMonths(current, breakdown.months));
    }

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }
        writeHiddenBreakdownMonths(window.localStorage, hiddenMonths);
    }, [hiddenMonths]);

    const visibleMonths = useMemo(
        () => visibleBreakdownMonths(breakdown?.months ?? [], hiddenMonths),
        [breakdown?.months, hiddenMonths],
    );

    const rows = useMemo(() => {
        if (breakdown === undefined || visibleMonths.length === 0) {
            return [];
        }
        return buildBreakdownRows(breakdown);
    }, [breakdown, visibleMonths.length]);

    const columnDefs = useMemo<(ColDef<BreakdownGridRow> | ColGroupDef<BreakdownGridRow>)[]>(() => {
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
            ...buildMonthGroups(visibleMonths),
        ];
    }, [visibleMonths]);

    const showGrid = visibleMonths.length > 0;
    const gridRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const grid = gridRef.current;
        if (!showGrid || grid === null) {
            return;
        }
        grid.addEventListener("wheel", handleBreakdownHorizontalWheel, { capture: true, passive: false });
        return (): void => {
            grid.removeEventListener("wheel", handleBreakdownHorizontalWheel, { capture: true });
        };
    }, [showGrid]);

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
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="m-0 text-2xl font-semibold text-slate-900">Breakdown</h1>
                        <p className="mb-0 mt-1 text-sm text-slate-500">Spending by category across months.</p>
                    </div>
                    <BreakdownPeriodsControl
                        months={breakdown.months}
                        hiddenMonths={hiddenMonths}
                        onHiddenMonthsChange={setHiddenMonths}
                    />
                </div>
            </section>

            {!showGrid ? (
                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="m-0 text-sm text-slate-600">
                        Every period is hidden. Open Periods to show a month again.
                    </p>
                </section>
            ) : (
                <section
                    ref={gridRef}
                    className="breakdown-grid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
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
            )}
        </main>
    );
}
