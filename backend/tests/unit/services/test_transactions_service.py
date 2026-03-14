import uuid

import pytest

from app.db.models import Rule, RuleOperator, RuleType, Transaction
from app.services.transactions_service import get_transactions_matching_rule


def _make_transaction(
    *,
    description: str = "Coffee",
    amount: float = 5.0,
    product: str | None = "Current",
) -> Transaction:
    return Transaction(id=uuid.uuid4(), description=description, amount=amount, product=product)


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


@pytest.mark.unit
class TestProductRuleMatching:
    def test_exact_match(self) -> None:
        txn = _make_transaction(product="Current")
        rule = _make_rule(rule_type=RuleType.PRODUCT, value="Current")

        result = get_transactions_matching_rule(rule, [txn])

        assert result == {txn}

    def test_case_insensitive_match(self) -> None:
        txn = _make_transaction(product="CURRENT")
        rule = _make_rule(rule_type=RuleType.PRODUCT, value="current")

        result = get_transactions_matching_rule(rule, [txn])

        assert result == {txn}

    def test_no_match(self) -> None:
        txn = _make_transaction(product="Savings")
        rule = _make_rule(rule_type=RuleType.PRODUCT, value="Current")

        result = get_transactions_matching_rule(rule, [txn])

        assert result == set()

    def test_ignores_transactions_without_product(self) -> None:
        txn = _make_transaction(product=None)
        rule = _make_rule(rule_type=RuleType.PRODUCT, value="Current")

        result = get_transactions_matching_rule(rule, [txn])

        assert result == set()
