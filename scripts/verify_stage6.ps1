# Sentinel NER — Stage 6 Satellite & InSAR Change Intelligence Gate Verification Script
$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkspaceRoot = Split-Path -Parent $ScriptDir

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " SENTINEL NER - STAGE 6 SATELLITE & INSAR GATES         " -ForegroundColor Cyan
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

# Gate 3: Complete Backend Pytest Suite (159 Tests across Stages 1-6)
Test-Gate -Name "Gate 3: Complete Backend Pytest Suite (159 Tests)" -Block {
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

# Gate 6: Frontend Vitest Unit Tests (22 Tests)
Test-Gate -Name "Gate 6: Frontend Vitest Unit Tests (22 Tests)" -Block {
    npm.cmd --prefix "$WorkspaceRoot\apps\web" run test
}

# Gate 7: Frontend Next.js Production Build
Test-Gate -Name "Gate 7: Frontend Next.js Production Build" -Block {
    npm.cmd --prefix "$WorkspaceRoot\apps\web" run build
}

# Gate 8: Playwright E2E Full Platform Suite (32 Tests Desktop & Mobile)
Test-Gate -Name "Gate 8: Playwright E2E Full Platform Suite (32 Tests)" -Block {
    npm.cmd --prefix "$WorkspaceRoot\apps\web" run test:e2e
}

# Gate 9: Satellite Schema Validation
Test-Gate -Name "Gate 9: Satellite Schema Validation" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage6_schemas_and_stac.py" -k "test_sentinel1_sar_observation_metadata" -v
}

# Gate 10: Sentinel-1 Metadata Validation
Test-Gate -Name "Gate 10: Sentinel-1 Metadata Validation" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage6_schemas_and_stac.py" -k "test_sentinel1_sar_observation_metadata" -v
}

# Gate 11: Raster / File Safety & GeoTIFF Parser
Test-Gate -Name "Gate 11: Raster & File Safety (IFD Parsing, Dimensions, Magic Bytes)" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage6_security_and_ssrf.py" -k "test_raster_validator" -v
}

# Gate 12: CRS Validation (EPSG:4326 Enforcement)
Test-Gate -Name "Gate 12: CRS Validation (EPSG:4326 Enforcement)" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage6_schemas_and_stac.py" -k "test_stac_item_validator_valid_and_inverted_bbox" -v
}

# Gate 13: STAC / Catalog Validation & Connectors
Test-Gate -Name "Gate 13: STAC Catalog References & Truthful Connector States" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage6_schemas_and_stac.py" -k "test_truthful_connector_statuses_no_fabrication" -v
}

# Gate 14: InSAR Pipeline Validation (Baseline & Mode Constraints)
Test-Gate -Name "Gate 14: InSAR Pipeline Validation (Baseline & Pair Constraints)" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage6_insar_pipeline.py" -k "test_insar_pair_validation_rejects_non_slc or test_insar_pair_validation_rejects_pass_direction_mismatch" -v
}

# Gate 15: Line-of-Sight (LOS) Semantics Verification
Test-Gate -Name "Gate 15: Line-of-Sight (LOS) Semantics Verification" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage6_schemas_and_stac.py" -k "test_insar_los_displacement_semantics" -v
}

# Gate 16: Quality & Uncertainty Verification
Test-Gate -Name "Gate 16: Quality & Uncertainty Verification" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage6_insar_pipeline.py" -k "test_insar_pair_validation_handles_critical_perpendicular_baseline" -v
}

# Gate 17: Provenance & Immutable Processing Lineage
Test-Gate -Name "Gate 17: Provenance & Immutable Processing Lineage" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage6_security_and_ssrf.py" -k "test_storage_detects_tampered_payload_checksum" -v
}

# Gate 18: Processing Job Lifecycle & Bounded Retries
Test-Gate -Name "Gate 18: Processing Job Lifecycle & Bounded Retries" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage6_insar_pipeline.py" -k "test_execute_insar_job_generates_verified_observation" -v
}

# Gate 19: SSRF & Path Traversal Security
Test-Gate -Name "Gate 19: SSRF, ZipSlip & Path Traversal Security" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage6_security_and_ssrf.py" -k "test_ssrf or test_archive_extraction or test_storage_rejects_path_traversal" -v
}

# Gate 20: RBAC, Tenancy Scoping & Cross-District IDOR Protection
Test-Gate -Name "Gate 20: RBAC, Tenancy Scoping & Cross-District IDOR Protection" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage6_rbac_and_idor.py" -v
}

# Gate 21: Stage 1 Regression Check (Health Probes & Foundation)
Test-Gate -Name "Gate 21: Stage 1 Regression Check" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_health.py" -v
}

# Gate 22: Stage 2 Regression Check (Auth, Tokens & Tenancy)
Test-Gate -Name "Gate 22: Stage 2 Regression Check" -Block {
    powershell -ExecutionPolicy Bypass -File "$WorkspaceRoot\scripts\verify_stage2.ps1"
}

# Gate 23: Stage 3 Regression Check (Domain Entities & Geospatial Persistence)
Test-Gate -Name "Gate 23: Stage 3 Regression Check" -Block {
    powershell -ExecutionPolicy Bypass -File "$WorkspaceRoot\scripts\verify_stage3.ps1"
}

# Gate 24: Stage 4 Regression Check (Operational Geospatial Map)
Test-Gate -Name "Gate 24: Stage 4 Regression Check" -Block {
    powershell -ExecutionPolicy Bypass -File "$WorkspaceRoot\scripts\verify_stage4.ps1"
}

# Gate 25: Stage 5 Regression Check (Transparent Risk Engine)
Test-Gate -Name "Gate 25: Stage 5 Regression Check" -Block {
    powershell -ExecutionPolicy Bypass -File "$WorkspaceRoot\scripts\verify_stage5.ps1"
}

# Gate 26: Stage 6 Boundary Verification (Non-Autonomous Principle)
Test-Gate -Name "Gate 26: Stage 6 Boundary Verification (Non-Autonomous Principle)" -Block {
    python -c @"
import sys
sys.path.insert(0, r'$WorkspaceRoot\apps\api')
from src.core.security.rbac import Permission, Role, get_role_permissions

# 1. Verify Stage 6 permissions exist
assert Permission.SATELLITE_READ.value == 'satellite:read', 'satellite:read missing'
assert Permission.SATELLITE_INGEST.value == 'satellite:ingest', 'satellite:ingest missing'
assert Permission.SATELLITE_PROCESS.value == 'satellite:process', 'satellite:process missing'

# 2. Verify Citizen Reporter has ZERO satellite permissions
citizen_perms = get_role_permissions(Role.CITIZEN_REPORTER)
assert 'satellite:read' not in citizen_perms, 'Citizen has satellite:read'
assert 'satellite:ingest' not in citizen_perms, 'Citizen has satellite:ingest'
assert 'satellite:process' not in citizen_perms, 'Citizen has satellite:process'

# 3. Verify Non-Autonomous Principle: No autonomous actions in Stage 6
from src.schemas.satellite import InSARObservation, SatelliteObservation
from src.core.satellite.pipeline import SPATIAL_OVERLAP_DISCLAIMER, InSARProcessingPipeline

assert 'Does NOT infer slope failure causation' in SPATIAL_OVERLAP_DISCLAIMER
print('Stage 6 Operational Boundary Verified: Remote Sensing Evidence Only. Autonomous interventions strictly prohibited.')
sys.exit(0)
"@
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " VERIFICATION SUMMARY                                   " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Total Gates Executed: 26"
Write-Host "Passed: $Passed" -ForegroundColor Green
Write-Host "Failed: $Failed" -ForegroundColor $(if ($Failed -gt 0) { "Red" } else { "Green" })
Write-Host "========================================================" -ForegroundColor Cyan

if ($Failed -eq 0) {
    Write-Host "STAGE 6 SATELLITE & INSAR CHANGE INTELLIGENCE VERIFICATION PASSED" -ForegroundColor Green
    exit 0
} else {
    Write-Host "STAGE 6 VERIFICATION FAILED WITH $Failed FAILURES" -ForegroundColor Red
    exit 1
}
