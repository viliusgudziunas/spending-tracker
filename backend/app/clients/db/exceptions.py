class EntityNotFoundError(Exception):
    pass


class FilterNotFoundError(EntityNotFoundError):
    pass


class RuleGroupNotFoundError(EntityNotFoundError):
    pass


class RuleNotFoundError(EntityNotFoundError):
    pass
