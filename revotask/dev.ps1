# Menjalankan RevoTask lokal: PostgreSQL (Docker), backend Flask, frontend Next.js.
# Pemakaian (dari folder revotask):  .\dev.ps1
# Jika diblokir:  powershell -ExecutionPolicy Bypass -File .\dev.ps1

$ErrorActionPreference = 'Stop'
$root     = $PSScriptRoot
$backend  = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

# 1. Database
Step 'Menjalankan PostgreSQL (Docker)'
$ErrorActionPreference = 'Continue'
docker info *> $null
$dockerCode = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
if ($dockerCode -ne 0) {
    Write-Host 'Docker belum berjalan. Buka Docker Desktop, tunggu "Engine running", lalu jalankan ulang script ini.' -ForegroundColor Red
    exit 1
}
Push-Location $root
docker compose up -d postgres
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }
Pop-Location

Write-Host 'Menunggu database siap...'
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    $ErrorActionPreference = 'Continue'
    docker exec revotask-postgres pg_isready -U revotask -d revotask *> $null
    $pgCode = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($pgCode -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 2
}
if (-not $ready) { Write-Host 'Database tidak siap setelah 60 detik.' -ForegroundColor Red; exit 1 }

# 2. Setup backend (hanya jika belum ada)
Step 'Menyiapkan backend'
$venvPython = Join-Path $backend '.venv\Scripts\python.exe'
if (-not (Test-Path $venvPython)) {
    Write-Host 'Membuat virtualenv...'
    python -m venv (Join-Path $backend '.venv')
    if ($LASTEXITCODE -ne 0) { Write-Host 'Gagal membuat venv. Pastikan Python 3.11+ terpasang.' -ForegroundColor Red; exit 1 }
    Write-Host 'Menginstal dependensi Python...'
    & $venvPython -m pip install -r (Join-Path $backend 'requirements.txt')
    if ($LASTEXITCODE -ne 0) { exit 1 }
}
$backendEnv = Join-Path $backend '.env'
if (-not (Test-Path $backendEnv)) {
    Write-Host 'Membuat backend\.env dari .env.example (secret dibuat acak)...'
    $content = Get-Content (Join-Path $backend '.env.example') -Raw
    $secret1 = & $venvPython -c "import secrets; print(secrets.token_urlsafe(48))"
    $secret2 = & $venvPython -c "import secrets; print(secrets.token_urlsafe(48))"
    $content = $content -replace '(?m)^SECRET_KEY=.*$', "SECRET_KEY=$secret1"
    $content = $content -replace '(?m)^JWT_SECRET_KEY=.*$', "JWT_SECRET_KEY=$secret2"
    # Docker memakai port host 5433 supaya tidak bentrok dengan PostgreSQL Windows di 5432.
    $content = $content -replace '@localhost:5432/', '@localhost:5433/'
    Set-Content -Path $backendEnv -Value $content -Encoding utf8
}

# 3. Setup frontend (hanya jika belum ada)
Step 'Menyiapkan frontend'
if (-not (Test-Path (Join-Path $frontend 'node_modules'))) {
    Write-Host 'Menjalankan npm install...'
    Push-Location $frontend
    npm install
    $code = $LASTEXITCODE
    Pop-Location
    if ($code -ne 0) { exit 1 }
}
$frontendEnv = Join-Path $frontend '.env.local'
if (-not (Test-Path $frontendEnv)) {
    Write-Host 'Membuat frontend\.env.local dari .env.example...'
    Copy-Item (Join-Path $frontend '.env.example') $frontendEnv
}

# 4. Migrasi database
Step 'Menjalankan migrasi database'
Push-Location $backend
& $venvPython -m flask db upgrade
$code = $LASTEXITCODE
Pop-Location
if ($code -ne 0) { Write-Host 'Migrasi gagal. Cek DATABASE_URL di backend\.env.' -ForegroundColor Red; exit 1 }

# 5. Jalankan server di jendela terpisah
Step 'Membuka backend dan frontend di jendela baru'
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location -LiteralPath '$backend'; & '$venvPython' -m flask run"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location -LiteralPath '$frontend'; npm run dev"

Write-Host "`nSelesai." -ForegroundColor Green
Write-Host '  Frontend : http://localhost:3000'
Write-Host '  API      : http://127.0.0.1:5000/api/health'
Write-Host '  Berhenti : tutup kedua jendela, lalu jalankan "docker compose down" (opsional)'
