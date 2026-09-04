import { type ColDef } from "ag-grid-community";
import { ReportFilter, RuleOperator, RuleType, Transaction } from "../../clients/backendClient/responseParsers";

interface FilterRow {
    id: string;
    name: string;
    amount: string;
    transactionCount: number;
}

const FILTER_COLUMNS: ColDef<FilterRow>[] = [
    { field: "amount", headerName: "Amount", width: 120 },
    { field: "name", headerName: "Description", flex: 1, minWidth: 200 },
    {
        field: "transactionCount",
        headerName: "#",
        width: 80,
        cellClass: "text-slate-400",
    },
];

function isManualSource(source: Transaction["source"] | undefined): boolean {
    return source === "manual" || source === "override";
}

const TRANSACTION_COLUMNS: ColDef<Transaction>[] = [
    { field: "type", headerName: "Type", width: 140 },
    { field: "product", headerName: "Product", width: 140 },
    { field: "description", headerName: "Description", flex: 2, minWidth: 200 },
    { field: "amount", headerName: "Amount", width: 110 },
    { field: "fee", headerName: "Fee", width: 90 },
    { field: "currency", headerName: "Currency", width: 100 },
    { field: "state", headerName: "State", width: 110 },
    {
        field: "source",
        headerName: "Source",
        width: 120,
        valueFormatter: ({ value }): string => {
            if (isManualSource(value)) return "Manual";
            if (value === "generated") return "Auto";
            return "Unknown";
        },
        tooltipValueGetter: ({ value }): string => {
            if (isManualSource(value)) return "Assigned manually";
            if (value === "generated") return "Assigned automatically";
            return "Assignment source unavailable";
        },
    },
    { field: "balance", headerName: "Balance", width: 110 },
    { field: "startedDate", headerName: "Started", width: 160 },
    { field: "completedDate", headerName: "Completed", width: 160 },
];

function getTransactionRowClass(source: Transaction["source"] | undefined): string {
    if (isManualSource(source)) return "report-transaction-row--manual";
    if (source === "generated") return "report-transaction-row--auto";
    return "";
}

const OPERATOR_LABELS: Record<RuleOperator, string> = {
    EQUAL: "= Equal",
    NOT_EQUAL: "≠ Not equal",
    GREATER_THAN: "> Greater than",
    LESS_THAN: "< Less than",
    GREATER_THAN_EQUAL: ">= Greater/equal",
    LESS_THAN_EQUAL: "<= Less/equal",
};

const RULE_TYPE_LABELS: Record<RuleType, string> = {
    DESCRIPTION: "Description",
    AMOUNT: "Amount",
    PRODUCT: "Product",
};

const UNIDENTIFIED_COLUMNS_STATE_STORAGE_KEY = "report-detail:unidentified:columns-state";
const MIN_PANEL_WIDTH = 300;
const MAX_PANEL_WIDTH = 800;
const DEFAULT_PANEL_WIDTH = 420;

type RightPanel =
    | { kind: "filter"; filter: ReportFilter }
    | { kind: "categories" }
    | { kind: "create-filter"; transaction: Transaction }
    | { kind: "create-report-filter"; transaction: Transaction }
    | { kind: "add-rule-group"; transaction: Transaction }
    | { kind: "add-report-filter"; transaction: Transaction; sourceFilter?: ReportFilter };

export {
    DEFAULT_PANEL_WIDTH,
    FILTER_COLUMNS,
    MAX_PANEL_WIDTH,
    MIN_PANEL_WIDTH,
    OPERATOR_LABELS,
    RULE_TYPE_LABELS,
    TRANSACTION_COLUMNS,
    UNIDENTIFIED_COLUMNS_STATE_STORAGE_KEY,
    getTransactionRowClass,
    isManualSource,
};
export type { FilterRow, RightPanel };
