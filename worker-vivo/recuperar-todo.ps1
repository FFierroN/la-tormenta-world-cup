# =====================================================================
# recuperar-todo.ps1  -  Re-enriquece TODO el rango desde Highlightly,
# encadenando automaticamente los chunks que el worker corta por el
# limite de subrequests de Cloudflare (o por cuota de HL).
#
# El worker procesa hasta ~6 partidos por invocacion y, si corta, deja en
# el log un token 'REANUDAR=YYYY-MM-DD'. Este script lo lee y vuelve a
# llamar desde esa fecha, hasta ver 'Recuperacion COMPLETA.'
#
# USO (PowerShell, en Windows):
#   .\recuperar-todo.ps1 -Key "TU_TRIGGER_SECRET" -Desde 2026-06-11 -Hasta 2026-07-03
#
# Notas:
#  - Cada chunk NO gasta cuota de Cloudflare (solo HL: 1-2 llamadas/partido).
#  - Si HL corta por cuota (100/dia), el script se detiene y te dice desde
#    que fecha reanudar manana. Volves a correrlo con -Desde <esa fecha>.
#  - Pausa 3s entre chunks para no atropellar.
# =====================================================================
param(
  [Parameter(Mandatory = $true)] [string] $Key,
  [Parameter(Mandatory = $true)] [string] $Desde,
  [Parameter(Mandatory = $true)] [string] $Hasta,
  [string] $Base = "https://tormenta-vivo.felipeeduardofn.workers.dev"
)

$cursor = $Desde
$vuelta = 0
while ($true) {
  $vuelta++
  $url = "$Base/?key=$Key&recuperar=$cursor&hasta=$Hasta"
  Write-Host "`n=== CHUNK $vuelta  (desde $cursor hasta $Hasta) ===" -ForegroundColor Cyan
  try {
    $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 120
    $body = $resp.Content
  } catch {
    Write-Host "ERROR de red/worker: $($_.Exception.Message)" -ForegroundColor Red
    break
  }
  Write-Host $body

  if ($body -match "Recuperacion COMPLETA") {
    Write-Host "`n>>> LISTO: recuperacion COMPLETA." -ForegroundColor Green
    break
  }

  $m = [regex]::Match($body, "REANUDAR=(\d{4}-\d{2}-\d{2})")
  if (-not $m.Success) {
    Write-Host "`n>>> No hay token REANUDAR y no dice COMPLETA. Reviso el log de arriba." -ForegroundColor Yellow
    break
  }

  $siguiente = $m.Groups[1].Value
  if ($body -match "LIMITE DIARIO HL") {
    Write-Host "`n>>> Corto por CUOTA de HL (100/dia). Manana reanuda con:" -ForegroundColor Yellow
    Write-Host "    .\recuperar-todo.ps1 -Key `"$Key`" -Desde $siguiente -Hasta $Hasta" -ForegroundColor Yellow
    break
  }

  if ($siguiente -eq $cursor) {
    Write-Host "`n>>> El cursor no avanzo ($cursor). Corto para evitar loop; revisa el log." -ForegroundColor Red
    break
  }
  $cursor = $siguiente
  Start-Sleep -Seconds 3
}
