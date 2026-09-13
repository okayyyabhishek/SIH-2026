"""
Sentinel NER — Disaster Chatbot & Gemini Copilot API Router
Exposes endpoints for interactive disaster intelligence queries, starter topics,
emergency contacts, and Gemini key validation.
"""

from typing import List, Optional
from fastapi import APIRouter, Header, Query, status

from src.core.ai.disaster_bot import disaster_bot_service
from src.schemas.disaster_chat import (
    DisasterChatRequest,
    DisasterChatResponse,
    DisasterTopicGroup,
    EmergencyContact,
    VerifyKeyRequest,
    VerifyKeyResponse,
)

router = APIRouter(prefix="/disaster-chat", tags=["Disaster Intelligence & Gemini Copilot"])


@router.post(
    "/message",
    response_model=DisasterChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Ask Disaster AI Copilot (Gemini / Knowledge Engine)",
    description="Processes natural language queries regarding landslides, floods, cloudbursts, early warnings, and survival protocols.",
)
async def ask_disaster_copilot(
    request: DisasterChatRequest,
    x_gemini_api_key: Optional[str] = Header(None, alias="X-Gemini-API-Key"),
) -> DisasterChatResponse:
    # If client passed key via header, let it override or supplement request body
    if x_gemini_api_key and not request.gemini_api_key:
        request.gemini_api_key = x_gemini_api_key
    return disaster_bot_service.process_chat(request)


@router.get(
    "/topics",
    response_model=List[DisasterTopicGroup],
    status_code=status.HTTP_200_OK,
    summary="Get Categorized Disaster Starter Topics",
    description="Returns curated disaster query prompts for landslides, weather extremes, mitigation, and emergency response.",
)
async def get_disaster_topics() -> List[DisasterTopicGroup]:
    return disaster_bot_service.get_topics()


@router.get(
    "/contacts",
    response_model=List[EmergencyContact],
    status_code=status.HTTP_200_OK,
    summary="Get Northeast India Disaster Helplines",
    description="Returns official emergency contact numbers and disaster control room hotlines by state.",
)
async def get_emergency_contacts(
    state: Optional[str] = Query("Mizoram", description="Northeast state name"),
) -> List[EmergencyContact]:
    return disaster_bot_service.get_emergency_contacts(state)


@router.post(
    "/verify-key",
    response_model=VerifyKeyResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify Google Gemini API Key",
    description="Validates that a provided Google Gemini API key is functional against Google Gemini.",
)
async def verify_gemini_key(request: VerifyKeyRequest) -> VerifyKeyResponse:
    return disaster_bot_service.verify_gemini_key(request.gemini_api_key)
