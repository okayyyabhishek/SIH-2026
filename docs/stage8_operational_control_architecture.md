# Sentinel NER — Stage 8: Human-Authorized Action, Warning & Intervention Control Architecture

## 1. Executive Summary & Non-Autonomous Safety Principle

Sentinel NER Stage 8 establishes a strictly non-autonomous, accountable, and auditable operational control layer.
The platform bridges raw consequence intelligence (Stage 7), machine learning risk estimations (Stage 5), and satellite/InSAR deformation telemetry (Stage 6) with certified human decision-makers.

### The Non-Autonomous Operational Invariant
Under **NO circumstances** does the system autonomously execute physical interventions or public broadcasts.
The following autonomous operational triggers are strictly prohibited:

```
[PROHIBITED AUTONOMOUS FLOWS]
Risk Prediction       ──X──>  Automatic Public Warning
Satellite Creep Watch ──X──>  Automatic Road Closure
Consequence Analysis  ──X──>  Automatic Settlement Evacuation
Hazard Index Spike    ──X──>  Automatic Field Crew Dispatch

[MANDATORY NON-AUTONOMOUS CONTROL FLOW]
Evidence (Stg 5, 6, 7)
       ↓
Synthesized Recommendation
       ↓
Technical Engineering Review (PENDING_REVIEW)
       ↓
Authoritative Human Authorization (APPROVED / REJECTED)
       ↓
Controlled Agency Dispatch (QUEUED / IN_PROGRESS)
       ↓
Truthful External Notification (SIMULATED in dev, never fake DELIVERED)
       ↓
Formal Recipient Acknowledgement (DELIVERED ≠ ACKNOWLEDGED)
       ↓
Ground Outcome Verification (COMPLETED)
       ↓
Append-Only Cryptographic Warning Ledger
```

---

## 2. Domain Entities & State Machine Architecture

### 2.1 Action Recommendation Lifecycle
The action lifecycle enforces strict unidirectional transitions verified on the server:

```
RECOMMENDED
    ↓  (action:review, permission: ACTION_REVIEW)
PENDING_REVIEW
    ↓  (action:authorize, permission: ACTION_AUTHORIZE)
APPROVED   ───────>  REJECTED (terminal)
    ↓
QUEUED
    ↓  (action:execute, permission: ACTION_EXECUTE)
IN_PROGRESS
    ↓  (action:outcome, permission: ACTION_EXECUTE)
COMPLETED
```

Alternative terminal states:
- `REJECTED`: Explicitly rejected by certified authority with auditable justification.
- `CANCELLED`: Withdrawn before execution.
- `EXPIRED`: Timestamp `now > expires_at`. Expired recommendations cannot be authorized or executed.
- `FAILED`: Operational deployment aborted due to on-site obstruction.

### 2.2 Controlled Warning Workflow
Warnings represent formal emergency advisories to designated public channels and inter-agency groups.
A warning is **never** created directly from model predictions.

```
DRAFT
  ↓  (warning:review, permission: WARNING_REVIEW)
REVIEW
  ↓  (warning:authorize, permission: WARNING_AUTHORIZE)
AUTHORIZED
  ↓  (warning:dispatch, permission: WARNING_DISPATCH)
DISPATCHING
  ↓
DISPATCHED
  ↓  (recipient:acknowledge, permission: WARNING_ACKNOWLEDGE)
PARTIALLY_ACKNOWLEDGED / ACKNOWLEDGED
  ↓
EXPIRED / CANCELLED / RESOLVED
```

---

## 3. Security, RBAC & Multi-Tenancy Architecture

### 3.1 Role Hierarchy & Permissions Matrix
Stage 8 adds 13 granular operational permissions:

| Permission | Description | Authorized Roles |
| :--- | :--- | :--- |
| `ACTION_READ` | Read action recommendations and history | Admin, State, DDMA, PWD, BRO, NHIDCL, Railways, Field Officer, Auditor |
| `ACTION_CREATE` | Propose action recommendation from evidence | Admin, State, DDMA, PWD, BRO, NHIDCL, Field Officer |
| `ACTION_REVIEW` | Conduct technical review and record notes | Admin, State, DDMA, PWD, BRO, NHIDCL, Railways |
| `ACTION_AUTHORIZE` | Authorize, reject, or request info | Admin, State, DDMA (High Authority) |
| `ACTION_EXECUTE` | Dispatch field personnel and record outcome | Admin, State, DDMA, PWD, BRO, NHIDCL, Field Officer |
| `WARNING_READ` | View warnings and delivery receipts | Admin, State, DDMA, PWD, BRO, NHIDCL, Railways, Auditor |
| `WARNING_CREATE` | Create draft warning advisory | Admin, State, DDMA |
| `WARNING_REVIEW` | Conduct operational warning review | Admin, State, DDMA |
| `WARNING_AUTHORIZE` | Authorize warning for dissemination | Admin, State, DDMA (Statutory Authority) |
| `WARNING_DISPATCH` | Initiate multi-channel transmission | Admin, State, DDMA |
| `WARNING_ACKNOWLEDGE`| Record recipient acknowledgement | Admin, State, DDMA, PWD, BRO, NHIDCL, Field Officer |
| `LEDGER_READ` | Inspect append-only warning ledger | Admin, State, DDMA, Auditor |
| `LEDGER_VERIFY` | Trigger cryptographic chain verification | Admin, State, DDMA, Auditor |

**Citizen Reporters** explicitly have **ZERO** operational control permissions. Attempts by unprivileged or citizen accounts return `403 Forbidden`.

### 3.2 Broken Object Level Authorization (BOLA) & Jurisdiction Defense
Every request enforces district jurisdiction boundaries server-side:
- A DDMA officer assigned to `dst-aizawl` cannot inspect, review, authorize, or dispatch actions or warnings in `dst-kolasib`.
- Cross-district requests return `403 Forbidden` with:
  `"User with role 'DDMA' and district 'dst-aizawl' cannot inspect or operate on resources in district 'dst-kolasib'"`

### 3.3 Mass Assignment Defense
The server strictly derives and owns all privileged state fields:
- Client cannot forge `authorized_by`, `status`, `authorization_status`, `ledger_hash`, or `created_at`.
- Client payloads with attempted injections are either sanitized via Pydantic model schemas or rejected.

---

## 4. Language Safety Contract & Microcopy Standards

To prevent societal panic, economic disruption, and miscommunication, Stage 8 enforces language safety filtering on all generated warnings and recommendations:

### Prohibited Alarmist Claims vs Safe Objective Phrasing
- ❌ **Prohibited:** `"LANDSLIDE WILL OCCUR"`
  - ✔️ **Permitted:** `"MODEL PREDICTS ELEVATED RISK / WATCH POSTED"`
- ❌ **Prohibited:** `"ROAD IS CLOSED"`
  - ✔️ **Permitted:** `"POTENTIALLY AFFECTED / PROCEED WITH CAUTION"`
- ❌ **Prohibited:** `"VILLAGE IS UNSAFE / EVACUATE IMMEDIATELY"`
  - ✔️ **Permitted:** `"SPATIALLY EXPOSED / PRECAUTIONARY MONITORING"`
- ❌ **Prohibited:** `"LANDSLIDE CONFIRMED"` (from InSAR alone)
  - ✔️ **Permitted:** `"InSAR DEFORMATION MEASURED / GROUND VERIFICATION REQUIRED"`

Attempts to submit warnings containing prohibited alarmist claims are rejected server-side with `STG_LANGUAGE_SAFETY_VIOLATION` (HTTP 400).

---

## 5. Truthful External Notification Integration & Multi-Channel Providers

The `NotificationAdapter` interfaces external delivery gateways across:
- `SMS`
- `EMAIL`
- `PUSH_NOTIFICATION`
- `WEB_NOTIFICATION`
- `VHF_RADIO_RELAY`

### Supported Providers & Configuration
Configured via `NOTIFICATION_PROVIDER`:
- `aws_sns`: Production AWS Simple Notification Service integration (SMS & Topic publish).
- `webhook`: Production HTTP webhook integration for custom civil defense alerting systems.
- `simulated`: Non-production mock adapter for developer workflows and unit test execution.
- `auto`: Defaults to `aws_sns` in `production`/`staging`, and `simulated` in `development`/`test`.

### Production Rejection & Fail-Closed Invariants
- `NOTIFICATION_PROVIDER=simulated` is strictly rejected at application startup and runtime in `production` and `staging` environments.
- If production provider credentials or configuration are absent, dispatch immediately fails closed (recording `FAILED` with explicit audit details, never silently falling back to simulated).

### Truthful Lifecycle State Machine
```
REQUESTED ──> SENDING ──> ACCEPTED_BY_PROVIDER (or FAILED)
                                    │
                                    └──> DELIVERED (ONLY upon verifiable handset receipt)
```
- **ACCEPTED_BY_PROVIDER ≠ DELIVERED**: Transport acceptance from AWS SNS or HTTP Webhook endpoints only confirms message queuing by external infrastructure. It is strictly recorded as `ACCEPTED_BY_PROVIDER`.
- **DELIVERED**: Only set when an affirmative carrier delivery receipt or delivery receipt callback is received.
- **SIMULATED**: Explicitly marked on dev/test records; never disguised as real transmission.
- **DELIVERED ≠ ACKNOWLEDGED**: Even confirmed carrier receipt does not equal human responder comprehension. Formal acknowledgement requires affirmative recipient signature (`ACKNOWLEDGED`).

### Bounded Escalation Policy
- Warning escalations are strictly bounded to a **maximum of 3 escalation levels**.
- Infinite escalation loops and notification storms are architecturally prevented.

---

## 6. Standard Operating Procedure (SOP) Playbooks

Versioned operational playbooks provide procedural decision-support:
1. `PB-ROAD-EXPOSURE` (v1.2.0): Highway Slope Assessment SOP (PWD / BRO).
2. `PB-CRITICAL-ASSET` (v1.1.0): Bridge & Infrastructure Abutment Integrity SOP.
3. `PB-VILLAGE-PROXIMITY` (v1.0.0): Village Habitation Settlement Precautionary SOP.

Each playbook specifies trigger criteria, mandatory verification steps, required authority roles, and strictly prohibited autonomous actions.
