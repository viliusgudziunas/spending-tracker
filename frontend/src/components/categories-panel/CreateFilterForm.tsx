import { useCallback, useEffect, useState } from "react";
import { RULE_TYPES } from "../../clients/backendClient/schemas";
import { RuleOperator, RuleType } from "../../clients/backendClient/responseParsers";
import { useCreateFilterMutation } from "../../hooks/useFilterQueries";
import useFilterForm from "../../hooks/useFilterForm";

interface CreateFilterFormProps {
    categoryId: string;
}

const RULE_TYPE_LABELS: Record<RuleType, string> = {
    DESCRIPTION: "Description",
    AMOUNT: "Amount",
    PRODUCT: "Product",
};

export default function CreateFilterForm({ categoryId }: CreateFilterFormProps): JSX.Element {
    const [isOpen, setIsOpen] = useState(false);
    const filterFormStore = useFilterForm();
    const createFilterMutation = useCreateFilterMutation();

    const handleOpen = useCallback((): void => {
        filterFormStore.actions.resetFilter();
        filterFormStore.actions.changeFilter("categoryId", categoryId);
        filterFormStore.actions.initNewFilter("");
        setIsOpen(true);
    }, [categoryId, filterFormStore.actions]);

    useEffect(() => {
        if (!isOpen) return;
        filterFormStore.actions.changeFilter("categoryId", categoryId);
    }, [categoryId, filterFormStore.actions, isOpen]);

    const handleSubmit = useCallback(
        async (event: React.FormEvent): Promise<void> => {
            event.preventDefault();
            const { name, ruleGroups } = filterFormStore.state.filter;
            const trimmedName = name.trim();
            if (trimmedName === "") return;

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

            await createFilterMutation.mutateAsync({
                name: trimmedName,
                categoryId,
                ruleGroups: parsedRuleGroups,
            });
            setIsOpen(false);
            filterFormStore.actions.resetFilter();
        },
        [categoryId, createFilterMutation, filterFormStore.actions, filterFormStore.state.filter],
    );

    if (!isOpen) {
        return (
            <button
                type="button"
                onClick={handleOpen}
                className="w-full rounded-md border border-dashed border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
            >
                + New Filter
            </button>
        );
    }

    return (
        <form
            onSubmit={(event): void => void handleSubmit(event)}
            className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
        >
            <input
                type="text"
                value={filterFormStore.state.filter.name}
                onChange={(event): void => filterFormStore.actions.changeFilter("name", event.target.value)}
                placeholder="Filter name"
                autoFocus
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
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
                        filterFormStore.state.filter.name.trim() === "" ||
                        filterFormStore.state.filter.ruleGroups.some(
                            (group) => group.rules.length === 0 || group.rules.some((rule) => rule.value.trim() === ""),
                        ) ||
                        createFilterMutation.isPending
                    }
                    className="rounded-md bg-blue-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {createFilterMutation.isPending ? "Creating..." : "Create"}
                </button>
                <button
                    type="button"
                    onClick={(): void => {
                        setIsOpen(false);
                        filterFormStore.actions.resetFilter();
                    }}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
