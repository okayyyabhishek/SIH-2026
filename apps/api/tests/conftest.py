"""
Sentinel NER — Pytest Configuration & Fixtures
"""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from src.core.config import settings
from src.core.security.rate_limiter import clear_all_rate_limits
from src.main import app


@pytest.fixture(autouse=True)
def reset_test_state():
    """Ensure rate limit and configuration isolation between test runs."""
    clear_all_rate_limits()
    orig_env = settings.APP_ENV
    orig_dev = settings.ENABLE_DEV_FIXTURES
    orig_mode = settings.SATELLITE_MODE
    orig_backend = settings.STORAGE_BACKEND
    settings.SATELLITE_MODE = "test"

    yield

    clear_all_rate_limits()
    settings.APP_ENV = orig_env
    settings.ENABLE_DEV_FIXTURES = orig_dev
    settings.STORAGE_BACKEND = orig_backend
    settings.SATELLITE_MODE = orig_mode


@pytest_asyncio.fixture
async def client():
    """Async test client bound directly to the FastAPI ASGI application."""
    from src.db.repository import repository
    await repository.seed_dev_data_if_empty()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

