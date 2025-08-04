from app.schemas.api.categories_schemas import CategoryCreate
from app.schemas.spapi.categories_schemas import SpapiCategory


def parse_category_input_to_spapi(input_category: CategoryCreate) -> SpapiCategory:
    return SpapiCategory(
        name=input_category.name,
    )
