param(
  [int]$Port = 4000
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$frontendIndex = Join-Path $projectRoot 'frontend\dist\index.html'

if (-not (Test-Path -LiteralPath $frontendIndex)) {
  throw 'No existe frontend\dist. Ejecute primero .\scripts\Preparar-Produccion.ps1'
}

$env:NODE_ENV = 'production'
$env:PORT = $Port

Push-Location (Join-Path $projectRoot 'backend')
try {
  npm start
} finally {
  Pop-Location
}
