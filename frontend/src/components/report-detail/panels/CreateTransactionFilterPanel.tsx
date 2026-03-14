import { useCallback, useEffect, useState } from "react";
import useFilterForm from "../../../hooks/useFilterForm";
import { RULE_OPERATORS, RULE_TYPES } from "../../../clients/backendClient/schemas";
import { RuleOperator, RuleType, Transaction } from "../../../clients/backendClient/responseParsers";
import { useCategoriesQuery } from "../../../hooks/useCategoryQueries";
import { useCreateFilterMutation } from "../../../hooks/useFilterQueries";
import { useGenerateReportMutation } from "../../../hooks/useReportsQueries";
import { OPERATOR_LABELS, RULE_TYPE_LABELS } from "../constants";
import { getTransactionRuleValue } from "../helpers";

interface CreateTransactionFilterPanelProps {
    reportId: string;
    transaction: Transaction;
    onClose: () => void;
    width: number;
}

export default function CreateTransactionFilterPanel({
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
    }, [transaction.description, transaction.id]);

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
