"""
Sentinel NER — Health and Diagnostic Endpoint Tests
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_aggregated_endpoint(client: AsyncClient):
    """Verify aggregated health endpoint returns 200 with structured subsystems."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "HEALTHY"
    assert "version" in data
    assert "uptime_seconds" in data
    assert isinstance(data["subsystems"], list)
    assert len(data["subsystems"]) >= 2

    # Verify no fake operational states
    subsystem_names = [s["name"] for s in data["subsystems"]]
    assert "mongodb" in subsystem_names
    assert "redis" in subsystem_names


@pytest.mark.asyncio
async def test_liveness_probe(client: AsyncClient):
    """Verify liveness probe returns HTTP 200 and LIVE status."""
    response = await client.get("/api/v1/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "LIVE"
    assert "correlation_id" in data


@pytest.mark.asyncio
async def test_readiness_probe(client: AsyncClient):
    """Verify readiness probe returns HTTP 200 and READY status."""
    response = await client.get("/api/v1/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "READY"
    assert "version" in data


@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    """Verify root / returns API status metadata."""
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Sentinel NER API"
    assert data["status"] == "OPERATIONAL"
