from app.parsers.rule_groups_parser import parse_rule_group_input_to_spapi
from app.schemas.api.filters_schemas import FilterCreate
from app.schemas.spapi.filters_schemas import SpapiFilter


def parse_filter_input_to_spapi(input_filter: FilterCreate, next_position: int) -> SpapiFilter:
    return SpapiFilter(
        name=input_filter.name,
        position=next_position,
        rule_groups=[parse_rule_group_input_to_spapi(rg) for rg in input_filter.rule_groups],
    )
