# Start backend and frontend automatically in two PowerShell windows
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$backendDir = Join-Path $root 'backend'
$frontendDir = Join-Path $root 'frontend'

Write-Host "Starting backend in $backendDir"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -LiteralPath '$backendDir'; `$env:PORT=5001; npm start"

Write-Host "Starting frontend in $frontendDir"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -LiteralPath '$frontendDir'; python -m http.server 3001"

Write-Host "Backend: http://localhost:5001"
Write-Host "Frontend: http://localhost:3001/pages/index.html"
