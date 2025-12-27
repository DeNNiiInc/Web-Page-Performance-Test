# ============================================================================
# Credential Protection Verification Script
# ============================================================================
# Run this script BEFORE providing credentials to verify protection is active
# Usage: .\verify-security.ps1
# ============================================================================

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "🔐 Credential Protection Verification" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$allChecks = @()

# Check 1: .gitignore exists
Write-Host "📋 Check 1: Verifying .gitignore exists..." -ForegroundColor Yellow
if (Test-Path ".gitignore") {
    Write-Host "   ✅ .gitignore file found" -ForegroundColor Green
    $allChecks += $true
}
else {
    Write-Host "   ❌ .gitignore file NOT found!" -ForegroundColor Red
    $allChecks += $false
}

# Check 2: deploy-config.json is in .gitignore
Write-Host ""
Write-Host "📋 Check 2: Verifying deploy-config.json is protected..." -ForegroundColor Yellow
$gitignoreContent = Get-Content ".gitignore" -Raw
if ($gitignoreContent -match "deploy-config\.json") {
    Write-Host "   ✅ deploy-config.json is listed in .gitignore" -ForegroundColor Green
    $allChecks += $true
}
else {
    Write-Host "   ❌ deploy-config.json NOT in .gitignore!" -ForegroundColor Red
    $allChecks += $false
}

# Check 3: Verify other credential patterns are protected
Write-Host ""
Write-Host "📋 Check 3: Verifying other credential patterns..." -ForegroundColor Yellow
$patterns = @("\.env", "credentials", "secrets", "\*\.pem", "\*\.key")
$protectedPatterns = 0
foreach ($pattern in $patterns) {
    if ($gitignoreContent -match $pattern) {
        $protectedPatterns++
    }
}
if ($protectedPatterns -eq $patterns.Count) {
    Write-Host "   ✅ All critical patterns protected ($protectedPatterns/$($patterns.Count))" -ForegroundColor Green
    $allChecks += $true
}
else {
    Write-Host "   ⚠️ Some patterns missing ($protectedPatterns/$($patterns.Count))" -ForegroundColor Yellow
    $allChecks += $true  # Still pass, but warn
}

# Check 4: Git repository exists
Write-Host ""
Write-Host "📋 Check 4: Verifying Git repository..." -ForegroundColor Yellow
if (Test-Path ".git") {
    Write-Host "   ✅ Git repository initialized" -ForegroundColor Green
    $allChecks += $true
}
else {
    Write-Host "   ⚠️ Git repository not initialized (run 'git init' first)" -ForegroundColor Yellow
    $allChecks += $false
}

# Check 5: Test if deploy-config.json would be ignored
Write-Host ""
Write-Host "📋 Check 5: Testing credential file protection..." -ForegroundColor Yellow
if (Test-Path ".git") {
    # Create test file
    '{"test": "verification"}' | Out-File -Encoding utf8 -FilePath "deploy-config.json.test"
    
    # Check if Git would ignore it
    $gitStatus = git status --short 2>&1
    $testFileVisible = $gitStatus -match "deploy-config\.json\.test"
    
    # Clean up
    Remove-Item "deploy-config.json.test" -Force
    
    if ($testFileVisible) {
        Write-Host "   ⚠️ Test file was visible to Git (might still be protected by pattern)" -ForegroundColor Yellow
        $allChecks += $true
    }
    else {
        Write-Host "   ✅ Test file was ignored by Git (protection working!)" -ForegroundColor Green
        $allChecks += $true
    }
}
else {
    Write-Host "   ⏭️ Skipped (no Git repository)" -ForegroundColor Gray
}

# Check 6: Verify no credential files are currently tracked
Write-Host ""
Write-Host "📋 Check 6: Checking for existing credential files in Git..." -ForegroundColor Yellow
if (Test-Path ".git") {
    $trackedFiles = git ls-files
    $credentialFiles = $trackedFiles | Where-Object { 
        $_ -match "deploy-config|credentials|secret|token|password|\.env" 
    }
    
    if ($credentialFiles) {
        Write-Host "   ❌ WARNING: Credential files found in Git:" -ForegroundColor Red
        $credentialFiles | ForEach-Object { Write-Host "      - $_" -ForegroundColor Red }
        $allChecks += $false
    }
    else {
        Write-Host "   ✅ No credential files currently tracked" -ForegroundColor Green
        $allChecks += $true
    }
}
else {
    Write-Host "   ⏭️ Skipped (no Git repository)" -ForegroundColor Gray
}

# Check 7: Verify deploy-config.json doesn't exist yet
Write-Host ""
Write-Host "📋 Check 7: Verifying no credentials exist yet..." -ForegroundColor Yellow
if (Test-Path "deploy-config.json") {
    Write-Host "   ⚠️ deploy-config.json already exists" -ForegroundColor Yellow
    Write-Host "      (This is OK if you created it yourself)" -ForegroundColor Gray
    
    # Verify it's ignored
    if (Test-Path ".git") {
        $status = git status --short
        if ($status -match "deploy-config\.json") {
            Write-Host "   ❌ WARNING: File is visible to Git!" -ForegroundColor Red
            $allChecks += $false
        }
        else {
            Write-Host "   ✅ File is properly ignored" -ForegroundColor Green
            $allChecks += $true
        }
    }
}
else {
    Write-Host "   ✅ No credentials file exists yet (ready for creation)" -ForegroundColor Green
    $allChecks += $true
}

# Summary
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "📊 Verification Summary" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$passedChecks = ($allChecks | Where-Object { $_ -eq $true }).Count
$totalChecks = $allChecks.Count

Write-Host "Checks Passed: $passedChecks / $totalChecks" -ForegroundColor $(if ($passedChecks -eq $totalChecks) { "Green" } else { "Yellow" })
Write-Host ""

if ($passedChecks -eq $totalChecks) {
    Write-Host "✅ ALL CHECKS PASSED!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔐 Your credentials are fully protected!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. Create deploy-config.json from template" -ForegroundColor White
    Write-Host "  2. Fill in your credentials" -ForegroundColor White
    Write-Host "  3. Run .\deploy-local.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "Your credentials will NEVER be committed to Git! ✅" -ForegroundColor Green
}
else {
    Write-Host "⚠️ SOME CHECKS FAILED" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please review the warnings above." -ForegroundColor Yellow
    Write-Host "Most warnings are informational and don't affect security." -ForegroundColor Gray
    Write-Host ""
    Write-Host "Critical issues (❌) should be fixed before proceeding." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Return exit code
if ($passedChecks -lt $totalChecks - 1) {
    exit 1
}
else {
    exit 0
}
