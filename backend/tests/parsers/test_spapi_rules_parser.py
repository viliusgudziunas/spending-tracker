from app.parsers.spapi_rules_parser import parse_category_input_to_spapi
from app.schemas.api.rules_schema import CategoryCreate


class TestParseCategoryInputToSPAPI:
    def test_parse_category_input_to_spapi_model(self) -> None:
        spapi_category = parse_category_input_to_spapi(CategoryCreate(name="Test Category"))

        assert spapi_category.name == "Test Category"
