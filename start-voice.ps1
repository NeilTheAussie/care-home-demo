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

# 1. voice server on :3402 (skip if already running)
$up = $false
try { $up = (Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 http://localhost:3402/health).StatusCode -eq 200 } catch {}
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
git add voice.json | Out-Null
git commit -m "Voice service address: $url" | Out-Null
git push -q
Pop-Location
Write-Output "Voice service live at $url"
