$ErrorActionPreference = 'Stop'

$project = Split-Path -Parent $MyInvocation.MyCommand.Path
$stage = Join-Path $env:TEMP ("saegyeol-sites-" + [Guid]::NewGuid().ToString('N'))
$archiveDir = Join-Path $project 'outputs'
$archive = Join-Path $archiveDir 'saegyeol-site.tar.gz'

try {
  if (-not (Test-Path (Join-Path $project 'dist\server\index.js'))) { throw 'Missing dist/server/index.js' }
  if (-not (Test-Path (Join-Path $project '.openai\hosting.json'))) { throw 'Missing .openai/hosting.json' }

  New-Item -ItemType Directory -Path (Join-Path $stage 'dist\.openai') -Force | Out-Null
  Copy-Item (Join-Path $project 'dist\*') (Join-Path $stage 'dist') -Recurse -Force
  Copy-Item (Join-Path $project '.openai\hosting.json') (Join-Path $stage 'dist\.openai\hosting.json') -Force

  New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null
  if (Test-Path $archive) { Remove-Item -LiteralPath $archive -Force }
  tar -C $stage -czf $archive dist

  $entries = tar -tzf $archive
  if ($entries -notcontains 'dist/server/index.js') { throw 'Archive missing server entrypoint' }
  if ($entries -notcontains 'dist/.openai/hosting.json') { throw 'Archive missing hosting config' }
  Write-Output $archive
}
finally {
  if (Test-Path $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
}
