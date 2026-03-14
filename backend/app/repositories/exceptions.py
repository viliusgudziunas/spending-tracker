class DuplicateCategoryError(Exception):
    pass


class CategoryNotFoundError(Exception):
    pass


class ReportNotFoundError(Exception):
    pass


class FilterNotFoundError(Exception):
    pass


class DuplicateFilterError(Exception):
    pass


class InvalidFilterRulesPayloadError(Exception):
    pass


class TransactionNotFoundError(Exception):
    pass


class ReportManualFilterNotFoundError(Exception):
    pass
