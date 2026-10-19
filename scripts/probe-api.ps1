# Probe all API paths called by frontend against local BFF
$ErrorActionPreference = 'Continue'
$root = 'C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1'
Set-Location $root

$files = Get-ChildItem -Recurse -Path 'web\src' -Include *.ts,*.tsx -File
$paths = New-Object System.Collections.Generic.HashSet[string]

foreach ($f in $files) {
  $text = [System.IO.File]::ReadAllText($f.FullName)
  # match '/api/v1/...' or "/api/v1/..." or `/api/v1/...`
  $matches = [regex]::Matches($text, '[''"`]/api/v1/[a-zA-Z0-9_\-/${}.:]+[''"`]')
  foreach ($m in $matches) {
    $p = $m.Value.Trim('"', "'", '`')
    # replace ${...} with 1
    $p = [regex]::Replace($p, '\$\{[^}]+\}', '1')
    # strip trailing query strings
    $p = $p -replace '\?.*$', ''
    [void]$paths.Add($p)
  }
}

Write-Host "Unique GET-able paths discovered: $($paths.Count)"

$results = @()
$i = 0
foreach ($p in $paths) {
  $i++
  try {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $resp = Invoke-WebRequest -Uri "http://127.0.0.1:8080$p" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    $sw.Stop()
    $results += [PSCustomObject]@{ Path=$p; Status=$resp.StatusCode; Ms=$sw.ElapsedMilliseconds }
  } catch {
    $code = 0
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    $results += [PSCustomObject]@{ Path=$p; Status=$code; Ms=0 }
  }
}

$results | Sort-Object Status | Format-Table -AutoSize | Out-String -Width 200 | Write-Host

Write-Host "`n=== Summary by status ==="
$results | Group-Object Status | Sort-Object Name | Format-Table Name,Count -AutoSize | Out-String | Write-Host

Write-Host "`n=== 500 errors ==="
$results | Where-Object { $_.Status -eq 500 } | ForEach-Object { $_.Path } | Write-Host

Write-Host "`n=== 404 errors ==="
$results | Where-Object { $_.Status -eq 404 } | ForEach-Object { $_.Path } | Write-Host

$results | Export-Csv -Path 'scripts\probe-results.csv' -NoTypeInformation -Encoding UTF8
Write-Host "`nSaved to scripts\probe-results.csv"
