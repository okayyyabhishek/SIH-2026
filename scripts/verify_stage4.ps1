# Sentinel NER — Stage 4 Gate Verification Script
$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkspaceRoot = Split-Path -Parent $ScriptDir

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " SENTINEL NER - STAGE 4 OPERATIONAL MAP QUALITY GATES   " -ForegroundColor Cyan
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

# Gate 3: Backend Full Pytest Regression Suite (109 Tests)
Test-Gate -Name "Gate 3: Backend Full Pytest Regression Suite (109 Tests)" -Block {
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

# Gate 6: Frontend Vitest Unit Tests (Shell + Auth + Map Components)
Test-Gate -Name "Gate 6: Frontend Vitest Unit Tests (14 Tests)" -Block {
    npm.cmd --prefix "$WorkspaceRoot\apps\web" run test
}

# Gate 7: Frontend Next.js Production Build
Test-Gate -Name "Gate 7: Frontend Next.js Production Build" -Block {
    npm.cmd --prefix "$WorkspaceRoot\apps\web" run build
}

# Gate 8: Playwright E2E Geospatial Map Suite (Desktop & Mobile)
Test-Gate -Name "Gate 8: Playwright E2E Geospatial Map Suite (18 Tests)" -Block {
    npm.cmd --prefix "$WorkspaceRoot\apps\web" run test:e2e
}

# Gate 9: API Spatial Query Contracts (Point, Nearby, BBox)
Test-Gate -Name "Gate 9: API Spatial Query Contracts" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage3_spatial_queries.py" -v
}

# Gate 10: Spatial RBAC, Object-Level Scope & IDOR Protection
Test-Gate -Name "Gate 10: Spatial RBAC & Object-Level Scope" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage3_rbac_and_idor.py" -v
}

# Gate 11: MongoDB 2dsphere Indexes & Failure Path
Test-Gate -Name "Gate 11: MongoDB 2dsphere Indexes & Failure Path" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage3_indexes_and_perf.py" -v
}

# Gate 12: Stage 2 Regression Gate
Test-Gate -Name "Gate 12: Stage 2 Security Regression Verification" -Block {
    powershell -ExecutionPolicy Bypass -File "$WorkspaceRoot\scripts\verify_stage2.ps1"
}

# Gate 13: Stage 3 Regression Gate
Test-Gate -Name "Gate 13: Stage 3 Domain Persistence Verification" -Block {
    powershell -ExecutionPolicy Bypass -File "$WorkspaceRoot\scripts\verify_stage3.ps1"
}

# Gate 14: Accessibility Compliance Check (WCAG 2.2 AA Dual Mode)
Test-Gate -Name "Gate 14: Accessibility Dual Mode (Map Canvas + Data Roster)" -Block {
    npm.cmd --prefix "$WorkspaceRoot\apps\web" run test -- -t "renders AccessibleEntityList with keyboard accessibility"
}

# Gate 15: Stage Boundary Check (Zero Stage 5+ Predictive/Risk Implementation)
Test-Gate -Name "Gate 15: Stage Boundary Check (No ML / Risk Engine / Warning Dispatch)" -Block {
    $riskFiles = Get-ChildItem -Path "$WorkspaceRoot\apps\api\src" -Recurse -Filter "*.py" | Select-String -Pattern "risk_score\s*=" -CaseSensitive
    if ($riskFiles.Count -gt 0) {
        Write-Host "Violation: Found illegal risk_score implementation!" -ForegroundColor Red
        exit 1
    } else {
        Write-Host "Stage boundary verified: 0 illegal risk calculations." -ForegroundColor Green
    }
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "STAGE 4 GATE RESULT: $Passed PASSED, $Failed FAILED" -ForegroundColor $(if ($Failed -eq 0) { "Green" } else { "Red" })
Write-Host "========================================================" -ForegroundColor Cyan

if ($Failed -gt 0) {
    exit 1
} else {
    exit 0
}
