$ErrorActionPreference = 'Continue'
$url = 'http://127.0.0.1:8080/api/v1/dashboard/stats'
$concurrency = 50
$perWorker = 4   # 50 x 4 = 200 samples

$script = {
  param($url, $count)
  $lats = New-Object System.Collections.Generic.List[double]
  $ok = 0; $fail = 0
  for ($i = 0; $i -lt $count; $i++) {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
      $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
      $sw.Stop()
      if ([int]$r.StatusCode -eq 200) { $ok++ } else { $fail++ }
      $lats.Add($sw.Elapsed.TotalMilliseconds)
    } catch {
      $sw.Stop(); $fail++
    }
  }
  return ,@($lats, $ok, $fail)
}

$rsPool = [runspacefactory]::CreateRunspacePool(1, $concurrency)
$rsPool.Open()
$jobs = @()
$swAll = [System.Diagnostics.Stopwatch]::StartNew()
for ($w = 0; $w -lt $concurrency; $w++) {
  $ps = [System.Management.Automation.PowerShell]::Create()
  $ps.RunspacePool = $rsPool
  [void]$ps.AddScript($script).AddArgument($url).AddArgument($perWorker)
  $jobs += ,@{ pipe = $ps; result = $ps.BeginInvoke() }
}

$allLats = New-Object System.Collections.Generic.List[double]
$totalOk = 0; $totalFail = 0
foreach ($j in $jobs) {
  $res = $j.pipe.EndInvoke($j.result)
  $j.pipe.Dispose()
  # res is an outer array wrapping the returned array
  $inner = $res | Select-Object -First 1
  if ($inner -is [System.Collections.IEnumerable] -and -not ($inner -is [string])) {
    $l = $inner[0]; $ok2 = $inner[1]; $f2 = $inner[2]
  } else {
    $l = @(); $ok2 = 0; $f2 = 0
  }
  $totalOk += [int]$ok2; $totalFail += [int]$f2
  foreach ($x in $l) { $allLats.Add([double]$x) }
}
$swAll.Stop()
$rsPool.Close(); $rsPool.Dispose()

$durSec = $swAll.Elapsed.TotalSeconds
$count = $allLats.Count
$qps = [math]::Round($count / $durSec, 1)
$valid = $allLats | Sort-Object
$p50 = $valid[[math]::Floor($count * 0.50)]
$p95 = $valid[[math]::Floor($count * 0.95)]
$p99 = $valid[[math]::Min($count - 1, [math]::Floor($count * 0.99))]
$avg = [math]::Round(($valid | Measure-Object -Average).Average, 1)
$min = [math]::Round(($valid | Measure-Object -Minimum).Minimum, 1)
$max = [math]::Round(($valid | Measure-Object -Maximum).Maximum, 1)
$rate = [math]::Round(($totalOk / $count) * 100, 1)

Write-Output "URL=$url"
Write-Output "SAMPLED=$count CONCURRENCY=$concurrency"
Write-Output "DURATION_SEC=$([math]::Round($durSec,2))"
Write-Output "QPS=$qps"
Write-Output "SUCCESS=$totalOk FAIL=$totalFail SUCCESS_RATE=$rate%"
Write-Output "AVG_MS=$avg MIN_MS=$min MAX_MS=$max"
Write-Output "P50_MS=$([math]::Round($p50,1)) P95_MS=$([math]::Round($p95,1)) P99_MS=$([math]::Round($p99,1))"
