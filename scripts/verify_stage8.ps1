# Sentinel NER — Stage 8 Operational Control & Warning Ledger Gate Verification Script
$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkspaceRoot = Split-Path -Parent $ScriptDir

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " SENTINEL NER - STAGE 8 OPERATIONAL CONTROL GATES       " -ForegroundColor Cyan
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

# Run the master python verification script
Test-Gate -Name "Stage 8 Master 31-Gate Verification Script" -Block {
    python "$WorkspaceRoot\scripts\verify_stage8.py"
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " STAGE 8 VERIFICATION SUMMARY                           " -ForegroundColor Cyan
Write-Host " Passed: $Passed, Failed: $Failed                       " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

if ($Failed -eq 0) {
    Exit 0
} else {
    Exit 1
}
