"""
Sentinel NER — Stage 8 Operational Playbook Schemas & Contracts
Defines versioned Standard Operating Procedures (SOPs) for responding to geomorphic
hazards, road exposures, and critical facility risks under human authorization.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class PlaybookTrigger(str, Enum):
    POTENTIAL_ROAD_EXPOSURE = "POTENTIAL_ROAD_EXPOSURE"
    CRITICAL_ASSET_PROXIMITY = "CRITICAL_ASSET_PROXIMITY"
    VILLAGE_SPATIAL_EXPOSURE = "VILLAGE_SPATIAL_EXPOSURE"
    HIGH_RISK_INSAR_CORRELATION = "HIGH_RISK_INSAR_CORRELATION"


class PlaybookStep(BaseModel):
    step_number: int
    title: str
    description: str
    required_role: str = Field(..., description="Role required to review or execute step")
    permitted_action_types: List[str] = Field(default_factory=list)
    prohibited_actions: List[str] = Field(
        default_factory=lambda: [
            "AUTOMATIC_ROAD_CLOSURE",
            "AUTOMATIC_EVACUATION",
            "UNVETTED_PUBLIC_BROADCAST",
        ]
    )
    guidance_notes: Optional[str] = None


class Playbook(BaseModel):
    id: str = Field(default_factory=lambda: f"pbk-{uuid4().hex[:8]}")
    playbook_code: str = Field(..., min_length=3, max_length=50)
    name: str = Field(..., min_length=5, max_length=200)
    version: str = Field(default="1.0.0")
    trigger_criteria: PlaybookTrigger
    applicable_consequence_types: List[str] = Field(default_factory=list)
    required_authority_role: str = Field(default="DDMA")
    description: str
    steps: List[PlaybookStep] = Field(default_factory=list)
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
