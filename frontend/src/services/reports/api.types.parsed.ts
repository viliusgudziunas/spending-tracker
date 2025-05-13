import { TRANSACTION_SOURCES } from "../api.types";

export interface Report {
    id: string;
    name: string;
}

export interface ReportFull {
    id: string;
    name: string;
    categories: ReportCategory[];
    unidentifiedTransactions: Transaction[];
}

export interface ReportCategory {
    id: string;
    name: string;
    filters: ReportFilter[];
}

export interface ReportFilter {
    id: string;
    name: string;
    amount: string;
    transactions: Transaction[];
}

export interface Transaction {
    id: string;
    description: string;
    startedDate: string;
    completedDate: string;
    amount: number;
    source: TransactionSource;
}

export type TransactionSource = (typeof TRANSACTION_SOURCES)[number] | null;

export interface Override {
    id: string;
    categoryName: string;
    filterName: string;
    transactionId: string;
}
