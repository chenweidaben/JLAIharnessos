# Compare routes/*.ts files vs imports in server.ts
$root = 'C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1'
Set-Location $root

$serverContent = [System.IO.File]::ReadAllText('src\bff\server.ts')

# Get all route files (recursive)
$routeFiles = Get-ChildItem -Recurse -Path 'src\bff\routes' -Filter *.ts -File

$unregistered = @()
$registered = 0
foreach ($f in $routeFiles) {
  # relative path without extension, e.g. "admin/permissions" or "auth"
  $rel = $f.FullName.Replace((Join-Path $root 'src\bff\routes') + '\', '').Replace('\','/').Replace('.ts','')
  # check if server.ts imports this path (either './routes/rel' or './routes/sub/rel')
  $pattern = "routes/$rel'"
  $pattern2 = "routes/$rel`""
  if ($serverContent.Contains($pattern) -or $serverContent.Contains($pattern2)) {
    $registered++
  } else {
    $unregistered += $rel
  }
}

Write-Host "Total route files: $($routeFiles.Count)"
Write-Host "Registered in server.ts: $registered"
Write-Host "UNREGISTERED: $($unregistered.Count)"
Write-Host ""
Write-Host "=== Unregistered route files ==="
$unregistered | Sort-Object | ForEach-Object { Write-Host "  $_" }
