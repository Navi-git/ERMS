import pytest
from rest_framework.test import APIClient


@pytest.fixture(autouse=True)
def _isolated_cache(settings):
    """Tests never touch Redis: use a local-memory cache, emptied around every test."""
    settings.CACHES = {
        "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "LOCATION": "erms-tests"}
    }
    from django.core.cache import cache

    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api():
    return APIClient()
