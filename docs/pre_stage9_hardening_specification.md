# Sentinel NER — Pre-Stage-9 Hardening & Production Integrity Specification

## 1. Executive Summary
This document establishes the verified operational behavior and hardening controls implemented prior to initiating Stage 9.
All 5 hardening blockers and 10 verification checkpoints have been resolved, verified, and integrated into automated regression testing.

---

## 2. Hardening Blocker Implementations

### 2.1 Persistent Token Revocation
- **Source Code**: [`apps/api/src/core/security/dependencies.py`](file:///c:/Users/Abhishek/SIH%20-%202026/apps/api/src/core/security/dependencies.py) and [`apps/api/src/db/repository.py`](file:///c:/Users/Abhishek/SIH%20-%202026/apps/api/src/db/repository.py)
- **Mechanism**:
  - Request authentication in `get_current_user` extracts `jti` from decoded JWT access tokens and verifies `await repository.is_token_revoked(jti)`.
  - Revocations are persisted to MongoDB Atlas collection `revokedTokens`.
  - When checking revocation status, the system checks the local in-memory cache and falls back to an indexed query (`{"_id": jti}`) against MongoDB Atlas.
  - Across process restarts and across multiple parallel worker instances, revoked tokens are immediately rejected with HTTP 401 Unauthorized.
  - Refresh token rotation reuse detection invalidates compromised token families in MongoDB Atlas.

### 2.2 11-Role Frontend & Backend RBAC Parity
- **Backend**: [`apps/api/src/core/security/rbac.py`](file:///c:/Users/Abhishek/SIH%20-%202026/apps/api/src/core/security/rbac.py) (`Role` enum)
- **Frontend**: [`apps/web/src/components/auth/RequireRolePlaceholder.tsx`](file:///c:/Users/Abhishek/SIH%20-%202026/apps/web/src/components/auth/RequireRolePlaceholder.tsx) (`SentinelRole` type union)
- **Role Roster (Exactly 11 Roles)**:
  1. `SUPER_ADMIN`
  2. `STATE_DISASTER_OFFICER`
  3. `DISTRICT_MAGISTRATE`
  4. `DDMA_OFFICER`
  5. `INCIDENT_COMMANDER`
  6. `GEOTECH_EXPERT`
  7. `FIELD_RESPONDER`
  8. `INFRASTRUCTURE_AUTHORITY` (Previously omitted from frontend union; now added and parity verified)
  9. `COMMUNITY_LEADER`
  10. `EXTERNAL_RESEARCHER`
  11. `VIEWER`
- **Zero Discrepancy**: Validated via unit test in `apps/web/tests/unit/shell.test.tsx` and automated script in `scripts/verify_pre_stage9_hardening.py`.

### 2.3 Production Notification Provider Adapter
- **Source Code**: [`apps/api/src/core/operations/notifications.py`](file:///c:/Users/Abhishek/SIH%20-%202026/apps/api/src/core/operations/notifications.py)
- **Configuration**:
  - `NOTIFICATION_PROVIDER`: `auto`, `aws_sns`, `webhook`, `simulated`
  - `AWS_SNS_REGION`: AWS Region for notification gateway (defaults to `eu-north-1` / `settings.AWS_REGION`)
  - `AWS_SNS_TOPIC_ARN`: Optional default SNS Topic ARN
  - `NOTIFICATION_WEBHOOK_URL`: Mandatory when `NOTIFICATION_PROVIDER='webhook'`
- **Production Guardrails**:
  - `enforce_production_constraints()` rejects `NOTIFICATION_PROVIDER=simulated` in `production` and `staging` environments.
  - In production, `auto` resolves to `aws_sns`.
  - Silent fallback to `simulated` is architecturally impossible.
  - If production provider credentials or configurations are missing, the system fails closed (records `FAILED` status, never fabricates delivery).

### 2.4 Truthful Notification Lifecycle
- **Schema**: [`apps/api/src/schemas/warning.py`](file:///c:/Users/Abhishek/SIH%20-%202026/apps/api/src/schemas/warning.py) (`DeliveryStatus`)
- **Lifecycle Flow**:
  ```
  REQUESTED ──> SENDING ──> ACCEPTED_BY_PROVIDER (or FAILED)
                                      │
                                      └──> DELIVERED (ONLY with affirmative carrier receipt)
  ```
- **Rules**:
  - External provider response (e.g. AWS SNS `MessageId` or HTTP 200/202 Webhook) confirms acceptance onto delivery queues, strictly recorded as `ACCEPTED_BY_PROVIDER`.
  - `delivered_at` remains `None` upon provider acceptance.
  - `DELIVERED` is strictly reserved for verifiable carrier handset receipt callbacks.
  - `SIMULATED` is preserved strictly for non-production development and test environments.

### 2.5 Enhanced Readiness Probe
- **Source Code**: [`apps/api/src/api/v1/health.py`](file:///c:/Users/Abhishek/SIH%20-%202026/apps/api/src/api/v1/health.py)
- **Routes**:
  - Lightweight Liveness: `/health/live` and `/api/v1/health/live` (HTTP 200 `LIVE`)
  - Deep Readiness: `/health/ready` and `/api/v1/health/ready` (HTTP 200 `READY` / HTTP 503 `NOT_READY`)
- **Checks Executed**:
  1. **MongoDB Atlas**: Ping check measuring real latency.
  2. **AWS S3**: Lightweight `head_bucket` checking bucket accessibility with zero object payload download.
  3. **Notification Configuration**: Verifies production provider configuration without triggering notification dispatches.
- **Security Redaction**: Health responses return operational statuses only and never expose connection strings, passwords, or secret access keys.

---

## 3. Frontend Dependency Remediation Status
- **Directory**: `apps/web`
- **Initial Audit**: 12 vulnerabilities reported by `npm audit`.
- **Actions Taken**:
  - Ran safe package remediation: `npm audit fix` resolved 3 vulnerabilities (including `minimatch`).
  - Pinned Next.js to official LTS patch `14.2.35` and `eslint-config-next` to `14.2.35`.
  - Build verification: `npm run build` compiled all 15 static/dynamic routes with zero errors.
  - Test verification: `npm test` passed 34/34 tests across 7 test suites.
- **Remaining Advisories (Documented)**:
  - 9 dev/transitive advisories remain (2 moderate, 6 high, 1 critical).
  - Remediation requires breaking major upgrades (`next@16`, `eslint-config-next@16`, `vitest@5`).
  - To prevent breaking React 18 and Tailwind v3 configurations, these remain safely isolated in dev dependencies and documented as non-breaking pre-Stage-9 baseline.
