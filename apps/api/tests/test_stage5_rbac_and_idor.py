"""
Sentinel NER — Stage 5 RBAC, Tenancy Scoping & IDOR Protection Tests
Validates that:
1. CITIZEN_REPORTER is denied access to all risk endpoints (403 Forbidden).
2. FIELD_OFFICER has read-only capability (cannot trigger model runs).
3. DDMA Aizawl cannot view or execute risk runs for Lunglei (403 Forbidden).
4. Non-admin roles cannot register or activate models (403 Forbidden).
5. PLATFORM_ADMIN has full operational and administrative risk capabilities.
"""

import pytest
from httpx import AsyncClient

from src.db.repository import repository


@pytest.fixture(autouse=True)
async def reset_state():
    await repository.seed_dev_data_if_empty()


async def get_token_for(client: AsyncClient, email: str, password: str) -> str:
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return resp.json()["access_token"]


class TestStage5RBACAndIDOR:
    @pytest.mark.asyncio
    async def test_citizen_reporter_denied_risk_endpoints(self, client: AsyncClient):
        """CITIZEN_REPORTER has neither RISK_READ nor RISK_RUN and is denied with 403."""
        token = await get_token_for(
            client, "citizen@sentinel.ner.internal", "SentinelCitizen@2026!"
        )

        resp = await client.get(
            "/api/v1/risk/predictions",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "ERR_FORBIDDEN"

        resp_run = await client.post(
            "/api/v1/risk/runs",
            headers={"Authorization": f"Bearer {token}"},
            json={"district_id": "dst-aizawl"},
        )
        assert resp_run.status_code == 403

    @pytest.mark.asyncio
    async def test_field_officer_read_only_risk_access(self, client: AsyncClient):
        """FIELD_OFFICER can read predictions but cannot trigger model runs."""
        token = await get_token_for(
            client, "field.kolasib@sentinel.ner.internal", "SentinelField@2026!"
        )

        # Read is permitted
        resp = await client.get(
            "/api/v1/risk/predictions",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200

        # Trigger run is denied (requires RISK_RUN)
        resp_run = await client.post(
            "/api/v1/risk/runs",
            headers={"Authorization": f"Bearer {token}"},
            json={"district_id": "dst-aizawl"},
        )
        assert resp_run.status_code == 403
        assert resp_run.json()["error"]["code"] == "ERR_FORBIDDEN"

    @pytest.mark.asyncio
    async def test_ddma_cross_district_idor_protection(self, client: AsyncClient):
        """DDMA Aizawl cannot query or execute runs for Kolasib or other districts."""
        aizawl_token = await get_token_for(
            client, "ddma.aizawl@sentinel.ner.internal", "SentinelDdma@2026!"
        )

        # Querying Kolasib predictions is forbidden
        resp_list = await client.get(
            "/api/v1/risk/predictions?district_id=dst-kolasib",
            headers={"Authorization": f"Bearer {aizawl_token}"},
        )
        assert resp_list.status_code == 403
        assert resp_list.json()["error"]["code"] == "ERR_FORBIDDEN"

        # Triggering a run for Kolasib is forbidden
        resp_run = await client.post(
            "/api/v1/risk/runs",
            headers={"Authorization": f"Bearer {aizawl_token}"},
            json={"district_id": "dst-kolasib"},
        )
        assert resp_run.status_code == 403
        assert resp_run.json()["error"]["code"] == "ERR_FORBIDDEN"

    @pytest.mark.asyncio
    async def test_ddma_scoped_run_and_prediction_retrieval(self, client: AsyncClient):
        """DDMA Aizawl can trigger a run for Aizawl and retrieve predictions & explanations."""
        aizawl_token = await get_token_for(
            client, "ddma.aizawl@sentinel.ner.internal", "SentinelDdma@2026!"
        )

        # Trigger scoped run
        resp_run = await client.post(
            "/api/v1/risk/runs",
            headers={"Authorization": f"Bearer {aizawl_token}"},
            json={"district_id": "dst-aizawl"},
        )
        assert resp_run.status_code == 202
        run_data = resp_run.json()["data"]
        assert run_data["status"] == "COMPLETED"

        # List predictions
        resp_preds = await client.get(
            "/api/v1/risk/predictions",
            headers={"Authorization": f"Bearer {aizawl_token}"},
        )
        assert resp_preds.status_code == 200
        items = resp_preds.json()["data"]["items"]
        assert len(items) > 0
        first_pred = items[0]
        assert first_pred["district_id"] == "dst-aizawl"

        # Retrieve individual prediction
        pred_id = first_pred["id"]
        resp_single = await client.get(
            f"/api/v1/risk/predictions/{pred_id}",
            headers={"Authorization": f"Bearer {aizawl_token}"},
        )
        assert resp_single.status_code == 200
        assert resp_single.json()["data"]["id"] == pred_id

        # Retrieve explanation
        resp_expl = await client.get(
            f"/api/v1/risk/predictions/{pred_id}/explanation",
            headers={"Authorization": f"Bearer {aizawl_token}"},
        )
        assert resp_expl.status_code == 200
        assert resp_expl.json()["data"]["prediction_id"] == pred_id
        assert "not direct physical causality" in resp_expl.json()["data"]["disclaimer"]

    @pytest.mark.asyncio
    async def test_non_admin_cannot_activate_or_register_models(self, client: AsyncClient):
        """Only PLATFORM_ADMIN can register or activate risk models."""
        ddma_token = await get_token_for(
            client, "ddma.aizawl@sentinel.ner.internal", "SentinelDdma@2026!"
        )
        admin_token = await get_token_for(
            client, "admin@sentinel.ner.internal", "SentinelAdmin@2026!"
        )

        # DDMA tries to register model -> 403 Forbidden
        resp_reg = await client.post(
            "/api/v1/risk/models",
            headers={"Authorization": f"Bearer {ddma_token}"},
            json={
                "model_name": "ROGUE-MODEL",
                "algorithm": "RandomForest",
                "version": "1.0.0",
                "weights": {"weights": {}},
            },
        )
        assert resp_reg.status_code == 403

        # DDMA tries to activate model -> 403 Forbidden
        resp_act = await client.post(
            "/api/v1/risk/models/mdl-lr-baseline-v1/activate",
            headers={"Authorization": f"Bearer {ddma_token}"},
        )
        assert resp_act.status_code == 403

        # Admin can view models
        resp_admin_models = await client.get(
            "/api/v1/risk/models",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp_admin_models.status_code == 200
        assert len(resp_admin_models.json()["data"]) > 0
