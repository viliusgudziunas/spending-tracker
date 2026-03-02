import pandas as pd
import pytest

from app.bank_statement_parser import parse_statement


@pytest.mark.unit
class TestParseStatement:
    def test_filters_out_deposit_rows(self) -> None:
        statement = pd.DataFrame(
            {
                "Product": ["Current", "Deposit", "Current"],
                "Description": ["Coffee", "Savings", "Groceries"],
                "Amount": [5.0, 100.0, 20.0],
            },
        )

        result = parse_statement(statement)

        assert len(result) == 2
        assert all(row["description"] != "Savings" for row in result)

    def test_renames_columns_to_snake_case(self) -> None:
        statement = pd.DataFrame(
            {
                "Product": ["Current"],
                "Started Date": ["2025-01-01"],
                "Completed Date": ["2025-01-02"],
                "Amount": [10.0],
            },
        )

        result = parse_statement(statement)

        assert "started_date" in result[0]
        assert "completed_date" in result[0]
        assert "Started Date" not in result[0]
        assert "Completed Date" not in result[0]

    def test_columns_are_lowercase(self) -> None:
        statement = pd.DataFrame(
            {
                "Product": ["Current"],
                "Description": ["Coffee"],
                "Amount": [5.0],
            },
        )

        result = parse_statement(statement)

        assert all(key == key.lower() for key in result[0])

    def test_returns_list_of_dicts(self) -> None:
        statement = pd.DataFrame(
            {
                "Product": ["Current"],
                "Description": ["Coffee"],
                "Amount": [5.0],
            },
        )

        result = parse_statement(statement)

        assert isinstance(result, list)
        assert isinstance(result[0], dict)

    def test_preserves_values(self) -> None:
        statement = pd.DataFrame(
            {
                "Product": ["Current"],
                "Description": ["Coffee Shop"],
                "Amount": [4.50],
            },
        )

        result = parse_statement(statement)

        assert result[0]["description"] == "Coffee Shop"
        assert result[0]["amount"] == 4.50

    def test_empty_after_filtering(self) -> None:
        statement = pd.DataFrame(
            {
                "Product": ["Deposit", "Deposit"],
                "Description": ["Savings", "Transfer"],
                "Amount": [100.0, 200.0],
            },
        )

        result = parse_statement(statement)

        assert result == []
