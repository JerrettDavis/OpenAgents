# ──────────────────────────────────────────────────────────────────────────────
# scripts/first-run.ps1
#
# OpenAgents first-run setup helper for Windows/PowerShell.
#
# Performs:
#   1. Checks Docker is running
#   2. Creates .env from .env.example (if not already present)
#   3. Prompts for ANTHROPIC_API_KEY and writes it to .env
#   4. Creates local-workspaces directory
#   5. Copies the compose override example (if not present)
#   6. Builds agent Docker images (base-agent + claude-code provider)
#   7. Starts the stack with docker compose up -d
#   8. Waits for the API health check to pass
#
# Usage (from repo root):
#   pwsh scripts/first-run.ps1
#   # or on Windows PowerShell:
#   powershell -ExecutionPolicy Bypass -File scripts/first-run.ps1
# ──────────────────────────────────────────────────────────────────────────────
[CmdletBinding()]
param(
    [switch]$SkipBuildImages,
    [switch]$SkipDockerUp
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path $PSScriptRoot -Parent

function Write-Step([string]$message) {
    Write-Host ""
    Write-Host "──────────────────────────────────────────" -ForegroundColor Cyan
    Write-Host "  $message" -ForegroundColor Cyan
    Write-Host "──────────────────────────────────────────" -ForegroundColor Cyan
}

function Write-Ok([string]$message) {
    Write-Host "  ✓ $message" -ForegroundColor Green
}

function Write-Warn([string]$message) {
    Write-Host "  ⚠ $message" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  OpenAgents – First Run Setup" -ForegroundColor White
Write-Host "  Repository: $RepoRoot" -ForegroundColor Gray
Write-Host ""

# ── 1. Check Docker ───────────────────────────────────────────────────────────
Write-Step "Checking Docker"
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Docker daemon not responding." }
    Write-Ok "Docker is running."
} catch {
    Write-Host "  ✗ Docker is not running or not installed." -ForegroundColor Red
    Write-Host "    Install Docker Desktop from https://www.docker.com/products/docker-desktop" -ForegroundColor Red
    exit 1
}

# ── 2. Create .env ────────────────────────────────────────────────────────────
Write-Step "Environment configuration"
$envFile = Join-Path $RepoRoot ".env"
$envExample = Join-Path $RepoRoot ".env.example"

if (-not (Test-Path $envFile)) {
    Copy-Item $envExample $envFile
    Write-Ok "Created .env from .env.example"
} else {
    Write-Ok ".env already exists"
}

# ── 3. Prompt for ANTHROPIC_API_KEY ──────────────────────────────────────────
$currentContent = Get-Content $envFile -Raw
if ($currentContent -notmatch 'ANTHROPIC_API_KEY=sk-ant-') {
    Write-Host ""
    Write-Host "  Claude Code requires an Anthropic API key." -ForegroundColor Yellow
    Write-Host "  Get one at: https://console.anthropic.com" -ForegroundColor Gray
    Write-Host ""
    $apiKey = Read-Host "  Enter your ANTHROPIC_API_KEY (or press Enter to skip)"
    if ($apiKey -ne "") {
        if ($currentContent -match 'ANTHROPIC_API_KEY=') {
            $newContent = $currentContent -replace 'ANTHROPIC_API_KEY=.*', "ANTHROPIC_API_KEY=$apiKey"
        } else {
            $newContent = $currentContent.TrimEnd() + "`n`nANTHROPIC_API_KEY=$apiKey`n"
        }
        Set-Content $envFile $newContent -NoNewline
        Write-Ok "ANTHROPIC_API_KEY written to .env"
    } else {
        Write-Warn "ANTHROPIC_API_KEY not set. Claude Code jobs will fail. Edit .env manually."
    }
} else {
    Write-Ok "ANTHROPIC_API_KEY already configured in .env"
}

# ── 4. Create local-workspaces directory ─────────────────────────────────────
Write-Step "Local workspace directory"
$workspacesDir = Join-Path $RepoRoot "local-workspaces"
if (-not (Test-Path $workspacesDir)) {
    New-Item -ItemType Directory -Path $workspacesDir | Out-Null
    Write-Ok "Created local-workspaces/"
} else {
    Write-Ok "local-workspaces/ already exists"
}

# ── 5. Compose override ───────────────────────────────────────────────────────
Write-Step "Docker Compose override"
$overrideFile = Join-Path $RepoRoot "docker-compose.override.yml"
$overrideExample = Join-Path $RepoRoot "infra\docker\docker-compose.override.example.yml"

if (-not (Test-Path $overrideFile)) {
    Copy-Item $overrideExample $overrideFile
    Write-Ok "Created docker-compose.override.yml from example"
    Write-Warn "Review docker-compose.override.yml and adjust paths if needed."
} else {
    Write-Ok "docker-compose.override.yml already exists"
}

# ── 6. Build agent images ─────────────────────────────────────────────────────
if (-not $SkipBuildImages) {
    Write-Step "Building Docker images"
    Write-Host "  This may take several minutes on first run (downloading Node.js, Claude Code CLI)..."
    Write-Host ""

    Write-Host "  [1/2] Building openagents/base-agent:latest..."
    docker build -t openagents/base-agent:latest (Join-Path $RepoRoot "images\base-agent")
    Write-Ok "openagents/base-agent:latest built"

    Write-Host ""
    Write-Host "  [2/2] Building openagents/provider-claude-code:latest..."
    docker build -t openagents/provider-claude-code:latest (Join-Path $RepoRoot "providers\claude-code")
    Write-Ok "openagents/provider-claude-code:latest built"
} else {
    Write-Warn "Skipping image build (--SkipBuildImages)"
}

# ── 7. Start the stack ────────────────────────────────────────────────────────
if (-not $SkipDockerUp) {
    Write-Step "Starting OpenAgents stack"
    Set-Location $RepoRoot
    docker compose --env-file .env up -d
    Write-Ok "Stack started"

    # ── 8. Wait for API health check ─────────────────────────────────────────
    Write-Host ""
    Write-Host "  Waiting for API to become healthy..." -ForegroundColor Gray
    $attempts = 0
    $maxAttempts = 30
    do {
        Start-Sleep -Seconds 2
        $attempts++
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8080/healthz" -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200) {
                Write-Ok "API is healthy at http://localhost:8080"
                break
            }
        } catch {
            Write-Host "  . (attempt $attempts/$maxAttempts)" -ForegroundColor Gray
        }
    } while ($attempts -lt $maxAttempts)

    if ($attempts -ge $maxAttempts) {
        Write-Warn "API did not become healthy within timeout. Check: docker compose logs orchestrator-api"
    }
}

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "──────────────────────────────────────────────────────" -ForegroundColor Green
Write-Host "  OpenAgents is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "  API:       http://localhost:8080" -ForegroundColor White
Write-Host "  Dashboard: http://localhost:3000" -ForegroundColor White
Write-Host "  Health:    http://localhost:8080/healthz" -ForegroundColor White
Write-Host ""
Write-Host "  Logs:      docker compose logs -f" -ForegroundColor Gray
Write-Host "  Stop:      docker compose down" -ForegroundColor Gray
Write-Host "──────────────────────────────────────────────────────" -ForegroundColor Green
Write-Host ""
