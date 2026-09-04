import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Transaction } from "../../../clients/backendClient/responseParsers";
import { useAssignReportTransactionMutation, useReportQuery } from "../../../hooks/useReportsQueries";

interface AddToReportFilterPanelProps {
    reportId: string;
    transaction: Transaction;
    excludeFilterId?: string;
    onClose: () => void;
    width: number;
}

export default function AddToReportFilterPanel({
    reportId,
    transaction,
    excludeFilterId,
    onClose,
    width,
}: AddToReportFilterPanelProps): JSX.Element {
    const { data: report, isLoading: isReportLoading, isError: isReportError } = useReportQuery(reportId);
    const assignReportTransactionMutation = useAssignReportTransactionMutation();
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [selectedFilterId, setSelectedFilterId] = useState("");
    const [submitError, setSubmitError] = useState<string | null>(null);

    const categoriesWithAssignableFilters = useMemo(
        () =>
            (report?.categories ?? [])
                .map((category) => ({
                    ...category,
                    filters: category.filters.filter((filter) => filter.id !== excludeFilterId),
                }))
                .filter((category) => category.filters.length > 0),
        [excludeFilterId, report?.categories],
    );
    const selectedCategory = useMemo(
        () => categoriesWithAssignableFilters.find((category) => category.id === selectedCategoryId),
        [categoriesWithAssignableFilters, selectedCategoryId],
    );
    const selectedFilter = useMemo(
        () => selectedCategory?.filters.find((filter) => filter.id === selectedFilterId),
        [selectedCategory, selectedFilterId],
    );
    const isSubmitting = assignReportTransactionMutation.isPending;
    const reportRef = useRef(report);
    reportRef.current = report;

    useEffect(() => {
        setSelectedFilterId("");
        setSubmitError(null);
        const currentReport = reportRef.current;
        if (excludeFilterId === undefined || currentReport === undefined) {
            setSelectedCategoryId("");
            return;
        }
        const sourceCategory = currentReport.categories.find((category) =>
            category.filters.some((filter) => filter.id === excludeFilterId),
        );
        const hasSiblingFilter = sourceCategory?.filters.some((filter) => filter.id !== excludeFilterId) ?? false;
        setSelectedCategoryId(sourceCategory !== undefined && hasSiblingFilter ? sourceCategory.id : "");
    }, [excludeFilterId, reportId, transaction.id]);

    useEffect(() => {
        setSelectedFilterId("");
    }, [selectedCategoryId]);

    const hasAnyFilters = categoriesWithAssignableFilters.length > 0;
    const isMove = excludeFilterId !== undefined;
    let submitLabel = "Assign to filter";
    if (isMove) {
        submitLabel = isSubmitting ? "Moving..." : "Move to filter";
    } else if (isSubmitting) {
        submitLabel = "Assigning...";
    }

    const handleSubmit = useCallback(
        async (event: React.FormEvent): Promise<void> => {
            event.preventDefault();
            if (selectedFilter === undefined) return;

            setSubmitError(null);
            const payload = selectedFilter.isManual
                ? { targetReportFilterId: selectedFilter.id }
                : selectedFilter.ruleFilterId !== undefined
                  ? { targetRuleFilterId: selectedFilter.ruleFilterId }
                  : null;
            if (payload === null) {
                setSubmitError(
                    excludeFilterId !== undefined
                        ? "This filter cannot be used as a destination."
                        : "Selected filter cannot be assigned.",
                );
                return;
            }
            try {
                await assignReportTransactionMutation.mutateAsync({
                    reportId,
                    transactionId: transaction.id,
                    payload,
                });
                onClose();
            } catch (error: unknown) {
                if (error instanceof Error && error.message.trim().length > 0) {
                    setSubmitError(error.message);
                } else {
                    setSubmitError(
                        excludeFilterId !== undefined
                            ? "Failed to move the transaction."
                            : "Failed to assign transaction to filter.",
                    );
                }
            }
        },
        [assignReportTransactionMutation, excludeFilterId, onClose, reportId, selectedFilter, transaction.id],
    );

    return (
        <div
            className="sticky top-4 flex max-h-[calc(100vh-2rem)] shrink-0 flex-col gap-3 self-start"
            style={{ width }}
        >
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="min-w-0">
                    <h2 className="m-0 truncate text-lg font-semibold text-slate-900">
                        {isMove ? "Move to another filter" : "Add to Report Filter"}
                    </h2>
                    <p className="m-0 mt-0.5 text-xs text-slate-400">
                        {isMove
                            ? "Move this transaction to a different filter"
                            : "Assign selected transaction to an existing filter"}
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

            <form
                onSubmit={(event): void => void handleSubmit(event)}
                className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
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
                        disabled={isReportLoading || isReportError || !hasAnyFilters}
                        required
                    >
                        <option value="">Select category</option>
                        {categoriesWithAssignableFilters.map((category) => (
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
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600">
                        Transaction will be {isMove ? "moved" : "assigned"} to <strong>{selectedFilter.name}</strong>.
                    </div>
                ) : null}

                {isReportError ? <div className="text-xs text-red-600">Failed to load report filters.</div> : null}
                {!isReportError && !isReportLoading && !hasAnyFilters ? (
                    <div className="text-xs text-amber-700">
                        {isMove
                            ? "This is the only filter. Create another filter first, then you can move the transaction."
                            : "No filters found. Create a filter first."}
                    </div>
                ) : null}
                {submitError !== null ? <div className="text-xs text-red-600">{submitError}</div> : null}

                <div className="flex gap-2">
                    <button
                        type="submit"
                        disabled={isSubmitting || selectedFilterId === ""}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitLabel}
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
