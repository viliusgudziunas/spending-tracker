import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Filter, Rule, RuleGroup, RuleOperator, RuleType } from "../services/rules/api.types.parsed";

type NewFilter = Omit<Filter, "id" | "ruleGroups" | "position"> & { ruleGroups: NewRuleGroup[] } & Partial<
        Pick<Filter, "id" | "position">
    >;
type NewRuleGroup = Omit<RuleGroup, "id" | "rules"> & { rules: NewRule[] } & Partial<Pick<RuleGroup, "id">>;
type NewRule = Omit<Rule, "id"> & Partial<Pick<Rule, "id">>;

const emptyFilter: NewFilter = { name: "", categoryId: "", ruleGroups: [] };
const emptyRuleGroup: NewRuleGroup = { operator: "AND", rules: [] };
const emptyRule: NewRule = { type: "DESCRIPTION", operator: "EQUAL", value: "" };

type ChangeFilter = {
    (field: "name", value: string): void;
    (field: "categoryId", value: string): void;
    (field: "position", value: number): void;
};

type ChangeRule = {
    (groupId: string, ruleId: string, field: "type", value: RuleType): void;
    (groupId: string, ruleId: string, field: "operator", value: RuleOperator): void;
    (groupId: string, ruleId: string, field: "value", value: string): void;
};

export interface UseFilterForm {
    actions: {
        initNewFilter: (rule: string) => void;
        initExistingFilter: (filter: Filter) => void;
        changeFilter: ChangeFilter;
        addRuleGroup: (rule?: string) => void;
        addRule: (groupId: string) => void;
        changeRule: ChangeRule;
        removeRuleGroup: (groupId: string) => void;
        resetFilter: () => void;
        specifyPosition: () => void;
    };
    state: {
        filter: NewFilter;
    };
}

const useFilterForm = (): UseFilterForm => {
    const [filter, setFilter] = useState<NewFilter>(emptyFilter);

    const initNewFilter = (rule: string): void => {
        setFilter((currentFilter) => ({
            ...currentFilter,
            ruleGroups: [
                {
                    ...emptyRuleGroup,
                    id: `temp-${uuidv4()}`,
                    rules: [{ ...emptyRule, id: `temp-${uuidv4()}`, value: rule }],
                },
            ],
        }));
    };

    const initExistingFilter = (filter: Filter): void => {
        setFilter((currentFilter) => ({ ...currentFilter, ...filter }));
    };

    const changeFilter: ChangeFilter = (field: "name" | "categoryId" | "position", value: string | number) => {
        setFilter((currentFilter) => ({ ...currentFilter, [field]: value }));
    };

    const addRuleGroup = (rule?: string): void => {
        setFilter((currentFilter) => ({
            ...currentFilter,
            ruleGroups: [
                ...currentFilter.ruleGroups,
                {
                    ...emptyRuleGroup,
                    id: `temp-${uuidv4()}`,
                    rules: [{ ...emptyRule, id: `temp-${uuidv4()}`, value: rule || "" }],
                },
            ],
        }));
    };

    const addRule = (groupId: string): void => {
        const changingRuleGroup = filter.ruleGroups.find((group) => group.id === groupId);
        if (!changingRuleGroup) return;

        const changingRuleGroupIndex = filter.ruleGroups.indexOf(changingRuleGroup);

        const newRuleGroups = [...filter.ruleGroups];
        newRuleGroups[changingRuleGroupIndex].rules.push({ ...emptyRule, id: `temp-${uuidv4()}` });
        setFilter((currentFilter) => ({ ...currentFilter, ruleGroups: newRuleGroups }));
    };

    const changeRule: ChangeRule = (
        groupId: string,
        ruleId: string,
        field: keyof NewRule,
        value: RuleType | RuleOperator | string
    ) => {
        const changingRuleGroup = filter.ruleGroups.find((group) => group.id === groupId);
        const changingRule = changingRuleGroup?.rules.find((rule) => rule.id === ruleId);
        if (!changingRuleGroup || !changingRule) return;

        const changingRuleGroupIndex = filter.ruleGroups.indexOf(changingRuleGroup);
        const changingRuleIndex = changingRuleGroup.rules.indexOf(changingRule);

        const newRuleGroups = [...filter.ruleGroups];
        const updatedRule = { ...changingRule, [field]: value };

        newRuleGroups[changingRuleGroupIndex].rules[changingRuleIndex] = updatedRule;
        setFilter((currentFilter) => ({ ...currentFilter, ruleGroups: newRuleGroups }));
    };

    const removeRuleGroup = (groupId: string): void => {
        const newCompositeRules = filter.ruleGroups.filter((group) => group.id !== groupId);
        setFilter({ ...filter, ruleGroups: newCompositeRules });
    };

    const resetFilter = (): void => {
        setFilter(emptyFilter);
    };

    const specifyPosition = (): void => {
        setFilter((currentFilter) => ({ ...currentFilter, position: 0 }));
    };

    return {
        actions: {
            initNewFilter,
            initExistingFilter,
            changeFilter,
            addRuleGroup,
            addRule,
            changeRule,
            removeRuleGroup,
            resetFilter,
            specifyPosition,
        },
        state: { filter },
    };
};

export default useFilterForm;
