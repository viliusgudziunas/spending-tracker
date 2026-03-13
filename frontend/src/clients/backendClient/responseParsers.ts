import { z } from "zod";
import {
    ApiCategorySchema,
    ApiFilterSchema,
    ApiReportCategorySchema,
    ApiReportFilterSchema,
    ApiReportSchema,
    ApiRuleGroupSchema,
    ApiRuleSchema,
    ApiTransactionSchema,
    RULE_GROUP_OPERATORS,
    RULE_OPERATORS,
    RULE_TYPES,
} from "./schemas";

export const RuleGroupOperatorSchema = z.enum(RULE_GROUP_OPERATORS);
export const RuleTypeSchema = z.enum(RULE_TYPES);
export const RuleOperatorSchema = z.enum(RULE_OPERATORS);

export const RuleSchema = ApiRuleSchema.transform((rule) => ({
    id: rule.id,
    type: RuleTypeSchema.parse(rule.type),
    operator: RuleOperatorSchema.parse(rule.operator),
    value: rule.value,
}));

export const RuleGroupSchema = ApiRuleGroupSchema.transform((ruleGroup) => ({
    id: ruleGroup.id,
    operator: RuleGroupOperatorSchema.parse(ruleGroup.operator),
    rules: ruleGroup.rules.map((rule) => RuleSchema.parse(rule)),
}));

export const FilterSchema = ApiFilterSchema.transform((filter) => ({
    id: filter.id,
    name: filter.name,
    position: filter.position,
    categoryId: filter.category_id,
    ruleGroups: filter.rule_groups.map((ruleGroup) => RuleGroupSchema.parse(ruleGroup)),
}));

export const CategorySchema = ApiCategorySchema.transform((category) => ({
    id: category.id,
    name: category.name,
    position: category.position,
    filters: category.filters.map((filter) => FilterSchema.parse(filter)),
}));

export type Category = z.infer<typeof CategorySchema>;
export type Filter = z.infer<typeof FilterSchema>;
export type RuleGroup = z.infer<typeof RuleGroupSchema>;
export type Rule = z.infer<typeof RuleSchema>;
export type RuleGroupOperator = z.infer<typeof RuleGroupOperatorSchema>;
export type RuleType = z.infer<typeof RuleTypeSchema>;
export type RuleOperator = z.infer<typeof RuleOperatorSchema>;

export const parseApiCategories = (apiCategories: unknown): Category[] => z.array(CategorySchema).parse(apiCategories);

export const parseApiCategory = (category: unknown): Category => CategorySchema.parse(category);

export const parseApiFilter = (apiFilter: unknown): Filter => FilterSchema.parse(apiFilter);

export const ReportSchema = z.object({
    id: z.string(),
    name: z.string(),
});

export const ReportTransactionSchema = ApiTransactionSchema.transform((transaction) => ({
    id: transaction.id,
    type: transaction.type,
    product: transaction.product,
    description: transaction.description,
    startedDate: transaction.started_date,
    completedDate: transaction.completed_date,
    amount: -transaction.amount,
    fee: transaction.fee,
    currency: transaction.currency,
    state: transaction.state,
    balance: transaction.balance,
    source: transaction.source,
}));

export const ReportFilterSchema = ApiReportFilterSchema.transform((filter) => ({
    id: filter.id,
    name: filter.name,
    amount: String(-Number(filter.amount)),
    transactions: filter.transactions.map((transaction) => ReportTransactionSchema.parse(transaction)),
}));

export const ReportCategorySchema = ApiReportCategorySchema.transform((category) => ({
    id: category.id,
    name: category.name,
    filters: category.filters.map((filter) => ReportFilterSchema.parse(filter)),
}));

export const ReportFullSchema = ApiReportSchema.transform((report) => ({
    id: report.id,
    name: report.name,
    categories: report.categories.map((category) => ReportCategorySchema.parse(category)),
    unidentifiedTransactions: report.unidentified_transactions.map((transaction) =>
        ReportTransactionSchema.parse(transaction),
    ),
}));

export type Report = z.infer<typeof ReportSchema>;
export type ReportFull = z.infer<typeof ReportFullSchema>;
export type ReportCategory = z.infer<typeof ReportCategorySchema>;
export type ReportFilter = z.infer<typeof ReportFilterSchema>;
export type Transaction = z.infer<typeof ReportTransactionSchema>;
export type TransactionSource = Transaction["source"];

export const parseApiReports = (apiReports: unknown): Report[] => z.array(ReportSchema).parse(apiReports);

export const parseApiReport = (apiReport: unknown): ReportFull => ReportFullSchema.parse(apiReport);
