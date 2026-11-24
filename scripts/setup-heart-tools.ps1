# Offline preparation only. This script is never called by npm install or Vercel.
$ErrorActionPreference = 'Stop'
$heartRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$toolsPath = Join-Path $heartRoot '.cache/kokoro-python'
$modelsPath = Join-Path $heartRoot '.cache/models'
New-Item -ItemType Directory -Force -Path $toolsPath,$modelsPath | Out-Null
& python -m pip install --target $toolsPath --upgrade -r (Join-Path $PSScriptRoot 'heart-requirements.txt')
if($LASTEXITCODE -ne 0) {throw 'The isolated Kokoro dependencies could not be installed'}
# kokoro-onnx declares the CPU distribution; install the Windows GPU distribution last.
& python -m pip install --target $toolsPath --upgrade --no-deps onnxruntime-directml==1.24.4
if($LASTEXITCODE -ne 0) {throw 'The isolated DirectML runtime could not be installed'}
$files = @(
  @{Name='kokoro-heart-fp32.onnx'; Remote='onnx/model.onnx'; Hash='8fbea51ea711f2af382e88c833d9e288c6dc82ce5e98421ea61c058ce21a34cb'},
  @{Name='af_heart.bin'; Remote='voices/af_heart.bin'; Hash='d583ccff3cdca2f7fae535cb998ac07e9fcb90f09737b9a41fa2734ec44a8f0b'},
  @{Name='heart-tokenizer.json'; Remote='tokenizer.json'; Hash='77a02c8e164413299b4b4c403b14f8e0e1c1b727db4d46a09d6327b861060a34'}
)
foreach($file in $files) {
  $target = [IO.Path]::GetFullPath((Join-Path $modelsPath $file.Name))
  if(-not $target.StartsWith([IO.Path]::GetFullPath($modelsPath)+[IO.Path]::DirectorySeparatorChar)) {throw 'Unexpected model-cache target'}
  if((Test-Path -LiteralPath $target) -and (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant() -eq $file.Hash) {continue}
  $temporary = $target + '.downloading'
  Invoke-WebRequest -Uri ('https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/' + $file.Remote) -OutFile $temporary
  if((Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash.ToLowerInvariant() -ne $file.Hash) {throw ('Source checksum changed; review before using ' + $file.Name)}
  Move-Item -LiteralPath $temporary -Destination $target -Force
}
& python (Join-Path $PSScriptRoot 'prepare-heart-model.py')
if($LASTEXITCODE -ne 0) {throw 'The GPU-compatible model failed its reference-output checks'}
Write-Output 'Isolated Kokoro Heart tooling is ready. Run python scripts/render-heart.py --publish-when-complete.'
