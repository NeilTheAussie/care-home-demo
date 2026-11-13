# Starts the voice service on this laptop and gives it a temporary public HTTPS address (Cloudflare quick tunnel),
# then publishes that address to the demo (voice.json -> GitHub Pages).
# Run again after a restart:  powershell -ExecutionPolicy Bypass -File C:\Users\Home\care-home-app\start-voice.ps1
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$logs = Join-Path $root 'logs'
New-Item -ItemType Directory -Force $logs | Out-Null

if (-not [Environment]::GetEnvironmentVariable('ELEVENLABS_API_KEY', 'User')) { throw 'ELEVENLABS_API_KEY is not set for this Windows user.' }
$env:ELEVENLABS_API_KEY = [Environment]::GetEnvironmentVariable('ELEVENLABS_API_KEY', 'User')
$an = [Environment]::GetEnvironmentVariable('ANTHROPIC_API_KEY', 'User'); if ($an) { $env:ANTHROPIC_API_KEY = $an }

function Log($m) { Add-Content -Path "$logs\autostart.log" -Value ("{0}  {1}" -f (Get-Date).ToString('s'), $m) }

# 0. already fine? (local server up AND the published address answers) -> nothing to do
$up = $false
try { $up = (Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 http://localhost:3402/health).StatusCode -eq 200 } catch {}
$published = ''
try { $published = (Get-Content (Join-Path $root 'voice.json') -Raw | ConvertFrom-Json).api } catch {}
if ($up -and $published) {
  $publicOk = $false
  try { $publicOk = (Invoke-WebRequest -UseBasicParsing -TimeoutSec 15 "$published/health").StatusCode -eq 200 } catch {}
  if ($publicOk) { Log "OK, already running at $published"; Write-Output "Already running at $published"; return }
}
Log "Starting (server up: $up, published: $published)"

# 1. voice server on :3402 (skip if already running)
if (-not $up) {
  Start-Process node -ArgumentList "`"$root\server\server.js`"" -WindowStyle Hidden -RedirectStandardOutput "$logs\voice.log" -RedirectStandardError "$logs\voice.err"
  Start-Sleep -Seconds 2
}

# 2. quick tunnel (a new one each run; stop any old one first)
# Only ever stops the tunnel pointing at the voice service, never the reports tunnel.
Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" | Where-Object { $_.CommandLine -match 'localhost:3402' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1
$cf = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
# An empty config so the reports tunnel's ~/.cloudflared/config.yml (its ingress rules) is not applied to this quick tunnel.
$emptyCfg = Join-Path $logs 'quick-tunnel.yml'
[IO.File]::WriteAllText($emptyCfg, "# quick tunnel for the voice service`n")
if (Test-Path "$logs\tunnel.log") { Remove-Item "$logs\tunnel.log" -Force }
Start-Process $cf -ArgumentList 'tunnel', '--config', "`"$emptyCfg`"", '--no-autoupdate', '--url', 'http://localhost:3402' -WindowStyle Hidden -RedirectStandardOutput "$logs\tunnel.out" -RedirectStandardError "$logs\tunnel.log"
$url = $null
for ($i = 0; $i -lt 60 -and -not $url; $i++) {
  Start-Sleep -Seconds 1
  if (Test-Path "$logs\tunnel.log") { $m = Select-String -Path "$logs\tunnel.log" -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1; if ($m) { $url = $m.Matches[0].Value } }
}
if (-not $url) { throw 'The tunnel did not start. See logs\tunnel.log' }

# 3. publish the address to the demo
$json = @{ api = $url; updated = (Get-Date).ToString('s') } | ConvertTo-Json -Compress
[IO.File]::WriteAllText((Join-Path $root 'voice.json'), $json + "`n")
Push-Location $root
# git writes warnings (e.g. line endings) to stderr; under 'Stop' Windows PowerShell treats that as fatal.
$ErrorActionPreference = 'Continue'
git add voice.json 2>&1 | Out-Null
git commit -q -m "Voice service address: $url" 2>&1 | Out-Null
$pushed = $false
for ($i = 0; $i -lt 5 -and -not $pushed; $i++) { git push -q 2>&1 | Out-Null; if ($LASTEXITCODE -eq 0) { $pushed = $true } else { Start-Sleep -Seconds 20 } }
Pop-Location
Log ("Live at $url" + $(if ($pushed) { '' } else { ' (PUSH FAILED - the demo still has the old address)' }))
Write-Output "Voice service live at $url"
