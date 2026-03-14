import { useCallback, useEffect, useMemo, useState } from "react";
import { Transaction } from "../../../clients/backendClient/responseParsers";
import { useCategoriesQuery } from "../../../hooks/useCategoryQueries";
import {
    useAssignReportTransactionMutation,
    useCreateReportManualFilterMutation,
} from "../../../hooks/useReportsQueries";

interface CreateReportFilterPanelProps {
    reportId: string;
    transaction: Transaction;
    onClose: () => void;
    width: number;
}

export default function CreateReportFilterPanel({
    reportId,
    transaction,
    onClose,
    width,
}: CreateReportFilterPanelProps): JSX.Element {
    const { data: categories, isLoading: isCategoriesLoading, isError: isCategoriesError } = useCategoriesQuery();
    const createReportManualFilterMutation = useCreateReportManualFilterMutation();
    const assignReportTransactionMutation = useAssignReportTransactionMutation();
    const [filterName, setFilterName] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [submitError, setSubmitError] = useState<string | null>(null);

    const selectedCategory = useMemo(
        () => (categories ?? []).find((category) => category.id === categoryId),
        [categories, categoryId],
    );
    const isSubmitting = createReportManualFilterMutation.isPending || assignReportTransactionMutation.isPending;

    useEffect(() => {
        setFilterName(transaction.description);
        setCategoryId("");
        setSubmitError(null);
    }, [transaction.description, transaction.id, reportId]);

    const handleSubmit = useCallback(
        async (event: React.FormEvent): Promise<void> => {
            event.preventDefault();
            if (filterName.trim() === "" || categoryId === "") return;

            setSubmitError(null);
            try {
                const createdFilter = await createReportManualFilterMutation.mutateAsync({
                    reportId,
                    payload: {
                        name: filterName.trim(),
                        categoryId,
                    },
                });
                await assignReportTransactionMutation.mutateAsync({
                    reportId,
                    transactionId: transaction.id,
                    payload: { targetReportFilterId: createdFilter.id },
                });
                onClose();
            } catch (error: unknown) {
                if (error instanceof Error && error.message.trim().length > 0) {
                    setSubmitError(error.message);
                } else {
                    setSubmitError("Failed to create report filter.");
                }
            }
        },
        [
            assignReportTransactionMutation,
            categoryId,
            createReportManualFilterMutation,
            filterName,
            onClose,
            reportId,
            transaction.id,
        ],
    );

    return (
        <div
            className="sticky top-4 flex max-h-[calc(100vh-2rem)] shrink-0 flex-col gap-3 self-start"
            style={{ width }}
        >
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="min-w-0">
                    <h2 className="m-0 truncate text-lg font-semibold text-slate-900">Create Report Filter</h2>
                    <p className="m-0 mt-0.5 text-xs text-slate-400">
                        Create a report-only filter and assign transaction
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
                        value={filterName}
                        onChange={(event): void => setFilterName(event.target.value)}
                        className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                        required
                    />
                </label>

                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                    Category
                    <select
                        value={categoryId}
                        onChange={(event): void => setCategoryId(event.target.value)}
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
                {selectedCategory !== undefined ? (
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600">
                        Transaction will be assigned to <strong>{selectedCategory.name}</strong>.
                    </div>
                ) : null}

                {isCategoriesError ? <div className="text-xs text-red-600">Failed to load categories.</div> : null}
                {submitError !== null ? <div className="text-xs text-red-600">{submitError}</div> : null}

                <div className="flex gap-2">
                    <button
                        type="submit"
                        disabled={isSubmitting || filterName.trim() === "" || categoryId === ""}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSubmitting ? "Creating..." : "Create and assign"}
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
