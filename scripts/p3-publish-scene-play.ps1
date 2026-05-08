param(
  [string]$ApiBaseUrl = "http://localhost:3000/v1",
  [string]$GameKey = ""
)

$ErrorActionPreference = "Stop"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"

if (-not $GameKey) {
  $GameKey = "p3_scene_play_deve_cuce_$stamp"
}

$artifactsDir = "artifacts\verification"
$summaryFile = "$artifactsDir\p3-publish-scene-play-$stamp.md"
$payloadFile = "$artifactsDir\p3-published-game-payload-$stamp.json"

if (-not (Test-Path $artifactsDir)) {
  New-Item -ItemType Directory -Path $artifactsDir -Force | Out-Null
}

Write-Host "=== P3 Scene Play Publish QA ===" -ForegroundColor Cyan
Write-Host "API Base URL : $ApiBaseUrl"
Write-Host "Game Key     : $GameKey"
Write-Host "Timestamp    : $stamp"
Write-Host ""

# ── Step 1: Check backend is reachable ──────────────────────────
Write-Host "[1/7] Checking backend reachability..." -ForegroundColor Yellow
try {
  $health = Invoke-RestMethod -Uri "$ApiBaseUrl/game-definitions/active?appVersion=0.1.0" -Method Get -TimeoutSec 15
  Write-Host "  OK: Backend reachable. Active games count: $($health.items.Count)" -ForegroundColor Green
} catch {
  Write-Host "  FAIL: Backend not reachable at $ApiBaseUrl" -ForegroundColor Red
  Write-Host "  Start backend with: npm.cmd run start:dev --workspace backend" -ForegroundColor Red
  exit 1
}

# ── Step 2: Create unique SCENE_PLAY draft ──────────────────────
Write-Host "[2/7] Creating SCENE_PLAY draft..." -ForegroundColor Yellow

$draftBody = @{
  gameKey           = $GameKey
  template          = "SCENE_PLAY"
  title             = "P3 Deve Cuce Remote QA"
  description       = "P3 admin publish QA test game. Cuce gelirse squat, deve gelirse jumping jack yap."
  minAppVersion     = "0.1.0"
  orientation       = "LANDSCAPE"
  cameraRequirement = "FULL_BODY"
  category          = "EDUCATION"
  supportedMotions  = @("SQUAT", "JUMPING_JACK")
  levels            = @(
    @{
      levelId      = "p3_scene_play_level"
      durationSec  = 45
      targetScore  = 100
      difficulty   = "EASY"
      motionRules  = @(
        @{ motion = "SQUAT"; event = "REP_COUNTED"; points = 10; cooldownMs = 500 }
        @{ motion = "JUMPING_JACK"; event = "REP_COUNTED"; points = 12; cooldownMs = 450 }
        @{ motion = "SQUAT"; event = "BAD_FORM"; points = -5; cooldownMs = 250 }
        @{ motion = "JUMPING_JACK"; event = "BAD_FORM"; points = -5; cooldownMs = 250 }
      )
      rewardRules  = @(
        @{ rewardType = "STAR"; amount = 2; minimumScore = 80 }
      )
      config       = @{
        spawnRateMs = 2400
        maxObjects  = 5
        lives       = 3
      }
      sceneConfig  = @{
        type        = "PROMPT_SEQUENCE"
        maxObjects  = 5
        spawnRateMs = 2400
        objects     = @(
          @{
            objectId       = "cuce_prompt"
            objectType     = "cuce_prompt"
            label          = "Cuce"
            assetKey       = "cuceCard"
            requiredMotion = "SQUAT"
            points         = 10
            lifeMs         = 2400
          }
          @{
            objectId       = "deve_prompt"
            objectType     = "deve_prompt"
            label          = "Deve"
            assetKey       = "deveCard"
            requiredMotion = "JUMPING_JACK"
            points         = 12
            lifeMs         = 2400
          }
        )
      }
      interactionRules = @(
        @{
          input     = "MOTION_EVENT"
          motion    = "SQUAT"
          event     = "REP_COUNTED"
          action    = "ADD_SCORE"
          points    = 10
          cooldownMs = 1000
        }
        @{
          input     = "MOTION_EVENT"
          motion    = "JUMPING_JACK"
          event     = "REP_COUNTED"
          action    = "ADD_SCORE"
          points    = 12
          cooldownMs = 1000
        }
        @{
          input     = "MOTION_EVENT"
          event     = "BAD_FORM"
          action    = "DECREASE_LIFE"
          points    = -5
          cooldownMs = 500
        }
      )
      tasks         = @()
      programSteps  = @(
        @{
          stepId          = "p3_scene_play_step"
          type            = "PLAY_GAME"
          title           = "Komutu takip et"
          description     = "Cuce gelirse squat, deve gelirse jumping jack yap."
          durationSec     = 45
          successMessage  = "P3 remote Scene Play tamamlandi."
          nextOnComplete  = $true
        }
      )
    }
  )
  assets            = @{
    background = "local://scene-play/background"
    character  = "local://scene-play/hero"
  }
  actorId           = "p3-qa-script"
}

$bodyJson = $draftBody | ConvertTo-Json -Depth 10 -Compress

try {
  $created = Invoke-RestMethod -Uri "$ApiBaseUrl/internal/game-definitions" -Method Post -Body $bodyJson -ContentType "application/json" -TimeoutSec 30
} catch {
  Write-Host "  FAIL: Create request failed: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "  Response: $responseBody" -ForegroundColor Red
  }
  exit 1
}

if (-not $created.id) {
  Write-Host "  FAIL: Create response missing id: $($created | ConvertTo-Json)" -ForegroundColor Red
  exit 1
}

$gameId = $created.id
Write-Host "  OK: Draft created. id=$gameId status=$($created.status) version=$($created.version)" -ForegroundColor Green

# ── Step 3: Fetch validation ───────────────────────────────────
Write-Host "[3/7] Fetching validation..." -ForegroundColor Yellow
try {
  $validation = Invoke-RestMethod -Uri "$ApiBaseUrl/internal/game-definitions/$gameId/validation" -Method Get -TimeoutSec 15
} catch {
  Write-Host "  FAIL: Validation request failed: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

if ($validation.errors -and $validation.errors.Count -gt 0) {
  Write-Host "  FAIL: Validation errors found:" -ForegroundColor Red
  foreach ($err in $validation.errors) {
    Write-Host "    - $err" -ForegroundColor Red
  }
  Write-Host "  Not publishing - fix validation errors first." -ForegroundColor Red
  $draftBody | ConvertTo-Json -Depth 10 > "$artifactsDir\p3-failed-draft-$stamp.json"
  Write-Host "  Draft payload saved to artifacts\verification\p3-failed-draft-$stamp.json" -ForegroundColor Yellow
  exit 1
}

Write-Host "  OK: Validation clean (no errors)" -ForegroundColor Green

# ── Step 4: Publish ────────────────────────────────────────────
Write-Host "[4/7] Publishing game..." -ForegroundColor Yellow
$publishBody = @{ actorId = "p3-qa-script"; note = "P3 QA automated publish" } | ConvertTo-Json

try {
  $published = Invoke-RestMethod -Uri "$ApiBaseUrl/internal/game-definitions/$gameId/publish" -Method Post -Body $publishBody -ContentType "application/json" -TimeoutSec 30
} catch {
  Write-Host "  FAIL: Publish request failed: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "  Response: $responseBody" -ForegroundColor Red
  }
  exit 1
}

if ($published.error) {
  Write-Host "  FAIL: Publish returned error: $($published.error)" -ForegroundColor Red
  if ($published.errors) {
    foreach ($err in $published.errors) {
      Write-Host "    - $err" -ForegroundColor Red
    }
  }
  exit 1
}

Write-Host "  OK: Published. status=$($published.status) publishedAt=$($published.publishedAt)" -ForegroundColor Green

# ── Step 5: Verify in active definitions ───────────────────────
Write-Host "[5/7] Verifying game appears in active definitions..." -ForegroundColor Yellow
try {
  $active = Invoke-RestMethod -Uri "$ApiBaseUrl/game-definitions/active?appVersion=0.1.0" -Method Get -TimeoutSec 15
} catch {
  Write-Host "  FAIL: Active definitions request failed: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

$found = $active.items | Where-Object { $_.id -eq $gameId }
if (-not $found) {
  Write-Host "  FAIL: Published game NOT found in active definitions!" -ForegroundColor Red
  Write-Host "  Active game count: $($active.items.Count)" -ForegroundColor Red
  Write-Host "  Active game keys: $($active.items.gameKey -join ', ')" -ForegroundColor Red
  exit 1
}

if ($found.status -ne "PUBLISHED") {
  Write-Host "  FAIL: Game found but status is $($found.status), not PUBLISHED" -ForegroundColor Red
  exit 1
}

Write-Host "  OK: Game found in active definitions. status=$($found.status) gameKey=$($found.gameKey)" -ForegroundColor Green

# ── Step 6: Save payload evidence ──────────────────────────────
Write-Host "[6/7] Saving evidence artifacts..." -ForegroundColor Yellow
$published | ConvertTo-Json -Depth 10 > $payloadFile
Write-Host "  Payload saved to $payloadFile" -ForegroundColor Green

# Step 7: Write summary
Write-Host "[7/7] Writing evidence summary..." -ForegroundColor Yellow

$dateStr = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$summaryPath = $summaryFile
Set-Content -Path $summaryPath -Encoding utf8 -Value "# P3 Scene Play Publish QA - Script Evidence"
Add-Content -Path $summaryPath -Encoding utf8 -Value ""
Add-Content -Path $summaryPath -Encoding utf8 -Value "**Date:** $dateStr"
Add-Content -Path $summaryPath -Encoding utf8 -Value "**Script timestamp:** $stamp"
Add-Content -Path $summaryPath -Encoding utf8 -Value "**API Base URL:** $ApiBaseUrl"
Add-Content -Path $summaryPath -Encoding utf8 -Value "**Game Key:** $GameKey"
Add-Content -Path $summaryPath -Encoding utf8 -Value ""
Add-Content -Path $summaryPath -Encoding utf8 -Value "## Result"
Add-Content -Path $summaryPath -Encoding utf8 -Value ""
Add-Content -Path $summaryPath -Encoding utf8 -Value "**P3 Publish: PASS**"
Add-Content -Path $summaryPath -Encoding utf8 -Value ""
Add-Content -Path $summaryPath -Encoding utf8 -Value "## Published Game"
Add-Content -Path $summaryPath -Encoding utf8 -Value ""
Add-Content -Path $summaryPath -Encoding utf8 -Value "- **id:** $gameId"
Add-Content -Path $summaryPath -Encoding utf8 -Value "- **gameKey:** $($published.gameKey)"
Add-Content -Path $summaryPath -Encoding utf8 -Value "- **title:** $($published.title)"
Add-Content -Path $summaryPath -Encoding utf8 -Value "- **template:** $($published.template)"
Add-Content -Path $summaryPath -Encoding utf8 -Value "- **category:** $($published.category)"
Add-Content -Path $summaryPath -Encoding utf8 -Value "- **status:** $($published.status)"
Add-Content -Path $summaryPath -Encoding utf8 -Value "- **version:** $($published.version)"
Add-Content -Path $summaryPath -Encoding utf8 -Value "- **publishedAt:** $($published.publishedAt)"
Add-Content -Path $summaryPath -Encoding utf8 -Value ""
Add-Content -Path $summaryPath -Encoding utf8 -Value "## Validation"
Add-Content -Path $summaryPath -Encoding utf8 -Value ""
Add-Content -Path $summaryPath -Encoding utf8 -Value "- Pre-publish validation: CLEAN (no errors)"
Add-Content -Path $summaryPath -Encoding utf8 -Value ""
Add-Content -Path $summaryPath -Encoding utf8 -Value "## Active Endpoint Check"
Add-Content -Path $summaryPath -Encoding utf8 -Value ""
Add-Content -Path $summaryPath -Encoding utf8 -Value "- Game appears in active endpoint"
Add-Content -Path $summaryPath -Encoding utf8 -Value "- Status confirmed as PUBLISHED"
Add-Content -Path $summaryPath -Encoding utf8 -Value "- Active definitions count: $($active.items.Count)"
Add-Content -Path $summaryPath -Encoding utf8 -Value ""
Add-Content -Path $summaryPath -Encoding utf8 -Value "## Scene Objects"
Add-Content -Path $summaryPath -Encoding utf8 -Value ""
Add-Content -Path $summaryPath -Encoding utf8 -Value "- cuce_prompt: SQUAT, 10 points, 2400ms life"
Add-Content -Path $summaryPath -Encoding utf8 -Value "- deve_prompt: JUMPING_JACK, 12 points, 2400ms life"
Add-Content -Path $summaryPath -Encoding utf8 -Value ""
Add-Content -Path $summaryPath -Encoding utf8 -Value "## Program Step"
Add-Content -Path $summaryPath -Encoding utf8 -Value ""
Add-Content -Path $summaryPath -Encoding utf8 -Value "- p3_scene_play_step: PLAY_GAME, 45s"
Add-Content -Path $summaryPath -Encoding utf8 -Value ""
Add-Content -Path $summaryPath -Encoding utf8 -Value "## Payload"
Add-Content -Path $summaryPath -Encoding utf8 -Value ""
Add-Content -Path $summaryPath -Encoding utf8 -Value "- Full published definition: $payloadFile"
Add-Content -Path $summaryPath -Encoding utf8 -Value ""
Add-Content -Path $summaryPath -Encoding utf8 -Value "## Commands"
Add-Content -Path $summaryPath -Encoding utf8 -Value ""
Add-Content -Path $summaryPath -Encoding utf8 -Value '    powershell -ExecutionPolicy Bypass -File scripts/p3-publish-scene-play.ps1'

Write-Host "  Summary saved to $summaryFile" -ForegroundColor Green

# ── Final output ───────────────────────────────────────────────
Write-Host ""
Write-Host "=== P3 Publish QA: PASS ===" -ForegroundColor Green
Write-Host "Game ID     : $gameId"
Write-Host "Game Key    : $GameKey"
Write-Host "Status      : PUBLISHED"
Write-Host "Active Check: CONFIRMED"
Write-Host ""
Write-Host "Evidence:" -ForegroundColor Cyan
Write-Host "  Summary : $summaryFile"
Write-Host "  Payload : $payloadFile"
Write-Host ""
Write-Host "Next: Run Android refresh and launch the game." -ForegroundColor Yellow
