param(
  [string]$ComposeFile = "docker-compose.yml",
  [string]$ApiHealthUrl = "http://127.0.0.1:8080/healthz",
  [string]$WebHealthUrl = "http://127.0.0.1:3001/jobs"
)

$ErrorActionPreference = "Stop"

Write-Host "[validate] compose config"
docker compose -f $ComposeFile config -q

Write-Host "[validate] services"
$services = docker compose -f $ComposeFile config --services
if (-not $services) {
  throw "No services found in compose config"
}
$services | ForEach-Object { Write-Host "  - $_" }

Write-Host "[validate] running status"
$psOutput = docker compose -f $ComposeFile ps
Write-Host $psOutput

$runningServices = docker compose -f $ComposeFile ps --services --status running
$hasApi = $runningServices -contains "orchestrator-api"
$hasWeb = $runningServices -contains "orchestrator-web"

if (-not $hasApi -or -not $hasWeb) {
  Write-Host "[validate] stack not fully running, starting compose services"
  docker compose -f $ComposeFile up -d --build | Out-Null
  Start-Sleep -Seconds 5
  $psOutput = docker compose -f $ComposeFile ps
  Write-Host $psOutput
}

Write-Host "[validate] api health"
$response = Invoke-RestMethod -Uri $ApiHealthUrl -Method Get
if ($null -eq $response.status -or $response.status -ne "healthy") {
  throw "API health endpoint did not return healthy status"
}
Write-Host "  healthy @ $($response.utc)"

Write-Host "[validate] web health"
$webResponse = Invoke-WebRequest -Uri $WebHealthUrl -Method Get
if ($webResponse.StatusCode -lt 200 -or $webResponse.StatusCode -ge 400) {
  throw "Web health endpoint did not return a successful status"
}
Write-Host "  web reachable ($($webResponse.StatusCode))"

Write-Host "[validate] compose check complete"
