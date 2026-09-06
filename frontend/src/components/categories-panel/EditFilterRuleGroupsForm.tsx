import { useCallback, useEffect } from "react";

import { type Filter, type RuleOperator, type RuleType } from "@/clients/backendClient/responseParsers";
import { RULE_TYPES } from "@/clients/backendClient/schemas";
import useFilterForm from "@/hooks/useFilterForm";
import { usePutFilterRuleGroupsMutation } from "@/hooks/useFilterQueries";

interface EditFilterRuleGroupsFormProps {
    filter: Filter;
    onClose: () => void;
}

const RULE_TYPE_LABELS: Record<RuleType, string> = {
    DESCRIPTION: "Description",
    AMOUNT: "Amount",
    PRODUCT: "Product",
};

export default function EditFilterRuleGroupsForm({ filter, onClose }: EditFilterRuleGroupsFormProps): JSX.Element {
    const filterFormStore = useFilterForm();
    const putRuleGroupsMutation = usePutFilterRuleGroupsMutation();

    useEffect(() => {
        filterFormStore.actions.initExistingFilter(filter);
    }, []);

    const handleSubmit = useCallback(
        async (event: React.FormEvent): Promise<void> => {
            event.preventDefault();

            const parsedRuleGroups = filterFormStore.state.filter.ruleGroups.map((group) => ({
                id: group.id?.startsWith("temp-") ? undefined : group.id,
                operator: group.operator,
                rules: group.rules.map((rule) => ({
                    id: rule.id?.startsWith("temp-") ? undefined : rule.id,
                    type: rule.type,
                    operator: rule.operator,
                    value: rule.value.trim(),
                })),
            }));

            const hasInvalidRules = parsedRuleGroups.some(
                (group) => group.rules.length === 0 || group.rules.some((rule) => rule.value === ""),
            );
            if (hasInvalidRules) return;

            await putRuleGroupsMutation.mutateAsync({
                filterId: filter.id,
                payload: { ruleGroups: parsedRuleGroups },
            });
            onClose();
        },
        [filter.id, putRuleGroupsMutation, filterFormStore.state.filter, onClose],
    );

    return (
        <form
            onSubmit={(event): void => void handleSubmit(event)}
            className="flex flex-col gap-2 rounded-md border border-blue-200 bg-blue-50/30 p-2"
        >
            {filterFormStore.state.filter.ruleGroups.map((group, groupIndex) => (
                <div key={group.id} className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-600">
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
                        <div
                            key={rule.id}
                            className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-2"
                        >
                            <div className="grid grid-cols-2 gap-2">
                                <select
                                    value={rule.type}
                                    onChange={(event): void =>
                                        filterFormStore.actions.changeRule(
                                            group.id as string,
                                            rule.id as string,
                                            "type",
                                            event.target.value as RuleType,
                                        )
                                    }
                                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                >
                                    {RULE_TYPES.map((type) => (
                                        <option key={type} value={type}>
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
                                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                >
                                    <option value="EQUAL">= Equal</option>
                                    <option value="NOT_EQUAL">&#x2260; Not equal</option>
                                    <option value="GREATER_THAN">&gt; Greater than</option>
                                    <option value="LESS_THAN">&lt; Less than</option>
                                    <option value="GREATER_THAN_EQUAL">&gt;= Greater/equal</option>
                                    <option value="LESS_THAN_EQUAL">&lt;= Less/equal</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
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
                                    placeholder={
                                        rule.type === "AMOUNT"
                                            ? "Amount value (e.g. 12.50)"
                                            : rule.type === "PRODUCT"
                                              ? 'Product value (e.g. "Credit Card")'
                                              : 'Description value (e.g. "Netflix")'
                                    }
                                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                />
                                <button
                                    type="button"
                                    disabled={group.rules.length === 1}
                                    onClick={(): void =>
                                        filterFormStore.actions.removeRule(group.id as string, rule.id as string)
                                    }
                                    className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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
            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={
                        filterFormStore.state.filter.ruleGroups.some(
                            (group) => group.rules.length === 0 || group.rules.some((rule) => rule.value.trim() === ""),
                        ) || putRuleGroupsMutation.isPending
                    }
                    className="rounded-md bg-blue-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {putRuleGroupsMutation.isPending ? "Saving..." : "Save"}
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
