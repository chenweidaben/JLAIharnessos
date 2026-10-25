# export wide consult compliance file list (ASCII only)
$root = 'C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1'
$log = Join-Path $root 'reports\consult-deepen\patrol-20261026-0407'
$files = @()
$coreDir = Join-Path $root 'src\core\agent\consult'
$files += Get-ChildItem -LiteralPath $coreDir -Recurse -File -Include '*.ts','*.tsx' | ForEach-Object { $_.FullName }
$files += @((Join-Path $root 'src\bff\routes\consultAgentRoutes.ts'), (Join-Path $root 'src\db\repositories\consultAgentRepo.ts'), (Join-Path $root 'web\src\services\api\consultAgent.ts'), (Join-Path $root 'web\src\pages\consult-agent\ConsultAgentChatPage.tsx'))
foreach ($d in @('tests\unit\consult-agent','tests\security\consult-agent','tests\integration\consult-agent')) {
  $dd = Join-Path $root $d
  if (Test-Path -LiteralPath $dd) { $files += Get-ChildItem -LiteralPath $dd -Recurse -File -Filter '*.ts' | ForEach-Object { $_.FullName } }
}
$docsDir = Join-Path $root 'docs\consult-agent'
$files += Get-ChildItem -LiteralPath $docsDir -Recurse -File | ForEach-Object { $_.FullName }
$openapi = Join-Path $root 'docs\api\consult-agent-openapi.yaml'
if (Test-Path -LiteralPath $openapi) { $files += $openapi }
Set-Content -LiteralPath (Join-Path $log 'compliance-filelist.txt') -Value $files -Encoding UTF8
Write-Host ('FILE_COUNT=' + $files.Count)
