#requires -Version 5.1
<#
.SYNOPSIS
  分片跑后端集成测试：每个 .test.ts 独立 bun 进程，结束即释放连接池。
  规避单进程 bun test 在 Windows 上 postgres.js 连接池渐进耗尽挂死。
#>
$ErrorActionPreference = 'Continue'
$repo = Split-Path -Parent $PSScriptRoot
$env:PATH = "C:\Users\lenovo\.bun\bin;" + $env:PATH
$env:TEST_REAL = "1"
$env:DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:5433/jlmedaios"
$env:PGPASSWORD = "postgres"

Set-Location $repo
$files = Get-ChildItem tests/integration/*.test.ts | Sort-Object Name
$totalPass = 0; $totalFail = 0; $filesRun = 0; $failFiles = @(); $timeoutFiles = @()
# known-flaky: bun on Windows 连接句柄不退出导致单文件 hang（环境问题，非业务 bug）
# M48-A：inpatient-care / inpatient-routes 已改 afterEach 走独立新连接清理，移出 flaky。
# M49-A：inpatient-core / medical-record-front-page 同样改独立短连接清理，移出 flaky；名单已空。
$knownFlaky = @()
$flakyHit = @()

foreach ($f in $files) {
  $filesRun++
  $out = "$env:TEMP\bunshard_$($f.BaseName).txt"
  $p = Start-Process -FilePath "bun" -ArgumentList "test", $f.FullName -NoNewWindow -PassThru `
       -RedirectStandardOutput $out -RedirectStandardError "$out.err"
  if (-not $p.WaitForExit(120000)) {
    $p.Kill(); $p.WaitForExit(5000)
    $isFlaky = $knownFlaky | Where-Object { $_ -eq $f.Name }
    if ($isFlaky) {
      Write-Host "[FLAKY-TIMEOUT] $($f.Name) (known: bun/Windows 连接句柄不退出)"
      $flakyHit += $f.Name
    } else {
      Write-Host "[TIMEOUT] $($f.Name)"
      $timeoutFiles += $f.Name
    }
    continue
  }
  $content = (Get-Content $out -Raw -ErrorAction SilentlyContinue) + "`n" + (Get-Content "$out.err" -Raw -ErrorAction SilentlyContinue)
  # parse "N pass" / "N fail" (bun prints like " 12 pass" " 3 fail")
  $pm = [regex]::Match($content, '(\d+)\s+pass')
  $fm = [regex]::Match($content, '(\d+)\s+fail')
  $pCount = if ($pm.Success) { [int]$pm.Groups[1].Value } else { 0 }
  $fCount = if ($fm.Success) { [int]$fm.Groups[1].Value } else { 0 }
  $totalPass += $pCount; $totalFail += $fCount
  $status = if ($fCount -gt 0) { "FAIL" } else { "ok" }
  Write-Host ("[{0}] {1}  pass={2} fail={3}" -f $status, $f.Name, $pCount, $fCount)
  if ($fCount -gt 0) { $failFiles += $f.Name }
}

Write-Host "`n========== SHARDED SUMMARY =========="
Write-Host ("files run: {0}" -f $filesRun)
Write-Host ("total pass: {0}" -f $totalPass)
Write-Host ("total fail: {0}" -f $totalFail)
Write-Host ("fail files ({0}):" -f $failFiles.Count); $failFiles | ForEach-Object { "  - $_" }
Write-Host ("known-flaky timeout ({0}):" -f $flakyHit.Count); $flakyHit | ForEach-Object { "  - $_" }
Write-Host ("unexpected timeout ({0}):" -f $timeoutFiles.Count); $timeoutFiles | ForEach-Object { "  - $_" }
if ($failFiles.Count -gt 0 -or $timeoutFiles.Count -gt 0) { exit 1 } else { exit 0 }
