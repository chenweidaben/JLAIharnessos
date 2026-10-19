# Slow probe with auth token to avoid 429
$ErrorActionPreference = 'Continue'
$root = 'C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1'
Set-Location $root

$token = [System.IO.File]::ReadAllText('scripts\demo-token.txt').Trim()
$headers = @{ 'Authorization' = "Bearer $token" }

$files = Get-ChildItem -Recurse -Path 'web\src' -Include *.ts,*.tsx -File
$paths = New-Object System.Collections.Generic.HashSet[string]

foreach ($f in $files) {
  $text = [System.IO.File]::ReadAllText($f.FullName)
  $matches = [regex]::Matches($text, '[''"`]/api/v1/[a-zA-Z0-9_\-/${}.:]+[''"`]')
  foreach ($m in $matches) {
    $p = $m.Value.Trim('"', "'", '`')
    $p = [regex]::Replace($p, '\$\{[^}]+\}', '1')
    $p = $p -replace '\?.*$', ''
    [void]$paths.Add($p)
  }
}

Write-Host "Probing $($paths.Count) paths with token, 200ms delay..."

$results = @()
$i = 0
foreach ($p in ($paths | Sort-Object)) {
  $i++
  try {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $resp = Invoke-WebRequest -Uri "http://127.0.0.1:8080$p" -UseBasicParsing -TimeoutSec 8 -Headers $headers -ErrorAction Stop
    $sw.Stop()
    $results += [PSCustomObject]@{ Path=$p; Status=$resp.StatusCode; Ms=$sw.ElapsedMilliseconds; Err='' }
  } catch {
    $code = 0
    $errBody = ''
    if ($_.Exception.Response) {
      $code = [int]$_.Exception.Response.StatusCode
      try {
        $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errBody = $sr.ReadToEnd()
        if ($errBody.Length -gt 300) { $errBody = $errBody.Substring(0,300) }
      } catch {}
    }
    $results += [PSCustomObject]@{ Path=$p; Status=$code; Ms=0; Err=$errBody }
  }
  if ($i % 100 -eq 0) { Write-Host "  progress: $i / $($paths.Count)" }
  Start-Sleep -Milliseconds 200
}

Write-Host "`n=== Summary by status ==="
$results | Group-Object Status | Sort-Object Name | Format-Table Name,Count -AutoSize | Out-String | Write-Host

Write-Host "`n=== 500 errors ==="
$results | Where-Object { $_.Status -eq 500 } | ForEach-Object { Write-Host "  $($_.Path)  -- $($_.Err)" }

Write-Host "`n=== 404 errors ==="
$results | Where-Object { $_.Status -eq 404 } | ForEach-Object { Write-Host "  $($_.Path)" }

Write-Host "`n=== 401 errors (should not happen with token) ==="
$results | Where-Object { $_.Status -eq 401 } | ForEach-Object { Write-Host "  $($_.Path)" }

$results | Export-Csv -Path 'scripts\probe-results-v2.csv' -NoTypeInformation -Encoding UTF8
Write-Host "`nSaved to scripts\probe-results-v2.csv"
