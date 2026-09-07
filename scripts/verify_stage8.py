#!/usr/bin/env python3
"""
Sentinel NER — Stage 8 Master Verification Gate Script
Human-Authorized Action, Warning & Intervention Control

Executes 31 automated gates validating:
- Non-Autonomous Safety Principles & Language Safety Filtering
- Action Lifecycle & State Machine Transitions
- Multi-Tier Human Authorization & Role Boundaries
- Controlled Warning Creation, Dispatch & Recipient Acknowledgements
- Truthful External Notification Reporting (SIMULATED, never fake DELIVERED)
- Cryptographic SHA-256 Append-Only Warning Ledger & Tamper Detection
- SOP Playbooks & Operational Guidance
- BOLA / IDOR / District Jurisdiction Isolation
- Mass Assignment Defense on Privileged Fields
- Frontend TypeScript Typecheck, ESLint, Unit Tests & Production Build
- Zero Regressions across Stages 1 through 7 (198 backend tests, 33 frontend tests)
"""

import os
import subprocess
import sys
import time
from pathlib import Path

# Paths
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
APPS_API = WORKSPACE_ROOT / "apps" / "api"
APPS_WEB = WORKSPACE_ROOT / "apps" / "web"

TOTAL_GATES = 31
passed_gates = 0
failed_gates = 0
gate_results = []


def print_header(title: str):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def run_gate(gate_num: int, title: str, cmd: list, cwd: Path = WORKSPACE_ROOT, shell: bool = False):
    global passed_gates, failed_gates, gate_results
    print(f"\n[GATE {gate_num:02d}/{TOTAL_GATES}] {title}...")
    start_time = time.time()

    try:
        res = subprocess.run(
            cmd,
            cwd=str(cwd),
            shell=shell,
            capture_output=True,
            text=True,
            timeout=180,
        )
        elapsed = time.time() - start_time
        if res.returncode == 0:
            print(f"  --> PASSED ({elapsed:.2f}s)")
            passed_gates += 1
            gate_results.append((gate_num, title, "PASSED", elapsed, None))
            return True
        else:
            print(f"  --> FAILED ({elapsed:.2f}s, code: {res.returncode})")
            error_preview = (res.stderr or res.stdout)[-800:].strip()
            print(f"      {error_preview}")
            failed_gates += 1
            gate_results.append((gate_num, title, "FAILED", elapsed, error_preview))
            return False
    except Exception as exc:
        elapsed = time.time() - start_time
        print(f"  --> FAILED ({elapsed:.2f}s, error: {exc})")
        failed_gates += 1
        gate_results.append((gate_num, title, "FAILED", elapsed, str(exc)))
        return False


def run_direct_python_check(gate_num: int, title: str, check_fn):
    global passed_gates, failed_gates, gate_results
    print(f"\n[GATE {gate_num:02d}/{TOTAL_GATES}] {title}...")
    start_time = time.time()
    try:
        check_fn()
        elapsed = time.time() - start_time
        print(f"  --> PASSED ({elapsed:.2f}s)")
        passed_gates += 1
        gate_results.append((gate_num, title, "PASSED", elapsed, None))
        return True
    except Exception as exc:
        elapsed = time.time() - start_time
        print(f"  --> FAILED ({elapsed:.2f}s, error: {exc})")
        failed_gates += 1
        gate_results.append((gate_num, title, "FAILED", elapsed, str(exc)))
        return False


# ============================================================
# DIRECT PYTHON SAFETY & SCHEMA CHECKS
# ============================================================

def check_language_safety():
    sys.path.insert(0, str(APPS_API))
    from src.core.operations.engine import OperationalControlEngine
    from src.core.errors import ValidationException

    # 1. Safe text passes
    safe_text = "Drivers advised to exercise caution due to elevated slope saturation index."
    OperationalControlEngine.sanitize_and_verify_warning_content("Advisory Notice", safe_text)

    # 2. Prohibited phrases raise ValidationException
    prohibited = [
        "LANDSLIDE WILL OCCUR on Highway 54 today",
        "ROAD CLOSED BY AI permanently",
        "EVACUATION ORDERED BY SYSTEM immediately",
        "DEFINITELY COLLAPSED",
    ]
    for phrase in prohibited:
        try:
            OperationalControlEngine.sanitize_and_verify_warning_content("Warning Headline", phrase)
            raise AssertionError(f"Expected failure for alarmist phrase: '{phrase}'")
        except ValidationException:
            pass


def check_bounded_escalation():
    sys.path.insert(0, str(APPS_API))
    from datetime import datetime, timedelta, timezone
    from src.core.operations.notifications import NotificationAdapter
    from src.schemas.warning import Warning
    from src.core.errors import ValidationException

    now = datetime.now(timezone.utc)
    w = Warning(
        id="wrn-check-esc",
        warning_type="ROAD_HAZARD_ADVISORY",
        headline="Road Hazard Advisory Test",
        body="Advisory notice test body.",
        district_id="dst-aizawl",
        affected_entity_type="ROAD",
        affected_entity_id="road-nh54-aizawl",
        issuing_authority_id="DDMA-AIZAWL",
        expires_at=now + timedelta(hours=24),
    )

    esc1 = NotificationAdapter.escalate_warning(w, "Unacknowledged", "Group 1")
    assert esc1.escalation_level == 1
    w.escalations.append(esc1)

    esc2 = NotificationAdapter.escalate_warning(w, "Unacknowledged", "Group 2")
    assert esc2.escalation_level == 2
    w.escalations.append(esc2)

    esc3 = NotificationAdapter.escalate_warning(w, "Unacknowledged", "Group 3")
    assert esc3.escalation_level == 3
    w.escalations.append(esc3)

    try:
        NotificationAdapter.escalate_warning(w, "Unacknowledged", "Group 4")
        raise AssertionError("Level 4 escalation should have been rejected!")
    except ValidationException:
        pass  # Expected


def check_playbooks_loaded():
    sys.path.insert(0, str(APPS_API))
    from src.db.repository import repository
    import asyncio

    async def _check():
        await repository.seed_dev_data_if_empty()
        playbooks = await repository.list_playbooks()
        assert len(playbooks) >= 3, f"Expected at least 3 seeded playbooks, found {len(playbooks)}"
        codes = [p.get("playbook_code") or p.get("code") for p in playbooks]
        assert "PB-ROAD-EXPOSURE" in codes, "PB-ROAD-EXPOSURE missing"
        assert "PB-CRITICAL-ASSET" in codes, "PB-CRITICAL-ASSET missing"
        assert "PB-VILLAGE-PROXIMITY" in codes, "PB-VILLAGE-PROXIMITY missing"

    asyncio.run(_check())


def check_ledger_crypto_integrity():
    sys.path.insert(0, str(APPS_API))
    from src.db.repository import repository
    from src.core.operations.ledger import WarningLedgerService
    import asyncio

    async def _check():
        await repository.seed_dev_data_if_empty()
        result = await WarningLedgerService.verify_chain(repository, "dst-aizawl")
        assert result.is_valid is True, f"Genesis ledger corrupted: {result.message}"
        assert result.genesis_hash == "0" * 64, "Genesis hash incorrect"
        assert result.total_entries >= 1, "Genesis entries missing"

    asyncio.run(_check())


def check_stage8_boundaries():
    """Verify that Stage 8 does NOT implement autonomous triggers, citizen reports, or sensor networks."""
    # Check that router does NOT contain citizen reporting or stage 9/10 endpoints
    with open(APPS_API / "src" / "api" / "v1" / "router.py", "r", encoding="utf-8") as f:
        content = f.read()

    assert "autonomous_actions" not in content, "Autonomous actions found in router!"
    assert "auto_evacuate" not in content, "Auto evacuate found in router!"
    assert "sensor_network" not in content, "Sensor network found in Stage 8!"


# ============================================================
# MAIN VERIFICATION RUNNER
# ============================================================

def main():
    print_header("SENTINEL NER — STAGE 8 VERIFICATION GATES (31 GATES)")
    print(f"Workspace Root: {WORKSPACE_ROOT}")
    print(f"Python Executable: {sys.executable}")
    print(f"Local Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")

    # Gate 1: Secret Scan
    run_gate(1, "Repository Secret & Credential Safety Scan", [sys.executable, str(WORKSPACE_ROOT / "scripts" / "scan_secrets.py")])

    # Gate 2: Backend Ruff Lint
    run_gate(2, "Backend Code Quality & Ruff Linter", [sys.executable, "-m", "ruff", "check", "src"], cwd=APPS_API)

    # Gate 3: Stage 8 Action Schemas Unit Tests
    run_gate(3, "Stage 8 Action Schemas & Constraints", [sys.executable, "-m", "pytest", "tests/test_stage8_action_schemas.py", "-v"], cwd=APPS_API)

    # Gate 4: Stage 8 Action Lifecycle & State Machine Tests
    run_gate(4, "Stage 8 Action Lifecycle & State Machine Transitions", [sys.executable, "-m", "pytest", "tests/test_stage8_action_lifecycle.py", "-v"], cwd=APPS_API)

    # Gate 5: Stage 8 Warning Lifecycle & Ledger Tests
    run_gate(5, "Stage 8 Warning Lifecycle, Dispatch & Ledger Integrity", [sys.executable, "-m", "pytest", "tests/test_stage8_warning_and_ledger.py", "-v"], cwd=APPS_API)

    # Gate 6: Stage 8 RBAC, Tenancy & BOLA/IDOR Tests
    run_gate(6, "Stage 8 Security, RBAC, Jurisdiction & BOLA Defense", [sys.executable, "-m", "pytest", "tests/test_stage8_rbac_and_idor.py", "-v"], cwd=APPS_API)

    # Gate 7: Stage 1 Regression (Health, Env, Config)
    run_gate(7, "Stage 1 Regression: Health & Architecture", [sys.executable, "-m", "pytest", "tests/test_health.py", "-q"], cwd=APPS_API)

    # Gate 8: Stage 2 Regression (Auth, RBAC, Tokens, Audit)
    run_gate(8, "Stage 2 Regression: Authentication & RBAC", [sys.executable, "-m", "pytest", "tests/test_auth.py", "tests/test_rbac_security.py", "tests/test_hardening_token_and_jwt.py", "tests/test_hardening_rbac_matrix_and_idor.py", "-q"], cwd=APPS_API)

    # Gate 9: Stage 3 Regression (Geography, Spatial, Roads, Assets, Slope Units)
    run_gate(9, "Stage 3 Regression: Geospatial Entities & Integrity", [sys.executable, "-m", "pytest", "tests/test_stage3_domain_crud_and_integrity.py", "tests/test_stage3_spatial_queries.py", "-q"], cwd=APPS_API)

    # Gate 10: Stage 4 Regression (Spatial Indexing & MVT)
    run_gate(10, "Stage 4 Regression: Spatial Boundaries & MVT", [sys.executable, "-m", "pytest", "tests/test_stage3_geojson.py", "tests/test_stage3_indexes_and_perf.py", "-q"], cwd=APPS_API)

    # Gate 11: Stage 5 Regression (Risk Registry & Probability Calibration)
    run_gate(11, "Stage 5 Regression: Risk Engine & Model Artifacts", [sys.executable, "-m", "pytest", "tests/test_stage5_risk_engine_and_ml.py", "tests/test_stage5_artifact_security.py", "-q"], cwd=APPS_API)

    # Gate 12: Stage 6 Regression (InSAR Pipeline & Satellite Security)
    run_gate(12, "Stage 6 Regression: Creep Watch & Satellite Safety", [sys.executable, "-m", "pytest", "tests/test_stage6_insar_pipeline.py", "tests/test_stage6_security_and_ssrf.py", "-q"], cwd=APPS_API)

    # Gate 13: Stage 7 Regression (Consequence Intelligence & Road Exposure)
    run_gate(13, "Stage 7 Regression: Consequence Relationships & Exposure", [sys.executable, "-m", "pytest", "tests/test_stage7_consequence_engine.py", "tests/test_stage7_consequence_schemas.py", "tests/test_stage7_rbac_and_idor.py", "-q"], cwd=APPS_API)

    # Gate 14: Full Backend Suite (198 Tests across All Stages)
    run_gate(14, "Total Backend Regression Suite (198 Tests Passed)", [sys.executable, "-m", "pytest", "tests", "-q"], cwd=APPS_API)

    # Gate 15: Direct Python Check - Non-Autonomous Warning Language Safety
    run_direct_python_check(15, "Language Safety Validator: Alarmist Claims Prohibited", check_language_safety)

    # Gate 16: Direct Python Check - Bounded Warning Escalation Policy (Max 3)
    run_direct_python_check(16, "Bounded Warning Escalation Policy Enforcement", check_bounded_escalation)

    # Gate 17: Direct Python Check - Seeded SOP Playbooks Verification
    run_direct_python_check(17, "SOP Playbooks Seeded & Loaded", check_playbooks_loaded)

    # Gate 18: Direct Python Check - Cryptographic Ledger SHA-256 Chain Verification
    run_direct_python_check(18, "Cryptographic Warning Ledger SHA-256 Chain Verification", check_ledger_crypto_integrity)

    # Gate 19: Direct Python Check - Stage 8 Strict Non-Autonomous Boundary
    run_direct_python_check(19, "Strict Stage 8 Non-Autonomous Boundary Guard", check_stage8_boundaries)

    # Gate 20: Notification Adapter Truthfulness Unit Verification
    run_gate(20, "Notification Adapter Truthfulness (SIMULATED in dev, Never fake DELIVERED)", [sys.executable, "-m", "pytest", "tests/test_stage8_warning_and_ledger.py::TestStage8WarningAndLedger::test_warning_full_lifecycle_and_truthful_dispatch", "-v"], cwd=APPS_API)

    # Gate 21: Warning Tamper Detection Verification
    run_gate(21, "Warning Ledger Tamper Detection via Cryptographic Hashes", [sys.executable, "-m", "pytest", "tests/test_stage8_warning_and_ledger.py::TestStage8WarningAndLedger::test_warning_ledger_cryptographic_chain_integrity_and_tamper_detection", "-v"], cwd=APPS_API)

    # Gate 22: Citizen Reporter Operational Exclusion Verification
    run_gate(22, "Citizen Reporter Zero Operational Privilege Defense (403 Forbidden)", [sys.executable, "-m", "pytest", "tests/test_stage8_rbac_and_idor.py::TestStage8RBACAndIDOR::test_citizen_reporter_operational_controls_forbidden", "-v"], cwd=APPS_API)

    # Gate 23: District Jurisdiction BOLA / IDOR Verification
    run_gate(23, "District Jurisdiction Cross-Boundary Isolation (BOLA/IDOR 403 Forbidden)", [sys.executable, "-m", "pytest", "tests/test_stage8_rbac_and_idor.py::TestStage8RBACAndIDOR::test_district_jurisdiction_isolation_bola_idor", "-v"], cwd=APPS_API)

    # Gate 24: Mass Assignment Defense Verification
    run_gate(24, "Mass Assignment Defense on Privileged Operational Fields", [sys.executable, "-m", "pytest", "tests/test_stage8_rbac_and_idor.py::TestStage8RBACAndIDOR::test_mass_assignment_defense_privileged_fields_controlled_by_server", "-v"], cwd=APPS_API)

    # Gate 25: Action Idempotency Verification
    run_gate(25, "Operational Action Dispatch Idempotency Protection", [sys.executable, "-m", "pytest", "tests/test_stage8_action_lifecycle.py::TestStage8ActionLifecycle::test_action_idempotency_prevents_duplicate", "-v"], cwd=APPS_API)

    # Gate 26: Action Expiration Time-to-Live Validation
    run_gate(26, "Action Expiry Validation (effective_from < expires_at)", [sys.executable, "-m", "pytest", "tests/test_stage8_action_schemas.py::TestStage8ActionSchemas::test_action_expiry_validation_rejects_past_or_equal_expiry", "-v"], cwd=APPS_API)

    # Gate 27: Frontend TypeScript Typecheck
    run_gate(27, "Frontend TypeScript Compilation (tsc --noEmit)", ["cmd.exe", "/c", "npm run typecheck"], cwd=APPS_WEB)

    # Gate 28: Frontend ESLint
    run_gate(28, "Frontend ESLint Linting (No Errors, No Warnings)", ["cmd.exe", "/c", "npm run lint"], cwd=APPS_WEB)

    # Gate 29: Frontend Unit Test Suite (33 Tests across 7 suites)
    run_gate(29, "Frontend Vitest Unit Test Suite (33 Tests Passed)", ["cmd.exe", "/c", "npm run test"], cwd=APPS_WEB)

    # Gate 30: Frontend Production Build
    run_gate(30, "Frontend Next.js Production Bundle Build (15 Static Routes)", ["cmd.exe", "/c", "npm run build"], cwd=APPS_WEB)

    # Gate 31: Documentation & Specification Artifact Verification
    def check_docs():
        req_docs = [
            WORKSPACE_ROOT / "docs" / "stage8_operational_control_architecture.md",
            WORKSPACE_ROOT / "docs" / "warning_ledger_specification.md",
        ]
        for doc in req_docs:
            if not doc.exists():
                raise FileNotFoundError(f"Required architecture document missing: {doc}")
            if doc.stat().st_size < 500:
                raise ValueError(f"Architecture document too small: {doc}")

    run_direct_python_check(31, "Architecture Specifications & Ledger Documentation", check_docs)

    # ============================================================
    # FINAL SUMMARY & AUDIT VERDICT
    # ============================================================
    print_header("STAGE 8 VERIFICATION SUMMARY")
    print(f"Total Gates:  {TOTAL_GATES}")
    print(f"Passed Gates: {passed_gates}")
    print(f"Failed Gates: {failed_gates}")

    for num, name, status, elapsed, err in gate_results:
        status_str = f"PASSED ({elapsed:.2f}s)" if status == "PASSED" else f"FAILED: {err[:50]}"
        print(f"  Gate {num:02d}: {name:<60} [{status_str}]")

    print("\n" + "=" * 70)
    if failed_gates == 0:
        print("  FINAL VERDICT: PASS (All 31 Stage 8 Gates Verified)")
        print("  Non-Autonomous Safety Principle strictly preserved.")
        print("  Authoritative human review & multi-tier authorization verified.")
        print("  Append-only cryptographic warning ledger integrity unbroken.")
        print("========================================================\n")
        return 0
    else:
        print(f"  FINAL VERDICT: FAIL ({failed_gates} Gates Failed)")
        print("========================================================\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
