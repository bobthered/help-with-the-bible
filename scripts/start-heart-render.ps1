param([ValidateSet('dml','cpu')][string]$Provider='dml')
$ErrorActionPreference='Stop'
$heartRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$statePath=Join-Path $heartRoot '.cache/kokoro-heart'
New-Item -ItemType Directory -Force -Path $statePath | Out-Null
Push-Location -LiteralPath $heartRoot
try {
  & python scripts/render-heart.py --check-running
  if($LASTEXITCODE -ne 0) { Write-Output 'Use python scripts/render-heart.py --status to monitor the active batch.'; exit 0 }
  $pythonPath=(Get-Command python.exe).Source
  $render=Start-Process -FilePath $pythonPath -ArgumentList @('-u','scripts/render-heart.py','--publish-when-complete','--provider',$Provider) -WorkingDirectory $heartRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $statePath 'render.log') -RedirectStandardError (Join-Path $statePath 'render.error.log') -PassThru
  $render.Id | Set-Content -LiteralPath (Join-Path $statePath 'process.pid')
  Write-Output "Kokoro Heart is rendering in the background (PID $($render.Id)). Keep the computer awake."
  Write-Output 'Check progress: python scripts/render-heart.py --status'
} finally { Pop-Location }
