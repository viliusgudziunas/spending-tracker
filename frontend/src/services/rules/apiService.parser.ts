import {
    CreateApiFilterPayload,
    CreateApiRuleGroupPayload,
    CreateApiRulePayload,
    UpdateApiFilterPayload,
    UpdateApiRuleGroupPayload,
    UpdateApiRulePayload,
} from "../api.types";
import { CreateFilterPayload, CreateRuleGroupPayload, CreateRulePayload, UpdateFilterPayload } from "./apiService";

export const parseIntoCreateApiFilterPayload = (filter: CreateFilterPayload): CreateApiFilterPayload => ({
    name: filter.name,
    category_id: filter.categoryId,
    rule_groups: filter.ruleGroups.map((ruleGroup) => parseIntoCreateApiRuleGroupPayload(ruleGroup)),
});

const parseIntoCreateApiRuleGroupPayload = (ruleGroup: CreateRuleGroupPayload): CreateApiRuleGroupPayload => ({
    operator: ruleGroup.operator,
    rules: ruleGroup.rules.map((rule) => parseIntoCreateApiRulePayload(rule)),
});

const parseIntoCreateApiRulePayload = (rule: CreateRulePayload): CreateApiRulePayload => ({
    type: rule.type,
    operator: rule.operator,
    value: rule.value,
});

export const parseIntoUpdateApiFilterPayload = (filter: UpdateFilterPayload): UpdateApiFilterPayload => ({
    name: filter.name,
    position: filter.position,
    category_id: filter.categoryId,
    rule_groups: filter.ruleGroups.map((ruleGroup) => parseIntoUpdateApiRuleGroupPayload(ruleGroup)),
});

const parseIntoUpdateApiRuleGroupPayload = (ruleGroup: CreateRuleGroupPayload): UpdateApiRuleGroupPayload => ({
    operator: ruleGroup.operator,
    rules: ruleGroup.rules.map((rule) => parseIntoUpdateApiRulePayload(rule)),
});

const parseIntoUpdateApiRulePayload = (rule: CreateRulePayload): UpdateApiRulePayload => ({
    type: rule.type,
    operator: rule.operator,
    value: rule.value,
});
