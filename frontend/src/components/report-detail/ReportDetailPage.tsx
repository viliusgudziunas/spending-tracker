import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ReportFilter, Transaction } from "../../clients/backendClient/responseParsers";
import { useDeleteReportMutation, useGenerateReportMutation, useReportQuery } from "../../hooks/useReportsQueries";
import CategoriesPanel from "../categories-panel/CategoriesPanel";
import { DEFAULT_PANEL_WIDTH, MAX_PANEL_WIDTH, MIN_PANEL_WIDTH, type RightPanel } from "./constants";
import AddToRuleGroupPanel from "./panels/AddToRuleGroupPanel";
import AddToReportFilterPanel from "./panels/AddToReportFilterPanel";
import CreateReportFilterPanel from "./panels/CreateReportFilterPanel";
import CreateTransactionFilterPanel from "./panels/CreateTransactionFilterPanel";
import TransactionPanel from "./panels/TransactionPanel";
import ReportSections from "./sections/ReportSections";

interface ReportDetailPageProps {
    reportId: string;
}

export default function ReportDetailPage({ reportId }: ReportDetailPageProps): JSX.Element {
    const navigate = useNavigate();
    const { data: report, isLoading, isError } = useReportQuery(reportId);
    const generateMutation = useGenerateReportMutation();
    const deleteMutation = useDeleteReportMutation();
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

    const handleCreateRuleFilterFromTransaction = useCallback((transaction: Transaction): void => {
        setRightPanel({ kind: "create-filter", transaction });
    }, []);

    const handleCreateReportFilterFromTransaction = useCallback((transaction: Transaction): void => {
        setRightPanel({ kind: "create-report-filter", transaction });
    }, []);

    const handleAddToRuleGroupFromTransaction = useCallback((transaction: Transaction): void => {
        setRightPanel({ kind: "add-rule-group", transaction });
    }, []);

    const handleAddToReportFilterFromTransaction = useCallback((transaction: Transaction): void => {
        setRightPanel({ kind: "add-report-filter", transaction });
    }, []);

    const handleDeleteReport = useCallback(async (): Promise<void> => {
        if (report === undefined) {
            return;
        }

        const shouldDelete = window.confirm(`Delete report "${report.name}"? This cannot be undone.`);
        if (!shouldDelete) {
            return;
        }

        await deleteMutation.mutateAsync(reportId);
        await navigate({ to: "/" });
    }, [deleteMutation, navigate, report, reportId]);

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
                        <button
                            type="button"
                            onClick={(): void => void handleDeleteReport()}
                            disabled={deleteMutation.isPending}
                            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {deleteMutation.isPending ? "Deleting..." : "Delete"}
                        </button>
                    </div>
                </div>
                {deleteMutation.isError ? (
                    <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 shadow-sm">
                        {deleteMutation.error.message}
                    </div>
                ) : null}

                <ReportSections
                    report={report}
                    onFilterClick={handleFilterClick}
                    onCreateRuleFilter={handleCreateRuleFilterFromTransaction}
                    onCreateReportFilter={handleCreateReportFilterFromTransaction}
                    onAddToRuleGroup={handleAddToRuleGroupFromTransaction}
                    onAddToReportFilter={handleAddToReportFilterFromTransaction}
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
                    {rightPanel.kind === "create-report-filter" ? (
                        <CreateReportFilterPanel
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
                    {rightPanel.kind === "add-report-filter" ? (
                        <AddToReportFilterPanel
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
