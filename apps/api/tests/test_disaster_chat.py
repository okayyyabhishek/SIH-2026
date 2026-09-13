"""
Sentinel NER — Disaster Chatbot & Copilot API Tests
Validates the Gemini-powered Disaster Copilot and built-in Disaster Knowledge Engine.
"""

import pytest
from httpx import AsyncClient


class TestDisasterChatAPI:
    @pytest.mark.asyncio
    async def test_get_disaster_topics(self, client: AsyncClient):
        resp = await client.get("/api/v1/disaster-chat/topics")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 3
        # Check first group
        assert "category" in data[0]
        assert "topics" in data[0]
        assert len(data[0]["topics"]) > 0
        topic = data[0]["topics"][0]
        assert "id" in topic
        assert "title" in topic
        assert "prompt" in topic

    @pytest.mark.asyncio
    async def test_get_emergency_contacts(self, client: AsyncClient):
        resp = await client.get("/api/v1/disaster-chat/contacts?state=Mizoram")
        assert resp.status_code == 200
        contacts = resp.json()
        assert isinstance(contacts, list)
        assert len(contacts) >= 3
        services = [c["service"] for c in contacts]
        assert any("Mizoram" in s for s in services)
        assert any("National" in s or "NDMA" in s for s in services)

    @pytest.mark.asyncio
    async def test_disaster_chat_landslide_query(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/disaster-chat/message",
            json={
                "message": "What are the early warning signs of an impending landslide on a hill slope?",
                "state": "Mizoram",
                "district": "Aizawl",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "reply" in data
        assert len(data["reply"]) > 50
        assert "disaster_category" in data
        assert "actionable_checklist" in data
        assert len(data["actionable_checklist"]) > 0
        assert "emergency_contacts" in data
        assert len(data["emergency_contacts"]) > 0
        assert "source_citations" in data
        assert "model_used" in data

    @pytest.mark.asyncio
    async def test_disaster_chat_flash_flood_query(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/disaster-chat/message",
            json={
                "message": "What immediate life saving survival steps should we take during a sudden cloudburst?",
                "state": "Sikkim",
                "district": "Gangtok",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "reply" in data
        assert "cloudburst" in data["reply"].lower() or "flood" in data["reply"].lower()
        assert len(data["actionable_checklist"]) > 0

    @pytest.mark.asyncio
    async def test_verify_gemini_key_invalid(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/disaster-chat/verify-key",
            json={"gemini_api_key": "invalid_test_key_123"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["valid"] is False
        assert "message" in data
