import pytest
from unittest.mock import AsyncMock, patch


@pytest.fixture(autouse=True)
def patch_feed_refresh():
    """Prevent the lifespan from making real HTTP calls during tests."""
    with patch("main.refresh_feed", new_callable=AsyncMock):
        yield
