import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { type ReportFilter, type Transaction } from "@/clients/backendClient/responseParsers";
import CategoriesPanel from "@/components/categories-panel/CategoriesPanel";
import {
    useDeleteReportMutation,
    useGenerateReportMutation,
    usePatchReportMutation,
    useRemoveReportTransactionAssignmentMutation,
    useReportQuery,
} from "@/hooks/useReportsQueries";

import { DEFAULT_PANEL_WIDTH, MAX_PANEL_WIDTH, MIN_PANEL_WIDTH, type RightPanel } from "./constants";
import AddToReportFilterPanel from "./panels/AddToReportFilterPanel";
import AddToRuleGroupPanel from "./panels/AddToRuleGroupPanel";
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
    const patchMutation = usePatchReportMutation();
    const removeAssignmentMutation = useRemoveReportTransactionAssignmentMutation();
    const [rightPanel, setRightPanel] = useState<RightPanel | null>(null);
    const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedReportName, setEditedReportName] = useState("");
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

    const handleCloseAddToReportFilter = useCallback((): void => {
        setRightPanel((prev) => {
            if (prev?.kind === "add-report-filter" && prev.sourceFilter !== undefined) {
                return { kind: "filter", filter: prev.sourceFilter };
            }
            return null;
        });
    }, []);

    const handleMoveToAnotherFilterFromTransaction = useCallback(
        (transaction: Transaction): void => {
            if (rightPanel?.kind !== "filter") {
                setRightPanel({ kind: "add-report-filter", transaction });
                return;
            }
            setRightPanel({
                kind: "add-report-filter",
                transaction,
                sourceFilter: rightPanel.filter,
            });
        },
        [rightPanel],
    );

    const handleRemoveManualAssignmentFromTransaction = useCallback(
        async (transaction: Transaction): Promise<void> => {
            await removeAssignmentMutation.mutateAsync({
                reportId,
                transactionId: transaction.id,
            });
        },
        [removeAssignmentMutation, reportId],
    );

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

    const handleStartEditingName = useCallback((): void => {
        if (report === undefined) {
            return;
        }

        setEditedReportName(report.name);
        setIsEditingName(true);
    }, [report]);

    const handleCancelEditingName = useCallback((): void => {
        if (report !== undefined) {
            setEditedReportName(report.name);
        }
        setIsEditingName(false);
    }, [report]);

    const handleSubmitReportName = useCallback(
        async (event: React.FormEvent): Promise<void> => {
            event.preventDefault();
            if (report === undefined) {
                return;
            }

            const trimmedName = editedReportName.trim();
            if (trimmedName === "" || trimmedName === report.name) {
                setEditedReportName(report.name);
                setIsEditingName(false);
                return;
            }

            await patchMutation.mutateAsync({
                reportId,
                payload: { name: trimmedName },
            });
            setIsEditingName(false);
        },
        [editedReportName, patchMutation, report, reportId],
    );

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

    useEffect(() => {
        if (!isEditingName && report !== undefined) {
            setEditedReportName(report.name);
        }
    }, [isEditingName, report]);

    const selectedPanelFilter = useMemo(() => {
        if (report === undefined || rightPanel?.kind !== "filter") {
            return null;
        }

        for (const category of report.categories) {
            const matchedFilter = category.filters.find((filter) => filter.id === rightPanel.filter.id);
            if (matchedFilter !== undefined) {
                return matchedFilter;
            }
        }

        return null;
    }, [report, rightPanel]);

    useEffect(() => {
        if (rightPanel?.kind !== "filter") {
            return;
        }
        if (selectedPanelFilter !== null) {
            return;
        }
        setRightPanel(null);
    }, [rightPanel, selectedPanelFilter]);

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
                    {isEditingName ? (
                        <form onSubmit={(event): void => void handleSubmitReportName(event)} className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                                <input
                                    type="text"
                                    value={editedReportName}
                                    onChange={(event): void => setEditedReportName(event.target.value)}
                                    autoFocus
                                    className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-base font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                />
                                <button
                                    type="submit"
                                    disabled={patchMutation.isPending || editedReportName.trim() === ""}
                                    className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {patchMutation.isPending ? "Saving..." : "Save"}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCancelEditingName}
                                    disabled={patchMutation.isPending}
                                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        <h1 className="m-0 text-2xl font-semibold text-slate-900">{report.name}</h1>
                    )}
                    <div className="flex items-center gap-2">
                        {!isEditingName ? (
                            <button
                                type="button"
                                onClick={handleStartEditingName}
                                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                            >
                                Rename
                            </button>
                        ) : null}
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
                {patchMutation.isError ? (
                    <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 shadow-sm">
                        {patchMutation.error.message}
                    </div>
                ) : null}
                {removeAssignmentMutation.isError ? (
                    <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 shadow-sm">
                        {removeAssignmentMutation.error.message}
                    </div>
                ) : null}

                <ReportSections
                    report={report}
                    onFilterClick={handleFilterClick}
                    onCreateRuleFilter={handleCreateRuleFilterFromTransaction}
                    onCreateReportFilter={handleCreateReportFilterFromTransaction}
                    onAddToRuleGroup={handleAddToRuleGroupFromTransaction}
                    onAddToReportFilter={handleAddToReportFilterFromTransaction}
                    selectedFilterId={selectedPanelFilter?.id ?? null}
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
                    {rightPanel.kind === "filter" && selectedPanelFilter !== null ? (
                        <TransactionPanel
                            filter={selectedPanelFilter}
                            onClose={handleClosePanel}
                            onMoveToAnotherFilter={
                                report.categories.some((category) =>
                                    category.filters.some((item) => item.id !== selectedPanelFilter.id),
                                )
                                    ? handleMoveToAnotherFilterFromTransaction
                                    : undefined
                            }
                            onRemoveManualAssignment={handleRemoveManualAssignmentFromTransaction}
                            isRemovingManualAssignment={removeAssignmentMutation.isPending}
                            width={panelWidth}
                        />
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
                            excludeFilterId={rightPanel.sourceFilter?.id}
                            onClose={handleCloseAddToReportFilter}
                            width={panelWidth}
                        />
                    ) : null}
                </>
            ) : null}
        </div>
    );
}
