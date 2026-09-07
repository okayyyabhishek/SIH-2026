# Sentinel NER — Stage 1 Gate Verification Script
$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkspaceRoot = Split-Path -Parent $ScriptDir

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " SENTINEL NER - STAGE 1 ACCEPTANCE AND QUALITY GATES   " -ForegroundColor Cyan
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

# 1. Automated Secret Scanner
Test-Gate -Name "1. Automated Secret Scanner" -Block {
    python "$WorkspaceRoot\scripts\scan_secrets.py"
}

# 2. Backend Pytest
Test-Gate -Name "2. Backend Pytest Suite" -Block {
    python -m pytest "$WorkspaceRoot\apps\api\tests" -v
}

# 3. Frontend Typecheck
Test-Gate -Name "3. Frontend TypeScript Compilation" -Block {
    npm.cmd --prefix "$WorkspaceRoot\apps\web" run typecheck
}

# 4. Frontend Lint
Test-Gate -Name "4. Frontend ESLint Check" -Block {
    npm.cmd --prefix "$WorkspaceRoot\apps\web" run lint
}

# 5. Frontend Unit Tests
Test-Gate -Name "5. Frontend Vitest Unit Suite" -Block {
    npm.cmd --prefix "$WorkspaceRoot\apps\web" run test
}

# 6. Frontend Production Build
Test-Gate -Name "6. Frontend Next.js Production Build" -Block {
    npm.cmd --prefix "$WorkspaceRoot\apps\web" run build
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "STAGE 1 GATE RESULT: $Passed PASSED, $Failed FAILED" -ForegroundColor $(if ($Failed -eq 0) { "Green" } else { "Red" })
Write-Host "========================================================" -ForegroundColor Cyan

if ($Failed -gt 0) {
    exit 1
} else {
    exit 0
}
