import { ApiReport, ApiReportCategory, ApiReportFilter, ApiTransaction, TRANSACTION_SOURCES } from "../api.types";
import { ReportCategory, ReportFilter, ReportFull, Transaction, TransactionSource } from "./api.types.parsed";

export const parseApiReport = (apiReport: ApiReport): ReportFull => ({
    id: apiReport.id,
    name: apiReport.name,
    categories: apiReport.categories.map((category) => parseApiReportCategory(category)),
    unidentifiedTransactions: apiReport.unidentified_transactions.map((transaction) =>
        parseApiReportTransaction(transaction),
    ),
});

const parseApiReportCategory = (category: ApiReportCategory): ReportCategory => ({
    id: category.id,
    name: category.name,
    filters: category.filters.map((filter) => parseApiReportFilter(filter)),
});

const parseApiReportFilter = (filter: ApiReportFilter): ReportFilter => ({
    id: filter.id,
    name: filter.name,
    amount: String(-Number(filter.amount)),
    transactions: filter.transactions.map((transaction) => parseApiReportTransaction(transaction)),
});

const parseApiReportTransaction = (transaction: ApiTransaction): Transaction => ({
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
    source: parseApiReportTransactionSource(transaction.source),
});

const parseApiReportTransactionSource = (source: string | null): TransactionSource => {
    if (!TRANSACTION_SOURCES.includes(source as TransactionSource)) {
        throw new Error("Invalid transaction source");
    }

    return source as TransactionSource;
};
