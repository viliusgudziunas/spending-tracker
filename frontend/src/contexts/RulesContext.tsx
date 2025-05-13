import { createContext, PropsWithChildren, useState } from "react";
import { Category, Filter, RuleGroupOperator, RuleOperator, RuleType } from "../services/rules/api.types.parsed";
import rulesApi from "../services/rules/apiService";

interface CreateCategoryPayload {
    name: string;
}

interface CreateFilterPayload {
    name: string;
    categoryId: string;
    ruleGroups: CreateRuleGroupPayload[];
}

interface CreateRuleGroupPayload {
    operator: RuleGroupOperator;
    rules: CreateRulePayload[];
}

interface CreateRulePayload {
    type: RuleType;
    operator: RuleOperator;
    value: string;
}

interface UpdateFilterPayload {
    name: string;
    position?: number;
    categoryId: string;
    ruleGroups: UpdateRuleGroupPayload[];
}

interface UpdateRuleGroupPayload {
    operator: RuleGroupOperator;
    rules: UpdateRulePayload[];
}

interface UpdateRulePayload {
    type: RuleType;
    operator: RuleOperator;
    value: string;
}

export interface RulesContextType {
    actions: {
        createCategory: (category: CreateCategoryPayload) => Promise<Category>;
        createFilter: (filter: CreateFilterPayload) => Promise<Filter>;
        fetchCategories: () => Promise<void>;
        updateFilter: (filterId: string, payload: UpdateFilterPayload) => Promise<Filter>;
    };
    state: {
        categories: Category[];
    };
}

const defaultContext: RulesContextType = {
    actions: {
        createCategory: async () => ({} as Category),
        createFilter: async () => ({} as Filter),
        fetchCategories: async () => {},
        updateFilter: async () => ({} as Filter),
    },
    state: {
        categories: [],
    },
};

export const RulesContext = createContext<RulesContextType>(defaultContext);

export const RulesProvider: React.FC<PropsWithChildren> = ({ children }) => {
    const [categories, setCategories] = useState<Category[]>([]);

    const createCategory = async (payload: CreateCategoryPayload): Promise<Category> =>
        rulesApi.createCategory(payload);
    const createFilter = async (payload: CreateFilterPayload): Promise<Filter> => rulesApi.createFilter(payload);
    const fetchCategories = async (): Promise<void> => setCategories(await rulesApi.fetchCategories());
    const updateFilter = async (filterId: string, payload: UpdateFilterPayload): Promise<Filter> =>
        rulesApi.updateFilter(filterId, payload);

    return (
        <RulesContext.Provider
            value={{
                actions: {
                    createCategory,
                    createFilter,
                    fetchCategories,
                    updateFilter,
                },
                state: {
                    categories,
                },
            }}
        >
            {children}
        </RulesContext.Provider>
    );
};
