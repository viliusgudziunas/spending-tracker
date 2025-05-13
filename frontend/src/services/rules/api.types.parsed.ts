import { RULE_GROUP_OPERATORS, RULE_OPERATORS, RULE_TYPES } from "../api.types";

export interface Category {
    id: string;
    name: string;
    filters: Filter[];
}

export interface Filter {
    id: string;
    name: string;
    categoryId: string;
    ruleGroups: RuleGroup[];
    position: number;
}

export interface RuleGroup {
    id: string;
    operator: RuleGroupOperator;
    rules: Rule[];
}

export interface Rule {
    id: string;
    type: RuleType;
    operator: RuleOperator;
    value: string;
}

export type RuleGroupOperator = (typeof RULE_GROUP_OPERATORS)[number];

export type RuleType = (typeof RULE_TYPES)[number];
export type RuleOperator = (typeof RULE_OPERATORS)[number];
