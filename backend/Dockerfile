FROM python:3.12

WORKDIR /code

ENV PATH="/root/.local/bin:$PATH"

RUN apt-get update \
    && apt-get -y install curl \
    && curl -sSL https://install.python-poetry.org | python

COPY pyproject.toml poetry.lock ./

RUN poetry config virtualenvs.in-project true \
    && poetry install --without dev

COPY ./app /code/app/

ENV PATH="/code/.venv/bin:$PATH"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--reload"]
