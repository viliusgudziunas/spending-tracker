export interface CreateReportPayload {
    bankStatement: File;
    name: string;
}

export interface PatchReportPayload {
    name: string;
}

export interface CreateCategoryPayload {
    name: string;
}

export interface UpdateCategoryPayload {
    name?: string;
    position?: number;
}

export interface CreateRulePayload {
    type: string;
    operator: string;
    value: string;
}

export interface CreateRuleGroupPayload {
    operator: string;
    rules: CreateRulePayload[];
}

export interface CreateFilterPayload {
    name: string;
    categoryId: string;
    ruleGroups: CreateRuleGroupPayload[];
}

export interface UpdateRulePayload {
    type: string;
    operator: string;
    value: string;
}

export interface UpdateRuleGroupPayload {
    operator: string;
    rules: UpdateRulePayload[];
}

export interface UpdateFilterPayload {
    name: string;
    position?: number;
    categoryId: string;
    ruleGroups: UpdateRuleGroupPayload[];
}

export interface UpdateFilterPositionPayload {
    position: number;
}

export interface RenameFilterPayload {
    name: string;
}

export interface PutRulePayload {
    id?: string;
    type: string;
    operator: string;
    value: string;
}

export interface PutRuleGroupPayload {
    id?: string;
    operator: string;
    rules: PutRulePayload[];
}

export interface PutFilterRuleGroupsPayload {
    ruleGroups: PutRuleGroupPayload[];
}

export interface CreateReportManualFilterPayload {
    name: string;
    categoryId: string;
    position?: number;
}

export interface PutReportAssignmentPayload {
    targetRuleFilterId?: string;
    targetReportFilterId?: string;
}
