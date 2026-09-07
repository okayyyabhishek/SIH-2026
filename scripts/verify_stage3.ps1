# Sentinel NER — Stage 3 Gate Verification Script
$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkspaceRoot = Split-Path -Parent $ScriptDir

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " SENTINEL NER - STAGE 3 DOMAIN DATA & GEOSPATIAL GATES  " -ForegroundColor Cyan
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

# Gate 2: Backend Linter (Ruff)
Test-Gate -Name "Gate 2: Backend Ruff Linter Check" -Block {
    python -m ruff check "$WorkspaceRoot\apps\api"
}

# Gate 3: GeoJSON 16-Case Validation Matrix
Test-Gate -Name "Gate 3: GeoJSON 16-Case Validation Matrix" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage3_geojson.py" -v
}

# Gate 4: Stage 3 Domain CRUD, Foreign References & Conflict Handling
Test-Gate -Name "Gate 4: Domain CRUD, Foreign-Reference Integrity & Bounded Pagination" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage3_domain_crud_and_integrity.py" -v
}

# Gate 5: Stage 3 Geospatial Query Primitives
Test-Gate -Name "Gate 5: Geospatial Query Primitives (Point-in-poly, Nearby, BBox)" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage3_spatial_queries.py" -v
}

# Gate 6: Stage 3 RBAC, Object-Level Scope & IDOR Defense
Test-Gate -Name "Gate 6: RBAC Capabilities, Multi-District Scope & IDOR Protection" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage3_rbac_and_idor.py" -v
}

# Gate 7: Stage 3 Indexes, Failure Recovery & Measured Benchmarks
Test-Gate -Name "Gate 7: MongoDB 2dsphere Indexes, Failure Recovery & Performance" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests\test_stage3_indexes_and_perf.py" -v
}

# Gate 8: Full Pytest Regression Suite (Stage 1 + Stage 2 + Stage 3)
Test-Gate -Name "Gate 8: Complete Backend Regression Suite (109 Tests)" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests" -v
}

# Gate 9: Frontend Typecheck
Test-Gate -Name "Gate 9: Frontend TypeScript Typecheck" -Block {
    npm.cmd --prefix "$WorkspaceRoot\apps\web" run typecheck
}

# Gate 10: Frontend Lint
Test-Gate -Name "Gate 10: Frontend ESLint Check" -Block {
    npm.cmd --prefix "$WorkspaceRoot\apps\web" run lint
}

# Gate 11: Frontend Unit Tests
Test-Gate -Name "Gate 11: Frontend Vitest Suite" -Block {
    npm.cmd --prefix "$WorkspaceRoot\apps\web" run test
}

# Gate 12: Frontend Production Build
Test-Gate -Name "Gate 12: Frontend Next.js Production Build" -Block {
    npm.cmd --prefix "$WorkspaceRoot\apps\web" run build
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "STAGE 3 GATE RESULT: $Passed PASSED, $Failed FAILED" -ForegroundColor $(if ($Failed -eq 0) { "Green" } else { "Red" })
Write-Host "========================================================" -ForegroundColor Cyan

if ($Failed -gt 0) {
    exit 1
} else {
    exit 0
}
