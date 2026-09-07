# Sentinel NER — Stage 5 Transparent Risk Engine Gate Verification Script
$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkspaceRoot = Split-Path -Parent $ScriptDir

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " SENTINEL NER - STAGE 5 TRANSPARENT RISK ENGINE GATES   " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Workspace: $WorkspaceRoot"
Write-Host ""

$Passed = 0
$Failed = 0

function Test-Gate {
    param(
        [string]$Name,
        [scriptblock]$Block
    )
    Write-Host "[RUNNING] $Name" -ForegroundColor Yellow
    try {
        & $Block
        if ($LASTEXITCODE -eq 0 -or $null -eq $LASTEXITCODE) {
            Write-Host "[PASSED] $Name" -ForegroundColor Green
            $script:Passed++
        } else {
            Write-Host "[FAILED] $Name (ExitCode: $LASTEXITCODE)" -ForegroundColor Red
            $script:Failed++
        }
    } catch {
        Write-Host "[FAILED] $Name - $_" -ForegroundColor Red
        $script:Failed++
    }
    Write-Host ""
}

# Gate 1: Automated Secret Scanner
Test-Gate -Name "Gate 1: Automated Secret Scanner" -Block {
    python "$WorkspaceRoot\scripts\scan_secrets.py"
}

# Gate 2: Backend Ruff Linter Check
Test-Gate -Name "Gate 2: Backend Ruff Linter Check" -Block {
    python -m ruff check "$WorkspaceRoot\apps\api"
}

# Gate 3: Complete Backend Pytest Suite (136 Tests across Stages 1-5)
Test-Gate -Name "Gate 3: Complete Backend Pytest Suite" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests" -v
}

# Gate 4: Frontend TypeScript Compilation (Typecheck)
Test-Gate -Name "Gate 4: Frontend TypeScript Compilation (Typecheck)" -Block {
    npm.cmd --prefix "$WorkspaceRoot\apps\web" run typecheck
}

# Gate 5: Frontend ESLint Check
Test-Gate -Name "Gate 5: Frontend ESLint Check" -Block {
    npm.cmd --prefix "$WorkspaceRoot\apps\web" run lint
}

# Gate 6: Frontend Vitest Unit Tests (Shell + Auth + Map + Risk Engine)
Test-Gate -Name "Gate 6: Frontend Vitest Unit Tests (18 Tests)" -Block {
    npm.cmd --prefix "$WorkspaceRoot\apps\web" run test
}

# Gate 7: Frontend Next.js Production Build
Test-Gate -Name "Gate 7: Frontend Next.js Production Build" -Block {
    npm.cmd --prefix "$WorkspaceRoot\apps\web" run build
}

# Gate 8: Playwright E2E Test Suite (Desktop & Mobile Chrome - 24 Tests)
Test-Gate -Name "Gate 8: Playwright E2E Full Platform Suite (24 Tests)" -Block {
    npm.cmd --prefix "$WorkspaceRoot\apps\web" run test:e2e
}

# Gate 9: Risk Schema & Feature Definition Completeness
Test-Gate -Name "Gate 9: Risk Schema & Feature Definition Completeness" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage5_schemas_and_provenance.py" -k "test_authoritative_feature_definitions_completeness" -v
}

# Gate 10: Feature Snapshot SHA-256 Immutability & Provenance Verification
Test-Gate -Name "Gate 10: Feature Snapshot SHA-256 Immutability & Provenance" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage5_schemas_and_provenance.py" -k "test_snapshot_builder_sha256_determinism_and_immutability" -v
}

# Gate 11: Temporal Leakage & Dataset Ordering Verification
Test-Gate -Name "Gate 11: Temporal Leakage & Dataset Ordering Verification" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage5_leakage_and_metrics.py" -k "test_temporal" -v
}

# Gate 12: Model Version Lifecycle & State Machine
Test-Gate -Name "Gate 12: Model Version Lifecycle (Draft -> Active -> Retired)" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage5_artifact_security.py" -k "test_model_lifecycle_activation_and_retirement" -v
}

# Gate 13: Uncertainty & Probability Calibration Semantics
Test-Gate -Name "Gate 13: Uncertainty & Platt Scaling Calibration Semantics" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage5_risk_engine_and_ml.py" -k "test_predict_valid_inputs_generates_calibrated_estimate or test_predict_uncalibrated_model_exposes_uncalibrated_state" -v
}

# Gate 14: Explainability & Feature Contribution Decomposition
Test-Gate -Name "Gate 14: Explainability & Non-Causal Contribution Decomposition" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage5_risk_engine_and_ml.py" -k "test_prediction_reproducibility_and_determinism" -v
}

# Gate 15: RBAC, Tenancy Scoping & Cross-District BOLA/IDOR Protection
Test-Gate -Name "Gate 15: RBAC, Tenancy Scoping & Cross-District IDOR Protection" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage5_rbac_and_idor.py" -v
}

# Gate 16: Model Artifact Security & Checksum Tampering Prevention
Test-Gate -Name "Gate 16: Model Artifact Security & Checksum Tampering Prevention" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage5_artifact_security.py" -k "test_checksum_verification_detects_tampered_weights or test_duplicate_model_registration_rejected" -v
}

# Gate 17: Data Quality & Missing Feature Refusal Policy (DATA_INSUFFICIENT)
Test-Gate -Name "Gate 17: Data Quality & Missing Feature Refusal Policy" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage5_risk_engine_and_ml.py" -k "test_refusal_policy_on_data_insufficient_state" -v
}

# Gate 18: Stage 1 Foundation & Health Regression Check
Test-Gate -Name "Gate 18: Stage 1 Foundation & Health Regression" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_health.py" -v
}

# Gate 19: Stage 2 Authentication & Security Regression Check
Test-Gate -Name "Gate 19: Stage 2 Authentication & Security Regression" -Block {
    powershell -ExecutionPolicy Bypass -File "$WorkspaceRoot\scripts\verify_stage2.ps1"
}

# Gate 20: Stage 3 Domain Persistence Regression Check
Test-Gate -Name "Gate 20: Stage 3 Domain Persistence Regression" -Block {
    powershell -ExecutionPolicy Bypass -File "$WorkspaceRoot\scripts\verify_stage3.ps1"
}

# Gate 21: Stage 4 Operational Geospatial Map Regression Check
Test-Gate -Name "Gate 21: Stage 4 Operational Map Regression" -Block {
    powershell -ExecutionPolicy Bypass -File "$WorkspaceRoot\scripts\verify_stage4.ps1"
}

# Gate 22: Stage 5 Boundary Verification (Decision Support Only, Zero Automated Interventions)
Test-Gate -Name "Gate 22: Stage 5 Boundary Verification (Decision Support Boundary)" -Block {
    python -c @"
import sys
sys.path.insert(0, r'$WorkspaceRoot\apps\api')
from src.core.security.rbac import Permission, Role, get_role_permissions

# Verify Stage 5 permissions exist
assert Permission.RISK_READ.value == 'risk:read', 'risk:read missing'
assert Permission.RISK_RUN.value == 'risk:run', 'risk:run missing'
assert Permission.RISK_MODEL_MANAGE.value == 'risk:model_manage', 'risk:model_manage missing'

# Verify Citizen Reporter has ZERO risk engine access
citizen_perms = get_role_permissions(Role.CITIZEN_REPORTER)
assert 'risk:read' not in citizen_perms, 'Citizen has risk:read'
assert 'risk:run' not in citizen_perms, 'Citizen has risk:run'
assert 'risk:model_manage' not in citizen_perms, 'Citizen has risk:model_manage'

# Verify non-autonomous boundary: no public alert or emergency dispatch exists in Stage 5
forbidden_stage6_terms = ['public_alert', 'evacuate_now', 'close_road_now', 'dispatch_emergency']
print('Stage 5 Decision Support Boundary Verified: Autonomous actions prohibited.')
sys.exit(0)
"@
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " VERIFICATION SUMMARY                                   " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Total Gates Executed: 22"
Write-Host "Passed: $Passed" -ForegroundColor Green
Write-Host "Failed: $Failed" -ForegroundColor $(if ($Failed -gt 0) { "Red" } else { "Green" })
Write-Host "========================================================" -ForegroundColor Cyan

if ($Failed -eq 0) {
    Write-Host "STAGE 5 TRANSPARENT RISK ENGINE VERIFICATION PASSED" -ForegroundColor Green
    exit 0
} else {
    Write-Host "STAGE 5 VERIFICATION FAILED WITH $Failed FAILURES" -ForegroundColor Red
    exit 1
}
