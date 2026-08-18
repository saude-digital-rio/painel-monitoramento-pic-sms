# Adiciona gcloud ao PATH se necessário
$gcPath = "C:\Users\USUARIO\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin"
if ($env:PATH -notlike "*$gcPath*") {
    $env:PATH += ";$gcPath"
}

# Autentica no Google Cloud se ainda não estiver autenticado
$credFile = "$env:APPDATA\gcloud\application_default_credentials.json"
if (-not (Test-Path $credFile)) {
    Write-Host "Autenticando no Google Cloud..." -ForegroundColor Yellow
    gcloud auth application-default login
}

# Inicia o backend em segundo plano
Write-Host "Iniciando backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; .venv\Scripts\activate; uvicorn app.main:app --reload --port 8000"

Start-Sleep -Seconds 2

# Inicia o frontend
Write-Host "Iniciando frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "Pronto! Acesse:" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "  Backend:  http://localhost:8000/docs" -ForegroundColor Green
