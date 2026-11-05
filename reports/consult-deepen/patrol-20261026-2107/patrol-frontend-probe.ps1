# 2107 round - frontend page live line-number evidence (ASCII only; Chinese strings matched in source by token)
$root = 'C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1'
Set-Location $root
$p = 'web/src/pages/consult-agent/ConsultAgentChatPage.tsx'
$checks = @(
  @('import_getProfile', 'import.*getProfile'),
  @('import_getRulesSnapshot', 'import.*getRulesSnapshot'),
  @('import_listAudit', 'import.*listAudit'),
  @('import_replayEvents', 'import.*replayEvents'),
  @('import_transcribe', 'import.*transcribe'),
  @('DISCLAIMER_const', 'const DISCLAIMER'),
  @('ACUTE_const', 'const ACUTE_GUIDANCE'),
  @('ConfidenceTag_fn', 'function ConfidenceTag'),
  @('onAcute', 'onAcute'),
  @('onDisclaimer', 'onDisclaimer'),
  @('onMeta', 'onMeta'),
  @('meta_disclaimer', 'meta\.disclaimer'),
  @('confidence', 'confidence'),
  @('messageId', 'messageId'),
  @('handleTranscribe', 'handleTranscribe'),
  @('residentAlert', '\(acute \?\? threadAcute\)'),
  @('fallbackDisclaimer', 'message\.disclaimer \|\| DISCLAIMER'),
  @('bottomResidentDISCLAIMER', 'DISCLAIMER\}')
)
foreach ($c in $checks) {
  $hits = Select-String -LiteralPath $p -Pattern $c[1]
  if ($hits) {
    $nums = ($hits | ForEach-Object { $_.LineNumber }) -join ','
    Write-Host ($c[0] + ' => ' + $nums)
  } else {
    Write-Host ($c[0] + ' => NOT FOUND')
  }
}
$total = ([System.IO.File]::ReadAllLines((Join-Path $root $p), [System.Text.Encoding]::UTF8)).Count
Write-Host ('PAGE_LINES=' + $total)
