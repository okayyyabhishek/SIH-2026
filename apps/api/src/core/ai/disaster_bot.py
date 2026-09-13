"""
Sentinel NER — Disaster Intelligence & Gemini Copilot Engine
Integrates Google Gemini (gemini-2.5-flash) via the official google-genai SDK
with a comprehensive offline NDMA/GSI/IMD disaster intelligence fallback.
"""

import os
import re
import logging
from typing import Dict, List, Optional, Tuple

from src.schemas.disaster_chat import (
    ChatMessage,
    DisasterChatRequest,
    DisasterChatResponse,
    DisasterTopic,
    DisasterTopicGroup,
    EmergencyContact,
    VerifyKeyResponse,
)

logger = logging.getLogger("sentinel.disaster_bot")

# Current Google Gemini model recommended for fast, authoritative multimodal/chat
GEMINI_MODEL = "gemini-3.6-flash"

SYSTEM_INSTRUCTION = """You are the Sentinel Disaster AI Copilot, an elite Senior Disaster Management Specialist and Geological Hazard Engineer serving the National Disaster Management Authority (NDMA), Geological Survey of India (GSI), and State Disaster Management Authorities (SDMAs) across Northeast India (Seismic Zone V).

Your mission is to provide life-saving, technically rigorous, and immediately actionable disaster intelligence to field officers, municipal engineers, and citizens facing geological and hydrometeorological hazards.

Key Operational Protocols to Follow:
1. Prioritize Life Safety First: In imminent danger situations (e.g. slope bulging, tension cracks opening, flash flood roar, water turning muddy, torrential cloudburst), immediately issue clear evacuation steps.
2. Technical Grounding: Ground explanations in genuine geotechnical and hydrometeorological science:
   - Slope stability: Factor of Safety (Fs), Mohr-Coulomb shear strength (τ = c' + (σ_n - u)tanφ'), Pore Water Pressure (u), and pore pressure ratio (r_u).
   - Rainfall thresholds: IMD 24h/48h/72h cumulative precipitation vs GSI empirical trigger thresholds (e.g. >150mm in 24h on steep slopes).
   - InSAR surface deformation: mm/year millimeter creep velocity and radar line-of-sight displacement.
3. Early Warning Frameworks: Reference official Indian frameworks:
   - GSI 4-tier Landslide Warning Matrix (Stage I: Watch/Green, Stage II: Alert/Yellow, Stage III: Warning/Orange, Stage IV: Action/Red).
   - IMD Heavy Rainfall Warnings (Yellow: Be updated, Orange: Be prepared, Red: Take action).
   - Incident Command System (NDRF, SDRF, BRO Pushpak / Swastik / Sewak, District Disaster Management Authorities - DDMAs).
4. Regional Context: Explicitly understand the physiography of the 8 Northeast States:
   - Mizoram (Aizawl, NH-54, NH-306, steep tertiary sandstone/shale synclines prone to bedding plane failure).
   - Sikkim (Gangtok, NH-10, Teesta River basin, glacial lake outbursts - GLOFs, high relief thrust faults).
   - Assam (Guwahati hills, Dima Hasao, Barak Valley, flash flooding and alluvial erosion).
   - Meghalaya (Cherrapunji/Mawsynram scarp, Shillong plateau, NH-6 lifeline).
   - Nagaland, Manipur, Arunachal Pradesh, and Tripura terrain characteristics.
5. Format: Structure responses with:
   - Immediate Summary / Danger Assessment
   - Detailed Technical Advice or Scientific Explanation
   - Actionable Life Safety Checklist
   - Relevant Emergency Helplines (National 112, NDMA 1078, State 1070)
"""

NER_EMERGENCY_CONTACTS: Dict[str, List[EmergencyContact]] = {
    "National": [
        EmergencyContact(service="National Emergency Number", number="112", description="Unified all-India police, fire & medical dispatch"),
        EmergencyContact(service="NDMA National Emergency Operations Centre", number="1078", description="24x7 Central Disaster Control Room"),
        EmergencyContact(service="NDRF Disaster Helpline", number="011-24363260", description="National Disaster Response Force Headquarters"),
        EmergencyContact(service="IMD Weather Warning Desk", number="1800-180-1717", description="Toll-free national meteorological advisories"),
    ],
    "Mizoram": [
        EmergencyContact(service="Mizoram State Disaster Management Authority (DM&R)", number="1070", description="State Emergency Operations Centre (SEOC), Aizawl"),
        EmergencyContact(service="Aizawl District Emergency Control Room", number="0389-2335842", description="DDMA Aizawl 24x7 control room"),
        EmergencyContact(service="BRO Pushpak Highway Control", number="0389-2350414", description="Border Roads Organisation - NH-54 / NH-306 clearance"),
    ],
    "Assam": [
        EmergencyContact(service="Assam State Disaster Management Authority (ASDMA)", number="1070", description="Toll-free 24x7 State Emergency Operations Centre"),
        EmergencyContact(service="ASDMA Emergency Desk", number="1079", description="State Disaster response and flood/landslide desk"),
        EmergencyContact(service="Guwahati DDMA Control Room", number="0361-2733052", description="Kamrup Metropolitan Emergency Operations"),
    ],
    "Sikkim": [
        EmergencyContact(service="Sikkim State Disaster Management Authority (SSDMA)", number="1070", description="Gangtok SEOC 24x7 emergency desk"),
        EmergencyContact(service="Gangtok District Emergency Operations Centre", number="1077", description="East Sikkim District Control Room"),
        EmergencyContact(service="BRO Swastik Control (NH-10 Lifeline)", number="03592-202248", description="Teesta valley corridor rockfall and slip clearance"),
    ],
    "Meghalaya": [
        EmergencyContact(service="Meghalaya SDMA Emergency Operations", number="1070", description="SEOC Shillong 24x7 hotline"),
        EmergencyContact(service="East Khasi Hills DDMA", number="0364-2224010", description="Shillong disaster management desk"),
    ],
    "Nagaland": [
        EmergencyContact(service="Nagaland State Disaster Management Authority (NSDMA)", number="1070", description="Kohima SEOC emergency operations"),
        EmergencyContact(service="BRO Sewak Control Room (NH-29)", number="03862-230018", description="Dimapur - Kohima highway landslide restoration"),
    ],
    "Manipur": [
        EmergencyContact(service="Manipur Relief & Disaster Management", number="1070", description="Imphal SEOC 24x7 emergency helpline"),
    ],
    "Arunachal Pradesh": [
        EmergencyContact(service="Arunachal Pradesh Disaster Management Department", number="1070", description="Itanagar SEOC 24x7 control room"),
        EmergencyContact(service="BRO Vartak / Arunank Control", number="0360-2212356", description="Trans-Arunachal Highway passes and avalanche clearance"),
    ],
    "Tripura": [
        EmergencyContact(service="Tripura Disaster Management Authority (TDMA)", number="1070", description="Agartala SEOC 24x7 emergency desk"),
    ],
}

OFFLINE_KNOWLEDGE_TOPICS = [
    {
        "keywords": ["early sign", "warning sign", "cracks", "bulge", "sound", "muddy", "trees leaning", "anticipate"],
        "category": "Landslide & Slope Failure",
        "severity": "WARNING",
        "title": "Early Warning Signs of an Impending Landslide",
        "reply": """### 🚨 Early Warning Signs of an Impending Landslide

Landslides rarely occur without precursors. In high-relief terrains such as Northeast India, watch for the following physical indicators:

1. **Terrain & Ground Deformations**:
   - **Tension Cracks**: New cracks widening in the soil or pavement along slope crests or road cut-slopes.
   - **Toe Bulging**: Ground at the base (toe) of the slope noticeably swelling or buckling upward.
   - **En echelon Cracking**: Stepped shear fractures appearing on retaining walls, foundations, or concrete drains.

2. **Hydrological Anomalies**:
   - Sudden appearance of new seeps, springs, or saturated bogs on hillsides.
   - Clear stream water turning abruptly muddy or chocolate-brown with heavy silt.
   - Abrupt stoppage or decrease in streamflow during rain, indicating an upstream debris damming event (extreme hazard).

3. **Structural & Vegetative Cues**:
   - Trees, utility poles, or retaining structures tilting downslope ("drunken forest").
   - Doors and windows sticking or jamming in hillside buildings as frames distort.
   - Faint rumbling, cracking, or popping noises underground as root networks snap and shear failure propagates.

If any of these signs appear during or immediately following heavy precipitation, evacuate perpendicular to the path of movement immediately.""",
        "checklist": [
            "Evacuate downslope and valley floor pathways immediately; move to stable ridges.",
            "Do not enter low-lying drainage channels or ravines during rainfall.",
            "Alert neighbors and village council (VDB / Local Council).",
            "Call 112 or District Emergency Operations Centre (1070).",
            "Shut off gas, electricity mains, and water connections before leaving.",
        ],
        "citations": [
            "GSI National Landslide Susceptibility Mapping (NLSM) Field Guide",
            "NDMA National Disaster Management Guidelines: Management of Landslides and Snow Avalanches (2009)",
            "Amrita AWNA Wireless Sensor Network Field Manual",
        ],
    },
    {
        "keywords": ["flash flood", "cloudburst", "heavy rain", "torrential", "river surge", "inundation"],
        "category": "Flash Flood & Cloudburst",
        "severity": "EMERGENCY",
        "title": "Flash Flood and Cloudburst Survival Protocols",
        "reply": """### 🌊 Cloudburst and Flash Flood Survival Protocols

A cloudburst delivers rainfall rates exceeding **100 mm/hour** over localized catchments, triggering rapid hyper-concentrated debris flows and flash floods within 15–45 minutes.

1. **Immediate Life-Saving Rules**:
   - **Climb to Higher Ground**: Immediately seek elevated terrain away from rivers, dry nallahs, and culverts. Even 6 inches of moving water can knock an adult down; 12 inches can sweep away small vehicles.
   - **Never Cross Flooded Bridges or Culverts**: Bridges can experience severe sub-surface scour and collapse without warning under fast-flowing debris.
   - **Avoid Low-Lying Confluences**: Valley choke points rapidly back up with silt and timber, causing catastrophic debris dams that breach unpredictably.

2. **Vehicle Protocol**:
   - If trapped in a vehicle stalled in rising water, abandon the vehicle immediately and climb to high ground. 
   - Never attempt to drive through road crossings showing fast muddy runoff.

3. **Community Evacuation**:
   - Move upstream or up onto flanking spurs rather than racing the flood downstream along the river road.""",
        "checklist": [
            "Immediately move to designated high-ground community shelters or ridge tops.",
            "Never attempt to ford flowing water on foot or by vehicle.",
            "Stay clear of electrical wires, downed poles, and submerged transformers.",
            "Keep emergency battery radio tuned to All India Radio (AIR) / local disaster alerts.",
            "Contact SEOC Helpline (1070) or National Emergency (112).",
        ],
        "citations": [
            "NDMA Standard Operating Procedure for Flash Flood Management",
            "Central Water Commission (CWC) Flood Forecasting Protocol",
            "IMD Severe Weather Warning Criteria",
        ],
    },
    {
        "keywords": ["pore water", "factor of safety", "fs", "mohr-coulomb", "physics", "stability", "equation", "formula", "sigmoid"],
        "category": "Geotechnical Engineering",
        "severity": "ADVISORY",
        "title": "Geotechnical Slope Stability & Factor of Safety (Fs)",
        "reply": """### 🔬 Subsurface Geotechnical Mechanics & Factor of Safety ($F_s$)

In steep regolith slopes across the Northeast, rainfall infiltration increases **Pore Water Pressure ($u$)**, reducing the effective normal stress holding the slope together.

1. **Mohr-Coulomb Limit Equilibrium**:
   $$\\tau = c' + (\\sigma_n - u)\\tan\\phi'$$
   Where:
   - $c'$ = Effective soil cohesion (kPa)
   - $\\sigma_n$ = Total normal stress from soil overburden (kPa)
   - $u$ = Pore water pressure sampled by piezometers (kPa)
   - $\\phi'$ = Effective internal friction angle (degrees)

2. **Deterministic Factor of Safety ($F_s$)**:
   $$F_s = \\frac{\\text{Resisting Shear Strength } (\\tau_{available})}{\\text{Driving Gravitational Shear Stress } (\\tau_{driving})}$$
   - **$F_s > 1.30$**: Stable slope under normal conditions.
   - **$1.00 \\le F_s \\le 1.30$**: Limit Equilibrium (Watch / Alert threshold). Creep velocity accelerates.
   - **$F_s < 1.00$**: Imminent or active shear plane failure.

3. **Real-Time Sigmoid Link**:
   The multivariate logit $z = \\beta_0 + \\sum w_i x_i$ converts geotechnical stress ratios, drainage density, and slope inclination into a smooth probability:
   $$\\sigma(z) = \\frac{1}{1 + e^{-z}}$$
   When $u$ spikes during monsoon downpours, $F_s$ drops below $1.0$ and $\\sigma(z)$ surges toward $1.0$, triggering automated SMS and sirens.""",
        "checklist": [
            "Inspect horizontal drains and weep holes for clear outflow and blockage.",
            "Verify deep borehole piezometer telemetry at 3m, 6m, and 9m depths.",
            "Deploy extensometers or inclinometers if Fs drops below 1.20.",
            "Notify district road and disaster authorities if creep velocity exceeds 15 μm/hour.",
        ],
        "citations": [
            "IS 14458: Guidelines for Retaining Wall for Hill Area",
            "Federal Highway Administration (FHWA) Rock Slopes Manual",
            "KIGAM Geotechnical Slope Monitoring Technical Report",
        ],
    },
    {
        "keywords": ["bio-engineering", "stabilization", "retaining wall", "mitigation", "vetiver", "horizontal drain", "gabion"],
        "category": "Disaster Mitigation & Engineering",
        "severity": "ADVISORY",
        "title": "Hill Slope Stabilization & Bio-Engineering Interventions",
        "reply": """### 🛠️ Hill Slope Stabilization & Bio-Engineering Techniques

Long-term slope stabilization requires a combination of structural engineering and ecological bio-engineering suited to high-rainfall tropical hills:

1. **Surface & Subsurface Drainage (Priority 1)**:
   - **Catchwater Drains**: Concrete or stone-lined berm drains constructed above the slope crest to intercept surface runoff before it reaches the vulnerable slope face.
   - **Deep Horizontal Drains**: Perforated PVC pipes (50–100mm diameter) drilled 15–30 meters into the hill at a 5° upward angle to relieve hydrostatic pore water pressure at the slip plane.
   - **Herringbone / French Drains**: Intersecting stone-filled gravel trenches across the face to channel sheetwash into lined roadside culverts.

2. **Bio-Engineering**:
   - **Vetiver Grass (Chrysopogon zizanioides)**: Massive dense root system penetrating 3–4 meters vertically within two seasons, acting as natural living soil nails with tensile strength up to 75 MPa.
   - **Broom Grass (Thysanolaena latifolia)** & Bamboo Clumps: Widely native across Mizoram, Meghalaya, and Nagaland; binds topsoil and reduces pore saturation.

3. **Structural Reinforcement**:
   - **Flexible Gabion Retaining Walls**: Wire mesh crates filled with angular basalt or sandstone rip-rap; self-draining and tolerant of minor ground subsidence without cracking.
   - **Soil Nailing & Shotcrete**: Steel tendons grouted into stable rock with wire mesh and sprayed concrete for near-vertical highway cut slopes.""",
        "checklist": [
            "Clear debris and silt from catchwater drains prior to the monsoon season.",
            "Plant vetiver grass along slope contours at 15cm inter-plant spacing.",
            "Check weeping holes in concrete retaining walls for free drainage.",
            "Avoid dumping uncompacted construction spoil or debris over hill crests.",
        ],
        "citations": [
            "Indian Roads Congress (IRC:SP:48) - Hill Road Drainage and Slope Protection Manual",
            "GSI Guidelines on Bio-engineering Applications for Landslide Mitigation",
            "CRRI (Central Road Research Institute) Slope Stabilization Compendium",
        ],
    },
]

STARTER_TOPICS: List[DisasterTopicGroup] = [
    DisasterTopicGroup(
        category="🌋 Landslide & Slope Hazards",
        topics=[
            DisasterTopic(
                id="topic-landslide-signs",
                category="Landslide",
                title="Early Signs of Slope Failure",
                prompt="What are the early physical signs and warnings that indicate a hill slope or road cut is about to collapse?",
                icon_name="AlertTriangle",
            ),
            DisasterTopic(
                id="topic-landslide-factors",
                category="Landslide",
                title="Factor of Safety & Pore Pressure",
                prompt="How does pore water pressure reduce the Factor of Safety (Fs) and cause deep slip plane failure?",
                icon_name="Gauge",
            ),
            DisasterTopic(
                id="topic-nh54-corridor",
                category="Landslide",
                title="NH-54 Highway Corridor Slips",
                prompt="What are the specific geological vulnerabilities of the NH-54 Silchar-Aizawl lifeline corridor?",
                icon_name="Truck",
            ),
        ],
    ),
    DisasterTopicGroup(
        category="🌊 Hydrological & Weather Extremes",
        topics=[
            DisasterTopic(
                id="topic-cloudburst-protocol",
                category="Flash Flood",
                title="Cloudburst Survival Protocols",
                prompt="What immediate actions should a village or school take if a sudden cloudburst occurs upstream?",
                icon_name="CloudRain",
            ),
            DisasterTopic(
                id="topic-imd-alerts",
                category="Weather",
                title="Understanding IMD & GSI Alerts",
                prompt="Explain the difference between IMD Red Alert and GSI 4-Tier Landslide Early Warning Matrix.",
                icon_name="Radio",
            ),
        ],
    ),
    DisasterTopicGroup(
        category="🛡️ Mitigation & Emergency Response",
        topics=[
            DisasterTopic(
                id="topic-bioengineering",
                category="Mitigation",
                title="Bio-Engineering Slope Protection",
                prompt="How can vetiver grass, horizontal drains, and gabions protect cut slopes from monsoon failure?",
                icon_name="Layers",
            ),
            DisasterTopic(
                id="topic-emergency-kit",
                category="Preparedness",
                title="Disaster Emergency Go-Bag",
                prompt="What essential supplies must be kept in a 72-hour family emergency evacuation kit in hilly terrain?",
                icon_name="CheckCircle2",
            ),
            DisasterTopic(
                id="topic-helpline-contacts",
                category="Helpline",
                title="Emergency Helplines for NE States",
                prompt="Provide the primary emergency contact numbers and disaster management control rooms across the 8 Northeast states.",
                icon_name="Phone",
            ),
        ],
    ),
]


class DisasterBotService:
    """Service to handle disaster queries using Google Gemini or intelligent fallback."""

    def __init__(self):
        self._env_api_key = os.environ.get("GEMINI_API_KEY")

    def _get_api_key(self, client_key: Optional[str] = None) -> Optional[str]:
        if client_key and client_key.strip():
            return client_key.strip()
        try:
            from src.core.config import settings
            if getattr(settings, "GEMINI_API_KEY", None):
                return settings.GEMINI_API_KEY
        except Exception:
            pass
        return os.environ.get("GEMINI_API_KEY") or self._env_api_key

    def get_topics(self) -> List[DisasterTopicGroup]:
        return STARTER_TOPICS

    def get_emergency_contacts(self, state: Optional[str] = None) -> List[EmergencyContact]:
        contacts: List[EmergencyContact] = list(NER_EMERGENCY_CONTACTS.get("National", []))
        if state and state in NER_EMERGENCY_CONTACTS:
            contacts = list(NER_EMERGENCY_CONTACTS[state]) + contacts
        elif state:
            # Check partial match
            for k, v in NER_EMERGENCY_CONTACTS.items():
                if k.lower() in state.lower():
                    contacts = list(v) + contacts
                    break
        return contacts

    def verify_gemini_key(self, api_key: str) -> VerifyKeyResponse:
        if not api_key or len(api_key.strip()) < 10:
            return VerifyKeyResponse(valid=False, message="Invalid API key format.")
        try:
            from google import genai
            client = genai.Client(api_key=api_key.strip())
            resp = None
            verified_model = GEMINI_MODEL
            for candidate in [GEMINI_MODEL, "gemini-3-flash-preview"]:
                try:
                    resp = client.models.generate_content(
                        model=candidate,
                        contents="Ping. Respond with 'OK'.",
                    )
                    if resp and resp.text:
                        verified_model = candidate
                        break
                except Exception:
                    continue
            if resp and resp.text:
                return VerifyKeyResponse(valid=True, model=verified_model, message="Key verified successfully!")
            return VerifyKeyResponse(valid=False, message="No response received from model candidates.")
        except Exception as exc:
            logger.warning(f"Failed to verify Gemini API key: {exc}")
            return VerifyKeyResponse(valid=False, message=f"Verification failed: {str(exc)}")

    def _fallback_response(self, request: DisasterChatRequest) -> DisasterChatResponse:
        """Rule-based intelligent knowledge retrieval when Gemini API key is absent or offline."""
        text = request.message.lower()
        matched_topic = None

        # Search matching knowledge entry by keywords
        best_score = 0
        for topic in OFFLINE_KNOWLEDGE_TOPICS:
            score = sum(1 for kw in topic["keywords"] if kw in text)
            if score > best_score:
                best_score = score
                matched_topic = topic

        contacts = self.get_emergency_contacts(request.state)

        if matched_topic and best_score > 0:
            return DisasterChatResponse(
                reply=matched_topic["reply"],
                model_used="sentinel-disaster-kb-v1 (Built-in Knowledge Engine)",
                is_live_gemini=False,
                disaster_category=matched_topic["category"],
                severity_level=matched_topic["severity"],
                actionable_checklist=matched_topic["checklist"],
                emergency_contacts=contacts[:4],
                source_citations=matched_topic["citations"],
            )

        # General Disaster Intelligence Response
        reply = f"""### 🛡️ Sentinel Disaster Management Assessment

Regarding your query: **"{request.message}"**

In mountainous terrain across **{request.state or 'Northeast India'}**, slope and hydro-meteorological risks depend heavily on:
1. **Current Rainfall Saturation**: Soils reaching >80% saturation rapidly lose effective shear strength ($c'$ and $\\phi'$).
2. **Terrain Slope & Geology**: Slopes exceeding $25^\\circ$ in weathered shale, sandstone, or phyllite interbedding exhibit high vulnerability to translational and rotational sliding.
3. **Infrastructure Proximity**: Road cutting without reinforced retaining structures destabilizes slope toes.

**Immediate Recommendations**:
- Stay tuned to district disaster management bulletins and local radio alerts.
- Monitor surface water runoff: if stream water turns muddy or flow abruptly stops, immediately evacuate up to high ridges.
- Avoid traveling on hill roads during intense downpours (especially along national highways NH-54, NH-10, and NH-6).
- If you notice new tension cracks on your property, alert neighbors and notify the local disaster authority."""

        checklist = [
            f"Contact {request.state or 'State'} Emergency Operations Centre (1070) or Police/Medical (112).",
            "Assemble essential supplies: water, dry food, flashlight, medication, and battery radio.",
            "Stay clear of slope toes, drainage nallahs, and vulnerable riverbanks.",
            "Do not inspect active rockfalls or slips on foot during rainfall.",
        ]

        return DisasterChatResponse(
            reply=reply,
            model_used="sentinel-disaster-kb-v1 (Built-in Knowledge Engine)",
            is_live_gemini=False,
            disaster_category="General Hazard Assessment",
            severity_level="ADVISORY",
            actionable_checklist=checklist,
            emergency_contacts=contacts[:4],
            source_citations=[
                "NDMA National Disaster Management Guidelines",
                "Geological Survey of India (GSI) Landslide Division Protocols",
                "Sentinel NER Disaster Telemetry Platform",
            ],
        )

    def process_chat(self, request: DisasterChatRequest) -> DisasterChatResponse:
        """Processes user disaster query with Google Gemini or falls back to built-in knowledge base."""
        api_key = self._get_api_key(request.gemini_api_key)

        if not api_key:
            logger.info("No Gemini API key supplied or configured. Using built-in Disaster Knowledge Engine.")
            return self._fallback_response(request)

        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)

            # Build regional context prompt
            context_prefix = f"[Active State: {request.state or 'Northeast India'}"
            if request.district:
                context_prefix += f", District/Corridor: {request.district}"
            context_prefix += "]\n\n"

            # Prepare conversation turns if available
            contents = []
            if request.conversation_history:
                for msg in request.conversation_history[-6:]:  # recent 6 turns
                    role = "model" if msg.role in ("model", "assistant") else "user"
                    contents.append(types.Content(role=role, parts=[types.Part.from_text(text=msg.content)]))

            # Add current user prompt
            user_full_prompt = context_prefix + request.message
            contents.append(types.Content(role="user", parts=[types.Part.from_text(text=user_full_prompt)]))

            config = types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=0.3,
                max_output_tokens=1500,
            )

            response = None
            used_model = GEMINI_MODEL
            last_err = None
            for candidate in [GEMINI_MODEL, "gemini-3-flash-preview"]:
                try:
                    response = client.models.generate_content(
                        model=candidate,
                        contents=contents,
                        config=config,
                    )
                    if response and response.text:
                        used_model = candidate
                        break
                except Exception as m_err:
                    logger.warning(f"Gemini candidate {candidate} failed: {m_err}")
                    last_err = m_err
                    continue

            if not response or not response.text:
                raise RuntimeError(f"All candidate models failed. Last error: {last_err}")

            raw_reply = response.text

            # Classify disaster category from content
            text_lower = (request.message + " " + raw_reply).lower()
            category = "General Disaster Advisory"
            severity = "ADVISORY"
            if "landslide" in text_lower or "slope" in text_lower or "rockfall" in text_lower or "debris" in text_lower:
                category = "Landslide & Slope Hazard"
                severity = "WARNING" if ("imminent" in text_lower or "evacuate" in text_lower or "danger" in text_lower) else "WATCH"
            elif "flood" in text_lower or "cloudburst" in text_lower or "river" in text_lower or "inundation" in text_lower:
                category = "Flash Flood & Cloudburst"
                severity = "EMERGENCY" if ("flash" in text_lower or "cloudburst" in text_lower or "surge" in text_lower) else "WARNING"
            elif "earthquake" in text_lower or "tremor" in text_lower:
                category = "Earthquake & Coseismic Hazard"
                severity = "WARNING"

            # Extract actionable checklist items from reply or provide defaults
            checklist = []
            for line in raw_reply.split("\n"):
                clean = line.strip()
                if (clean.startswith("- [ ]") or clean.startswith("-") or clean.startswith("*") or (len(clean) > 3 and clean[0].isdigit() and clean[1] in (".", ")"))) and len(clean) > 8:
                    sub = re.sub(r"^[-*0-9.)\s\[\]]+", "", clean).strip()
                    if len(sub) > 10 and len(sub) < 160:
                        checklist.append(sub)
                if len(checklist) >= 5:
                    break

            if not checklist:
                checklist = [
                    f"Follow instructions from local {request.state or 'District'} DDMA and SDRF teams.",
                    "Keep emergency supplies and battery radio charged and accessible.",
                    "If on steep terrain, monitor ground for tension cracks and toe bulging.",
                    "Dial 112 (All-India Emergency) or 1070 (State Disaster Helpline).",
                ]

            contacts = self.get_emergency_contacts(request.state)

            return DisasterChatResponse(
                reply=raw_reply,
                model_used=f"Google {used_model}",
                is_live_gemini=True,
                disaster_category=category,
                severity_level=severity,
                actionable_checklist=checklist[:5],
                emergency_contacts=contacts[:4],
                source_citations=[
                    "National Disaster Management Authority (NDMA) Guidelines",
                    "Geological Survey of India (GSI) Landslide Division",
                    "India Meteorological Department (IMD) Severe Weather Bulletins",
                ],
            )

        except Exception as exc:
            logger.error(f"Error invoking Gemini API: {exc}. Gracefully falling back to Disaster Knowledge Base.")
            fallback = self._fallback_response(request)
            fallback.reply = f"> ⚠️ *Note: Live Gemini API request encountered an issue ({str(exc)[:60]}...). Showing authoritative offline disaster response below.*\n\n" + fallback.reply
            return fallback


disaster_bot_service = DisasterBotService()
