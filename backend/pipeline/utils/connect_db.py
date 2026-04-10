import os

import psycopg2
from psycopg2.extras import RealDictCursor

_DATABASE_URL_ENV = "DATABASE_URL"


def _get_database_url() -> str:
    """Raise early if the required environment variable is missing."""
    value = os.getenv(_DATABASE_URL_ENV)
    if not value:
        raise RuntimeError(f"{_DATABASE_URL_ENV} is not configured")
    return value


# --------------------------------------------------
# CONNECT
# --------------------------------------------------

def db_connect():
    return psycopg2.connect(
        _get_database_url(),
        sslmode="require",
        connect_timeout=10,
        cursor_factory=RealDictCursor
    )
