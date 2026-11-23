$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot

Push-Location (Join-Path $projectRoot 'backend')
try {
  npm ci
  npm run check
  npm test
} finally {
  Pop-Location
}

Push-Location (Join-Path $projectRoot 'frontend')
try {
  npm ci
  npm run lint
  npm run build
  npm audit --omit=dev
} finally {
  Pop-Location
}

Write-Host 'Preparacion completada. Ejecute .\scripts\Iniciar-Produccion.ps1'
