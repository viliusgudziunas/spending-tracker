import {
    ApiCategory,
    ApiFilter,
    ApiRule,
    ApiRuleGroup,
    RULE_GROUP_OPERATORS,
    RULE_OPERATORS,
    RULE_TYPES,
} from "../api.types";
import { Category, Filter, Rule, RuleGroup, RuleGroupOperator, RuleOperator, RuleType } from "./api.types.parsed";

export const parseApiCategories = (apiCategories: ApiCategory[]): Category[] =>
    apiCategories.map((category) => parseApiCategory(category));

export const parseApiCategory = (category: ApiCategory): Category => ({
    id: category.id,
    name: category.name,
    filters: category.filters.map((filter) => parseApiFilter(filter)),
});

const parseApiFilter = (apiFilter: ApiFilter): Filter => ({
    id: apiFilter.id,
    name: apiFilter.name,
    position: apiFilter.position,
    categoryId: apiFilter.category_id,
    ruleGroups: apiFilter.rule_groups.map((ruleGroup) => parseApiRuleGroup(ruleGroup)),
});

const parseApiRuleGroup = (ruleGroup: ApiRuleGroup): RuleGroup => ({
    id: ruleGroup.id,
    operator: parseApiRuleGroupOperator(ruleGroup.operator),
    rules: ruleGroup.rules.map((rule) => parseApiRule(rule)),
});

const parseApiRule = (rule: ApiRule): Rule => ({
    id: rule.id,
    type: parseApiRuleType(rule.type),
    operator: parseApiRuleOperator(rule.operator),
    value: rule.value,
});

const parseApiRuleGroupOperator = (operator: string): RuleGroupOperator => {
    if (!RULE_GROUP_OPERATORS.includes(operator as RuleGroupOperator)) {
        throw new Error("Invalid rule group operator");
    }

    return operator as RuleGroupOperator;
};

const parseApiRuleType = (type: string): RuleType => {
    if (!RULE_TYPES.includes(type as RuleType)) {
        throw new Error("Invalid rule type");
    }

    return type as RuleType;
};

const parseApiRuleOperator = (operator: string): RuleOperator => {
    if (!RULE_OPERATORS.includes(operator as RuleOperator)) {
        throw new Error("Invalid rule operator");
    }

    return operator as RuleOperator;
};
