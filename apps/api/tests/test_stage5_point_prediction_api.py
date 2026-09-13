"""
Sentinel NER — Stage 5 Real-Time Point Prediction & Evaluation API Tests
Validates:
1. POST /api/v1/risk/predict-point with RF, XGB, and LR models.
2. Feature extraction via nearest-neighbor genuine 2026 NER observations.
3. Feature overrides support.
4. RBAC: FIELD_OFFICER can predict, CITIZEN_REPORTER is forbidden (403).
5. GET /api/v1/risk/evaluation returns validated multi-model metrics.
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


class TestStage5PointPredictionAPI:
    @pytest.mark.asyncio
    async def test_predict_point_random_forest(self, client: AsyncClient):
        token = await get_token_for(
            client, "field.kolasib@sentinel.ner.internal", "SentinelField@2026!"
        )

        resp = await client.post(
            "/api/v1/risk/predict-point",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "latitude": 23.7271,
                "longitude": 92.7176,
                "model_type": "rf",
            },
        )
        assert resp.status_code == 200, f"Error: {resp.text}"
        data = resp.json()["data"]
        assert data["model_type"] == "rf"
        assert data["risk_class"] in ["Low", "Moderate", "High", "Very High"]
        assert 0.0 <= data["risk_probability"] <= 1.0
        assert "feature_source" in data
        assert "explanation" in data
        assert "top_contributing_features" in data["explanation"]

    @pytest.mark.asyncio
    async def test_predict_point_xgboost_and_logistic_regression(self, client: AsyncClient):
        token = await get_token_for(
            client, "field.kolasib@sentinel.ner.internal", "SentinelField@2026!"
        )

        # XGBoost
        resp_xgb = await client.post(
            "/api/v1/risk/predict-point",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "latitude": 25.5788,
                "longitude": 91.8933,
                "model_type": "xgb",
            },
        )
        assert resp_xgb.status_code == 200
        assert resp_xgb.json()["data"]["model_type"] == "xgb"

        # Logistic Regression
        resp_lr = await client.post(
            "/api/v1/risk/predict-point",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "latitude": 27.0988,
                "longitude": 93.6166,
                "model_type": "lr",
            },
        )
        assert resp_lr.status_code == 200
        assert resp_lr.json()["data"]["model_type"] == "lr"

    @pytest.mark.asyncio
    async def test_predict_point_with_feature_overrides(self, client: AsyncClient):
        token = await get_token_for(
            client, "field.kolasib@sentinel.ner.internal", "SentinelField@2026!"
        )

        resp = await client.post(
            "/api/v1/risk/predict-point",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "latitude": 23.7271,
                "longitude": 92.7176,
                "model_type": "rf",
                "features": {
                    "slope_angle_deg": 48.5,
                    "rainfall_mm_24h": 180.0,
                },
            },
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        # Verify overridden features took effect in the input vector
        assert data["input_features"]["slope_angle_deg"] == 48.5
        assert data["input_features"]["rainfall_mm_24h"] == 180.0

    @pytest.mark.asyncio
    async def test_predict_point_citizen_forbidden(self, client: AsyncClient):
        token = await get_token_for(
            client, "citizen@sentinel.ner.internal", "SentinelCitizen@2026!"
        )

        resp = await client.post(
            "/api/v1/risk/predict-point",
            headers={"Authorization": f"Bearer {token}"},
            json={"latitude": 23.7, "longitude": 92.7},
        )
        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "ERR_FORBIDDEN"

    @pytest.mark.asyncio
    async def test_get_evaluation_report(self, client: AsyncClient):
        token = await get_token_for(
            client, "field.kolasib@sentinel.ner.internal", "SentinelField@2026!"
        )

        resp = await client.get(
            "/api/v1/risk/evaluation",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        # Validates multi-model metrics presence
        assert "RandomForest" in data or "XGBoost" in data or "LogisticRegression" in data
