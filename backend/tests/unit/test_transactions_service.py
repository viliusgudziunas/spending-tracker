import uuid

import pytest

from app.db.reports.models import Transaction
from app.db.rules.models import Rule, RuleOperator, RuleType
from app.transactions_service import get_transactions_matching_rule


def _make_transaction(*, description: str = "Coffee", amount: float = 5.0) -> Transaction:
    return Transaction(id=uuid.uuid4(), description=description, amount=amount)


def _make_rule(
    *,
    rule_type: RuleType = RuleType.DESCRIPTION,
    operator: RuleOperator = RuleOperator.EQUAL,
    value: str = "Coffee",
) -> Rule:
    return Rule(id=uuid.uuid4(), type=rule_type, operator=operator, value=value)


@pytest.mark.unit
class TestDescriptionRuleMatching:
    def test_exact_match(self) -> None:
        txn = _make_transaction(description="Coffee")
        rule = _make_rule(value="Coffee")

        result = get_transactions_matching_rule(rule, [txn])

        assert result == {txn}

    def test_case_insensitive_match(self) -> None:
        txn = _make_transaction(description="COFFEE")
        rule = _make_rule(value="coffee")

        result = get_transactions_matching_rule(rule, [txn])

        assert result == {txn}

    def test_no_match(self) -> None:
        txn = _make_transaction(description="Tea")
        rule = _make_rule(value="Coffee")

        result = get_transactions_matching_rule(rule, [txn])

        assert result == set()

    def test_multiple_transactions_partial_match(self) -> None:
        coffee = _make_transaction(description="Coffee")
        tea = _make_transaction(description="Tea")
        rule = _make_rule(value="Coffee")

        result = get_transactions_matching_rule(rule, [coffee, tea])

        assert result == {coffee}


@pytest.mark.unit
class TestAmountRuleMatching:
    def test_equal(self) -> None:
        txn = _make_transaction(amount=10.0)
        rule = _make_rule(rule_type=RuleType.AMOUNT, operator=RuleOperator.EQUAL, value="10.0")

        result = get_transactions_matching_rule(rule, [txn])

        assert result == {txn}

    def test_equal_no_match(self) -> None:
        txn = _make_transaction(amount=10.0)
        rule = _make_rule(rule_type=RuleType.AMOUNT, operator=RuleOperator.EQUAL, value="5.0")

        result = get_transactions_matching_rule(rule, [txn])

        assert result == set()

    def test_not_equal(self) -> None:
        txn = _make_transaction(amount=10.0)
        rule = _make_rule(rule_type=RuleType.AMOUNT, operator=RuleOperator.NOT_EQUAL, value="5.0")

        result = get_transactions_matching_rule(rule, [txn])

        assert result == {txn}

    def test_greater_than(self) -> None:
        txn = _make_transaction(amount=10.0)
        rule = _make_rule(rule_type=RuleType.AMOUNT, operator=RuleOperator.GREATER_THAN, value="5.0")

        result = get_transactions_matching_rule(rule, [txn])

        assert result == {txn}

    def test_greater_than_no_match(self) -> None:
        txn = _make_transaction(amount=3.0)
        rule = _make_rule(rule_type=RuleType.AMOUNT, operator=RuleOperator.GREATER_THAN, value="5.0")

        result = get_transactions_matching_rule(rule, [txn])

        assert result == set()

    def test_less_than(self) -> None:
        txn = _make_transaction(amount=3.0)
        rule = _make_rule(rule_type=RuleType.AMOUNT, operator=RuleOperator.LESS_THAN, value="5.0")

        result = get_transactions_matching_rule(rule, [txn])

        assert result == {txn}

    def test_greater_than_equal(self) -> None:
        txn = _make_transaction(amount=5.0)
        rule = _make_rule(rule_type=RuleType.AMOUNT, operator=RuleOperator.GREATER_THAN_EQUAL, value="5.0")

        result = get_transactions_matching_rule(rule, [txn])

        assert result == {txn}

    def test_less_than_equal(self) -> None:
        txn = _make_transaction(amount=5.0)
        rule = _make_rule(rule_type=RuleType.AMOUNT, operator=RuleOperator.LESS_THAN_EQUAL, value="5.0")

        result = get_transactions_matching_rule(rule, [txn])

        assert result == {txn}

    def test_empty_transactions(self) -> None:
        rule = _make_rule(rule_type=RuleType.AMOUNT, operator=RuleOperator.EQUAL, value="10.0")

        result = get_transactions_matching_rule(rule, [])

        assert result == set()
