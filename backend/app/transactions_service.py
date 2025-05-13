import operator
from collections.abc import Callable, Iterable
from decimal import Decimal

from app.db.reports.models import Transaction
from app.db.rules.models import Rule, RuleOperator, RuleType


def _get_transactions_matching_description_rule(rule: Rule, transactions: Iterable[Transaction]) -> set[Transaction]:
    return {transaction for transaction in transactions if rule.value.lower() == transaction.description.lower()}


RULE_OPERATOR_MAP: dict[RuleOperator, Callable[[Decimal, Decimal], bool]] = {
    RuleOperator.EQUAL: operator.eq,
    RuleOperator.NOT_EQUAL: operator.ne,
    RuleOperator.GREATER_THAN: operator.gt,
    RuleOperator.LESS_THAN: operator.lt,
    RuleOperator.GREATER_THAN_EQUAL: operator.ge,
    RuleOperator.LESS_THAN_EQUAL: operator.le,
}


def _get_transactions_matching_amount_rule(rule: Rule, transactions: Iterable[Transaction]) -> set[Transaction]:
    operator_func = RULE_OPERATOR_MAP[rule.operator]

    def check_func(rule: Rule, transaction: Transaction) -> bool:
        return operator_func(Decimal(str(transaction.amount)), Decimal(rule.value))

    return {transaction for transaction in transactions if check_func(rule, transaction)}


MATCHING_MAP: dict[RuleType, Callable[[Rule, Iterable[Transaction]], set[Transaction]]] = {
    RuleType.DESCRIPTION: _get_transactions_matching_description_rule,
    RuleType.AMOUNT: _get_transactions_matching_amount_rule,
}


def get_transactions_matching_rule(rule: Rule, transactions: Iterable[Transaction]) -> set[Transaction]:
    matching_func = MATCHING_MAP[rule.type]
    return matching_func(rule, transactions)
