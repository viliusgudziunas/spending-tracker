from app.schemas.api.rules_schema import CategoryCreate
from app.schemas.spapi.spapi_category_schema import SpapiCategory


def parse_category_input_to_spapi(input_category: CategoryCreate) -> SpapiCategory:
    return SpapiCategory(
        name=input_category.name,
    )
