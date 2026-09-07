"""
Sentinel NER — Error Handling, Middleware & Stage-Gate Tests
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_correlation_id_and_security_headers(client: AsyncClient):
    """Verify middleware injects correlation IDs, execution time, and security headers."""
    custom_cid = "test-custom-correlation-id-12345"
    response = await client.get("/api/v1/health/live", headers={"X-Correlation-ID": custom_cid})
    assert response.status_code == 200

    # Headers verification
    assert response.headers.get("X-Correlation-ID") == custom_cid
    assert "X-Process-Time" in response.headers
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert "Strict-Transport-Security" in response.headers


@pytest.mark.asyncio
async def test_404_error_envelope_structure(client: AsyncClient):
    """Verify non-existent routes return standardized ErrorEnvelope."""
    response = await client.get("/api/v1/non-existent-endpoint-xyz")
    assert response.status_code == 404

    data = response.json()
    assert data["success"] is False
    assert "error" in data
    assert data["error"]["code"] == "ERR_HTTP_404"
    assert "correlation_id" in data["error"]
    assert "timestamp" in data["error"]


@pytest.mark.asyncio
async def test_stage_gate_placeholder_route(client: AsyncClient):
    """Verify future-stage routes return 501 STG_NOT_IMPLEMENTED with stage context."""
    response = await client.get("/api/v1/community-reports/REP-001")
    assert response.status_code == 501

    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "STG_NOT_IMPLEMENTED"
    assert data["error"]["details"]["stage"] == 10
    assert "Community Intelligence" in data["error"]["details"]["feature"]



@pytest.mark.asyncio
async def test_auto_generated_correlation_id(client: AsyncClient):
    """Verify server auto-generates correlation ID if not provided by client."""
    response = await client.get("/api/v1/health/live")
    assert response.status_code == 200
    cid = response.headers.get("X-Correlation-ID")
    assert cid is not None
    assert len(cid) > 10
