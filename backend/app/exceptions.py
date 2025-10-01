from fastapi import FastAPI, HTTPException, Request, status

from app.clients.db.exceptions import EntityNotFoundError


def add_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(EntityNotFoundError)
    def entity_not_found_error_handler(_: Request, __: EntityNotFoundError) -> None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
