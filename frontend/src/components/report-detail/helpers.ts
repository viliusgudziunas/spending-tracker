import {
    type Filter,
    type ReportCategory,
    type ReportFilter,
    type RuleType,
    type Transaction,
} from "@/clients/backendClient/responseParsers";

import type { FilterRow } from "./constants";

export function buildFilterRows(filters: ReportFilter[]): FilterRow[] {
    return filters
        .filter((filter) => filter.transactions.length > 0)
        .map((filter) => ({
            id: filter.id,
            name: filter.name,
            amount: filter.amount,
            transactionCount: filter.transactions.length,
        }));
}

export function getTransactionRuleValue(transaction: Transaction, ruleType: RuleType): string {
    switch (ruleType) {
        case "DESCRIPTION":
            return transaction.description;
        case "PRODUCT":
            return transaction.product;
        case "AMOUNT":
            return String(transaction.amount);
        default:
            return transaction.description;
    }
}

export function descriptionRuleValuesForSearch(filter: Pick<Filter, "ruleGroups">): string[] {
    return filter.ruleGroups.flatMap((group) =>
        group.rules
            .filter((rule) => rule.type === "DESCRIPTION" && rule.operator === "EQUAL")
            .map((rule) => rule.value),
    );
}

export function buildCategoryTsv(category: ReportCategory): string {
    return category.filters
        .filter((filter) => filter.transactions.length > 0)
        .map((filter) => `${filter.amount}\t${filter.name}`)
        .join("\n");
}
