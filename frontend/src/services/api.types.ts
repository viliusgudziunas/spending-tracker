export interface ApiReport {
    id: string;
    name: string;
    categories: ApiReportCategory[];
    unidentified_transactions: ApiTransaction[];
}

export interface ApiReportCategory {
    id: string;
    name: string;
    filters: ApiReportFilter[];
}

export interface ApiReportFilter {
    id: string;
    name: string;
    amount: string;
    transactions: ApiTransaction[];
}

export interface ApiTransaction {
    id: string;
    description: string;
    amount: number;
    started_date: string;
    completed_date: string;
    source: string | null;
}

export interface ApiCategory {
    id: string;
    name: string;
    filters: ApiFilter[];
}

export interface ApiFilter {
    id: string;
    name: string;
    position: number;
    category_id: string;
    rule_groups: ApiRuleGroup[];
}

export interface ApiRuleGroup {
    id: string;
    operator: string;
    filter_id: string;
    rules: ApiRule[];
}

export interface ApiRule {
    id: string;
    type: string;
    operator: string;
    value: string;
    group_id: string;
}

export interface ApiOverride {
    id: string;
    category_name: string;
    filter_name: string;
    transaction_id: string;
}

export const TRANSACTION_SOURCES = ["generated", "override", null] as const;
export const RULE_GROUP_OPERATORS = ["AND"] as const;
export const RULE_TYPES = ["DESCRIPTION", "AMOUNT"] as const;
export const RULE_OPERATORS = [
    "EQUAL",
    "NOT_EQUAL",
    "GREATER_THAN",
    "LESS_THAN",
    "GREATER_THAN_EQUAL",
    "LESS_THAN_EQUAL",
] as const;

export type CreateApiFilterPayload = Omit<ApiFilter, "id" | "rule_groups" | "position"> & {
    rule_groups: CreateApiRuleGroupPayload[];
};
export type CreateApiRuleGroupPayload = Omit<ApiRuleGroup, "id" | "filter_id" | "rules"> & {
    rules: CreateApiRulePayload[];
};
export type CreateApiRulePayload = Omit<ApiRule, "id" | "group_id">;

export type UpdateApiFilterPayload = Omit<ApiFilter, "id" | "rule_groups" | "position"> & {
    rule_groups: UpdateApiRuleGroupPayload[];
    position?: number;
};
export type UpdateApiRuleGroupPayload = Omit<ApiRuleGroup, "id" | "filter_id" | "rules"> & {
    rules: UpdateApiRulePayload[];
};
export type UpdateApiRulePayload = Omit<ApiRule, "id" | "group_id">;

export type CreateApiOverridePayload = {
    filter_id: string;
    transaction_id: string;
};
