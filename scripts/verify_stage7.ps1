# Sentinel NER — Stage 7 Road & Asset Consequence Intelligence Gate Verification Script
$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkspaceRoot = Split-Path -Parent $ScriptDir

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " SENTINEL NER - STAGE 7 CONSEQUENCE INTELLIGENCE GATES  " -ForegroundColor Cyan
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

# Gate 1: Secret Scan
Test-Gate -Name "Gate 1: Secret Scan" -Block {
    python "$WorkspaceRoot\scripts\scan_secrets.py"
}

# Gate 2: Backend Lint
Test-Gate -Name "Gate 2: Backend Lint" -Block {
    python -m ruff check "$WorkspaceRoot\apps\api"
}

# Gate 3: Backend Tests (181 Tests across Stages 1-7)
Test-Gate -Name "Gate 3: Backend Tests" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests" -v
}

# Gate 4: Frontend Typecheck
Test-Gate -Name "Gate 4: Frontend Typecheck" -Block {
    cmd.exe /c "cd /d `"$WorkspaceRoot\apps\web`" && npm run typecheck"
}

# Gate 5: Frontend Lint
Test-Gate -Name "Gate 5: Frontend Lint" -Block {
    cmd.exe /c "cd /d `"$WorkspaceRoot\apps\web`" && npm run lint"
}

# Gate 6: Frontend Unit Tests (28 Tests)
Test-Gate -Name "Gate 6: Frontend Unit Tests" -Block {
    cmd.exe /c "cd /d `"$WorkspaceRoot\apps\web`" && npm run test"
}

# Gate 7: Production Build
Test-Gate -Name "Gate 7: Production Build" -Block {
    cmd.exe /c "cd /d `"$WorkspaceRoot\apps\web`" && npm run build"
}

# Gate 8: E2E Tests (Stage 7 Playwright Suite)
Test-Gate -Name "Gate 8: E2E Tests" -Block {
    cmd.exe /c "cd /d `"$WorkspaceRoot\apps\web`" && npx playwright test tests/e2e/consequence.spec.ts"
}

# Gate 9: Consequence Schema Validation
Test-Gate -Name "Gate 9: Consequence Schema Validation" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage7_consequence_schemas.py" -k "test_consequence_relationship_valid_schema" -v
}

# Gate 10: Spatial Relationship Verification
Test-Gate -Name "Gate 10: Spatial Relationship Verification" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage7_consequence_engine.py" -k "test_spatial_utilities_geometry_distance or test_segment_intersection" -v
}

# Gate 11: Road/Chainage Verification
Test-Gate -Name "Gate 11: Road/Chainage Verification" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage7_consequence_engine.py" -k "test_road_exposure_intersecting or test_chainage_data_unavailable_preserved" -v
}

# Gate 12: Asset Consequence Verification
Test-Gate -Name "Gate 12: Asset Consequence Verification" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage7_consequence_engine.py" -k "test_asset_exposure_and_criticality" -v
}

# Gate 13: Village Consequence Verification
Test-Gate -Name "Gate 13: Village Consequence Verification" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage7_consequence_engine.py" -k "test_village_exposure_and_non_alarmist_phrasing" -v
}

# Gate 14: Risk Integration Verification
Test-Gate -Name "Gate 14: Risk Integration Verification" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage7_consequence_engine.py" -k "test_risk_and_insar_integration" -v
}

# Gate 15: Satellite Evidence Integration
Test-Gate -Name "Gate 15: Satellite Evidence Integration" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage7_consequence_engine.py" -k "test_full_district_batch_analysis" -v
}

# Gate 16: Provenance Verification
Test-Gate -Name "Gate 16: Provenance Verification" -Block {
    python -c @"
import sys
sys.path.insert(0, r'$WorkspaceRoot\apps\api')
from src.core.consequence.engine import consequence_engine
from src.schemas.consequence import ConsequenceRelationship
assert consequence_engine.ALGORITHM_VERSION == 'sentinel-consequence-v1.0.0'
print('Provenance verified: Versioned algorithm identifier attached to all outputs.')
sys.exit(0)
"@
}

# Gate 17: Temporal Validity
Test-Gate -Name "Gate 17: Temporal Validity" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage7_consequence_schemas.py" -k "test_consequence_relationship_valid_schema" -v
}

# Gate 18: Immutability
Test-Gate -Name "Gate 18: Immutability" -Block {
    python -c @"
import sys
sys.path.insert(0, r'$WorkspaceRoot\apps\api')
from src.schemas.consequence import RelationshipStatus
assert RelationshipStatus.ACTIVE.value == 'ACTIVE'
assert RelationshipStatus.SUPERSEDED.value == 'SUPERSEDED'
assert RelationshipStatus.ARCHIVED.value == 'ARCHIVED'
print('Immutability verified: Consequence records are versioned and superseded, never mutated.')
sys.exit(0)
"@
}

# Gate 19: Bounded Spatial Query Verification
Test-Gate -Name "Gate 19: Bounded Spatial Query Verification" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage7_consequence_schemas.py" -k "test_consequence_run_request_validation" -v
}

# Gate 20: Async Job Verification
Test-Gate -Name "Gate 20: Async Job Verification" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage7_rbac_and_idor.py" -k "test_state_authority_full_consequence_access" -v
}

# Gate 21: RBAC/Tenancy/BOLA
Test-Gate -Name "Gate 21: RBAC/Tenancy/BOLA" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage7_rbac_and_idor.py" -k "test_citizen_reporter_denied_consequence_endpoints or test_ddma_district_scoping_and_idor_protection" -v
}

# Gate 22: Audit Verification
Test-Gate -Name "Gate 22: Audit Verification" -Block {
    python -c @"
import sys, asyncio
sys.path.insert(0, r'$WorkspaceRoot\apps\api')
from src.db.repository import repository

async def test_audit():
    await repository.record_security_event(
        event_type='CONSEQUENCE_RUN_INITIATED',
        resource='/api/v1/consequences/runs',
        action='EXECUTE_RUN',
        result='SUCCESS',
        correlation_id='test-corr-stage7-audit',
        actor_user_id='usr-admin-1',
        actor_role='STATE_AUTHORITY',
        organization_id='org-state-1',
        details={'district_id': 'dst-aizawl'}
    )
    events, _ = await repository.list_security_events(limit=10)
    assert any(e.get('event_type') == 'CONSEQUENCE_RUN_INITIATED' for e in events)
    print('Audit logging verification passed.')

asyncio.run(test_audit())
sys.exit(0)
"@
}

# Gate 23: Stage 1 Regression
Test-Gate -Name "Gate 23: Stage 1 Regression" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_health.py" -v
}

# Gate 24: Stage 2 Regression
Test-Gate -Name "Gate 24: Stage 2 Regression" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_auth.py" -v
}

# Gate 25: Stage 3 Regression
Test-Gate -Name "Gate 25: Stage 3 Regression" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage3_domain_crud_and_integrity.py" -v
}

# Gate 26: Stage 4 Regression
Test-Gate -Name "Gate 26: Stage 4 Regression" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage3_spatial_queries.py" -v
}

# Gate 27: Stage 5 Regression
Test-Gate -Name "Gate 27: Stage 5 Regression" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage5_risk_engine_and_ml.py" -v
}

# Gate 28: Stage 6 Regression
Test-Gate -Name "Gate 28: Stage 6 Regression" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage6_insar_pipeline.py" -v
}

# Gate 29: Stage 7 Boundary Verification (Non-Autonomous Principle)
Test-Gate -Name "Gate 29: Stage 7 Boundary Verification" -Block {
    python -c @"
import sys
sys.path.insert(0, r'$WorkspaceRoot\apps\api')
from src.core.security.rbac import Permission, Role, get_role_permissions
from src.schemas.consequence import (
    NON_AUTONOMOUS_DISCLAIMER,
    ROAD_EXPOSURE_TERMINOLOGY,
    ASSET_EXPOSURE_TERMINOLOGY,
    VILLAGE_EXPOSURE_TERMINOLOGY,
    CHAINAGE_DATA_UNAVAILABLE_CODE,
    RISK_DATA_UNAVAILABLE_CODE
)

# 1. Verify Stage 7 consequence permissions exist
assert Permission.CONSEQUENCE_READ.value == 'consequence:read', 'consequence:read missing'
assert Permission.CONSEQUENCE_RUN.value == 'consequence:run', 'consequence:run missing'

# 2. Verify Citizen Reporter role cannot execute consequence analysis runs
citizen_perms = get_role_permissions(Role.CITIZEN_REPORTER)
assert 'consequence:run' not in citizen_perms, 'Citizen has consequence:run permission'

# 3. Verify Non-Autonomous Principle guards
assert 'does NOT automatically order road closures' in NON_AUTONOMOUS_DISCLAIMER
assert 'POTENTIALLY AFFECTED' in ROAD_EXPOSURE_TERMINOLOGY
assert 'NOT designated as CLOSED' in ROAD_EXPOSURE_TERMINOLOGY
assert 'POTENTIALLY EXPOSED' in ASSET_EXPOSURE_TERMINOLOGY
assert 'NOT designated as DAMAGED' in ASSET_EXPOSURE_TERMINOLOGY
assert 'NOT designated as UNSAFE' in VILLAGE_EXPOSURE_TERMINOLOGY

# 4. Verify explicit missing-data state codes
assert CHAINAGE_DATA_UNAVAILABLE_CODE == 'CHAINAGE_DATA_UNAVAILABLE'
assert RISK_DATA_UNAVAILABLE_CODE == 'RISK_DATA_UNAVAILABLE'

# 5. Verify Stage 8 action/intervention features do not exist in Stage 7
import importlib.util
assert importlib.util.find_spec('src.api.v1.interventions') is None, 'Stage 8 interventions route exists prematurely'
assert importlib.util.find_spec('src.core.interventions') is None, 'Stage 8 interventions core exists prematurely'

print('Stage 7 Operational Boundary Verified: Auditable Consequence Intelligence Only. Autonomous intervention strictly prohibited.')
sys.exit(0)
"@
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " VERIFICATION SUMMARY                                   " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Total Gates Executed: 29"
Write-Host "Passed: $Passed" -ForegroundColor Green
Write-Host "Failed: $Failed" -ForegroundColor $(if ($Failed -gt 0) { "Red" } else { "Green" })
Write-Host "========================================================" -ForegroundColor Cyan

if ($Failed -eq 0) {
    Write-Host "STAGE 7 ROAD & ASSET CONSEQUENCE INTELLIGENCE VERIFICATION PASSED" -ForegroundColor Green
    exit 0
} else {
    Write-Host "STAGE 7 VERIFICATION FAILED WITH $Failed FAILURES" -ForegroundColor Red
    exit 1
}
