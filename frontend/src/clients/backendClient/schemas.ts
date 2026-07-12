import { z } from "zod";

export const TRANSACTION_SOURCES = ["generated", "manual", "override", null] as const;
export const RULE_GROUP_OPERATORS = ["AND"] as const;
export const RULE_TYPES = ["DESCRIPTION", "AMOUNT", "PRODUCT"] as const;
export const RULE_OPERATORS = [
    "EQUAL",
    "NOT_EQUAL",
    "GREATER_THAN",
    "LESS_THAN",
    "GREATER_THAN_EQUAL",
    "LESS_THAN_EQUAL",
] as const;

export const ApiErrorSchema = z.object({
    detail: z.union([
        z.string(),
        z.array(
            z.object({
                msg: z.string(),
            }),
        ),
    ]),
});

export const TransactionSourceSchema = z.enum(["generated", "manual", "override"]).nullable();

export const ApiRuleSchema = z.object({
    id: z.string(),
    type: z.string(),
    operator: z.string(),
    value: z.string(),
    group_id: z.string(),
});

export const ApiRuleGroupSchema = z.object({
    id: z.string(),
    operator: z.string(),
    filter_id: z.string(),
    rules: z.array(ApiRuleSchema),
});

export const ApiFilterSchema = z.object({
    id: z.string(),
    name: z.string(),
    position: z.number(),
    category_id: z.string(),
    rule_groups: z.array(ApiRuleGroupSchema),
});

export const ApiCategorySchema = z.object({
    id: z.string(),
    name: z.string(),
    position: z.number(),
    filters: z.array(ApiFilterSchema),
});

export const ApiPlanSectionSchema = z.object({
    id: z.string(),
    name: z.string(),
    position: z.number(),
    is_income: z.boolean(),
});

export const ApiTransactionSchema = z.object({
    id: z.string(),
    type: z.string().optional().default("UNKNOWN"),
    product: z.string().optional().default(""),
    description: z.string(),
    amount: z.number(),
    fee: z.number(),
    currency: z.string().optional().default(""),
    state: z.string().optional().default(""),
    balance: z.number().optional().default(0),
    started_date: z.string(),
    completed_date: z.string().nullable(),
    source: TransactionSourceSchema,
});

export const ApiReportFilterSchema = z.object({
    id: z.string(),
    name: z.string(),
    rule_filter_id: z.string().nullable().optional(),
    is_manual: z.boolean().optional().default(false),
    amount: z.string(),
    transactions: z.array(ApiTransactionSchema),
});

export const ApiReportCategorySchema = z.object({
    id: z.string(),
    name: z.string(),
    filters: z.array(ApiReportFilterSchema),
});

export const ApiReportSchema = z.object({
    id: z.string(),
    name: z.string(),
    categories: z.array(ApiReportCategorySchema),
    unidentified_transactions: z.array(ApiTransactionSchema),
});

export const ApiReportManualFilterSchema = z.object({
    id: z.string(),
    name: z.string(),
    category_id: z.string(),
    position: z.number(),
});

export const CreateApiRulePayloadSchema = ApiRuleSchema.omit({
    id: true,
    group_id: true,
});

export const CreateApiRuleGroupPayloadSchema = ApiRuleGroupSchema.omit({
    id: true,
    filter_id: true,
    rules: true,
}).extend({
    rules: z.array(CreateApiRulePayloadSchema),
});

export const CreateApiFilterPayloadSchema = ApiFilterSchema.omit({
    id: true,
    rule_groups: true,
    position: true,
}).extend({
    rule_groups: z.array(CreateApiRuleGroupPayloadSchema),
});

export const UpdateApiRulePayloadSchema = ApiRuleSchema.omit({
    id: true,
    group_id: true,
});

export const UpdateApiRuleGroupPayloadSchema = ApiRuleGroupSchema.omit({
    id: true,
    filter_id: true,
    rules: true,
}).extend({
    rules: z.array(UpdateApiRulePayloadSchema),
});

export const UpdateApiFilterPayloadSchema = ApiFilterSchema.omit({
    id: true,
    rule_groups: true,
    position: true,
}).extend({
    rule_groups: z.array(UpdateApiRuleGroupPayloadSchema),
    position: z.number().optional(),
});

export const PutApiRulePayloadSchema = ApiRuleSchema.omit({
    id: true,
    group_id: true,
}).extend({
    id: z.string().optional(),
});

export const PutApiRuleGroupPayloadSchema = ApiRuleGroupSchema.omit({
    id: true,
    filter_id: true,
    rules: true,
}).extend({
    id: z.string().optional(),
    rules: z.array(PutApiRulePayloadSchema),
});

export const PutApiFilterRuleGroupsPayloadSchema = z.object({
    rule_groups: z.array(PutApiRuleGroupPayloadSchema),
});

export const CreateApiReportManualFilterPayloadSchema = z.object({
    name: z.string(),
    category_id: z.string(),
    position: z.number().optional(),
});

export const PutApiReportAssignmentPayloadSchema = z
    .object({
        target_rule_filter_id: z.string().optional(),
        target_report_filter_id: z.string().optional(),
    })
    .refine(
        (payload) =>
            Number(payload.target_rule_filter_id !== undefined) +
                Number(payload.target_report_filter_id !== undefined) ===
            1,
        "Exactly one assignment target must be provided",
    );

export type ApiReport = z.infer<typeof ApiReportSchema>;
export type ApiReportCategory = z.infer<typeof ApiReportCategorySchema>;
export type ApiReportFilter = z.infer<typeof ApiReportFilterSchema>;
export type ApiTransaction = z.infer<typeof ApiTransactionSchema>;
export type ApiCategory = z.infer<typeof ApiCategorySchema>;
export type ApiFilter = z.infer<typeof ApiFilterSchema>;
export type ApiRuleGroup = z.infer<typeof ApiRuleGroupSchema>;
export type ApiRule = z.infer<typeof ApiRuleSchema>;
export type ApiReportManualFilter = z.infer<typeof ApiReportManualFilterSchema>;

export type CreateApiFilterPayload = z.infer<typeof CreateApiFilterPayloadSchema>;
export type CreateApiRuleGroupPayload = z.infer<typeof CreateApiRuleGroupPayloadSchema>;
export type CreateApiRulePayload = z.infer<typeof CreateApiRulePayloadSchema>;
export type UpdateApiFilterPayload = z.infer<typeof UpdateApiFilterPayloadSchema>;
export type UpdateApiRuleGroupPayload = z.infer<typeof UpdateApiRuleGroupPayloadSchema>;
export type UpdateApiRulePayload = z.infer<typeof UpdateApiRulePayloadSchema>;
export type PutApiFilterRuleGroupsPayload = z.infer<typeof PutApiFilterRuleGroupsPayloadSchema>;
export type PutApiRuleGroupPayload = z.infer<typeof PutApiRuleGroupPayloadSchema>;
export type PutApiRulePayload = z.infer<typeof PutApiRulePayloadSchema>;
export type CreateApiReportManualFilterPayload = z.infer<typeof CreateApiReportManualFilterPayloadSchema>;
export type PutApiReportAssignmentPayload = z.infer<typeof PutApiReportAssignmentPayloadSchema>;
