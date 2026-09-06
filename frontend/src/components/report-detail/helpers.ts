import {
    type ReportCategory,
    type ReportFilter,
    type RuleType,
    type Transaction,
} from "@/clients/backendClient/responseParsers";

import type { FilterRow } from "./constants";

function buildFilterRows(filters: ReportFilter[]): FilterRow[] {
    return filters
        .filter((filter) => filter.transactions.length > 0)
        .map((filter) => ({
            id: filter.id,
            name: filter.name,
            amount: filter.amount,
            transactionCount: filter.transactions.length,
        }));
}

function getTransactionRuleValue(transaction: Transaction, ruleType: RuleType): string {
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

function buildCategoryTsv(category: ReportCategory): string {
    return category.filters
        .filter((filter) => filter.transactions.length > 0)
        .map((filter) => `${filter.amount}\t${filter.name}`)
        .join("\n");
}

export { buildCategoryTsv, buildFilterRows, getTransactionRuleValue };
