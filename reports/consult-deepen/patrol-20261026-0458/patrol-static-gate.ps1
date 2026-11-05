# consult-agent closing review static gate (read-only patrol, round 20261026-0458)
# Seven sections; exit code taken from real process ExitCode; node direct bin; explicit file lists.
$ErrorActionPreference = 'Continue'
$root = 'C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1'
$logDir = Join-Path $root 'reports\consult-deepen\patrol-20261026-0458'
$env:NODE_OPTIONS = '--max-old-space-size=8192'
Set-Location $root

function Invoke-Section {
    param(
        [string]$Name,
        [string]$WorkDir,
        [string]$Exe,
        [string[]]$ArgList,
        [string]$OutLog,
        [string]$ErrLog
    )
    $start = Get-Date -Format 'HH:mm:ss'
    $proc = Start-Process -FilePath $Exe -ArgumentList $ArgList -WorkingDirectory $WorkDir `
        -Wait -PassThru -NoNewWindow -RedirectStandardOutput $OutLog -RedirectStandardError $ErrLog
    $outBytes = 0; $errBytes = 0
    if (Test-Path -LiteralPath $OutLog) { $outBytes = (Get-Item -LiteralPath $OutLog).Length }
    if (Test-Path -LiteralPath $ErrLog) { $errBytes = (Get-Item -LiteralPath $ErrLog).Length }
    $exit = $proc.ExitCode
    $line = ("{0} | START {1} | EXIT={2} | OUT={3}B | ERR={4}B" -f $Name, $start, $exit, $outBytes, $errBytes)
    Write-Host $line
    return [pscustomobject]@{ Name=$Name; ExitCode=$exit; OutBytes=$outBytes; ErrBytes=$errBytes; Line=$line }
}

# ---- file inventory (relative to root) ----
$coreRel = Get-ChildItem -LiteralPath (Join-Path $root 'src\core\agent\consult') -Recurse -File -Filter *.ts |
    ForEach-Object { $_.FullName.Substring($root.Length + 1) -replace '\\','/' }
$beRel = @($coreRel) + @('src/bff/routes/consultAgentRoutes.ts','src/db/repositories/consultAgentRepo.ts')
$unitRel = Get-ChildItem -LiteralPath (Join-Path $root 'tests\unit\consult-agent') -File -Filter *.ts |
    ForEach-Object { $_.FullName.Substring($root.Length + 1) -replace '\\','/' }
$secRel = Get-ChildItem -LiteralPath (Join-Path $root 'tests\security\consult-agent') -File -Filter *.ts |
    ForEach-Object { $_.FullName.Substring($root.Length + 1) -replace '\\','/' }
$intRel = Get-ChildItem -LiteralPath (Join-Path $root 'tests\integration\consult-agent') -File -Filter *.ts |
    ForEach-Object { $_.FullName.Substring($root.Length + 1) -replace '\\','/' }
$feService = 'web/src/services/api/consultAgent.ts'
$fePage = 'web/src/pages/consult-agent/ConsultAgentChatPage.tsx'
$prettierRel = @($coreRel) + @('src/bff/routes/consultAgentRoutes.ts','src/db/repositories/consultAgentRepo.ts', $feService, $fePage) + $unitRel + $secRel + $intRel
$prettierRel | Set-Content -LiteralPath (Join-Path $logDir 'prettier-file-list.txt') -Encoding ASCII

$results = @()

# 1 TSC_ROOT
$results += Invoke-Section -Name 'TSC_ROOT' -WorkDir $root -Exe 'node' `
    -ArgList @('node_modules/typescript/lib/tsc.js','--noEmit') `
    -OutLog (Join-Path $logDir 'patrol-tsc.log') -ErrLog (Join-Path $logDir 'patrol-tsc-err.log')

# 2 ESLINT_BE
$beArgs = @('node_modules/eslint/bin/eslint.js','--max-warnings','0') + $beRel
$results += Invoke-Section -Name 'ESLINT_BE' -WorkDir $root -Exe 'node' `
    -ArgList $beArgs `
    -OutLog (Join-Path $logDir 'patrol-eslint-be.log') -ErrLog (Join-Path $logDir 'patrol-eslint-be-err.log')

# 3 ESLINT_FE_ROOT_SERVICE (root config, single file)
$results += Invoke-Section -Name 'ESLINT_FE_ROOT_SERVICE' -WorkDir $root -Exe 'node' `
    -ArgList @('node_modules/eslint/bin/eslint.js','--max-warnings','0',$feService) `
    -OutLog (Join-Path $logDir 'patrol-eslint-fe-root-service.log') -ErrLog (Join-Path $logDir 'patrol-eslint-fe-root-service-err.log')

# 4 ESLINT_FE_ROOT_PAGE (root config, single file)
$results += Invoke-Section -Name 'ESLINT_FE_ROOT_PAGE' -WorkDir $root -Exe 'node' `
    -ArgList @('node_modules/eslint/bin/eslint.js','--max-warnings','0',$fePage) `
    -OutLog (Join-Path $logDir 'patrol-eslint-fe-root-page.log') -ErrLog (Join-Path $logDir 'patrol-eslint-fe-root-page-err.log')

# 5 ESLINT_FE_LOCAL (cwd=web, web local config, relative paths)
$webRoot = Join-Path $root 'web'
$results += Invoke-Section -Name 'ESLINT_FE_LOCAL' -WorkDir $webRoot -Exe 'node' `
    -ArgList @('node_modules/eslint/bin/eslint.js','--max-warnings','0','src/services/api/consultAgent.ts','src/pages/consult-agent/ConsultAgentChatPage.tsx') `
    -OutLog (Join-Path $logDir 'patrol-eslint-fe-local.log') -ErrLog (Join-Path $logDir 'patrol-eslint-fe-local-err.log')

# 6 TSC_WEB
$results += Invoke-Section -Name 'TSC_WEB' -WorkDir $webRoot -Exe 'node' `
    -ArgList @('node_modules/typescript/lib/tsc.js','--noEmit') `
    -OutLog (Join-Path $logDir 'patrol-tsc-web.log') -ErrLog (Join-Path $logDir 'patrol-tsc-web-err.log')

# 7 PRETTIER
$prettierArgs = @('node_modules/prettier/bin/prettier.cjs','--check') + $prettierRel
$results += Invoke-Section -Name 'PRETTIER' -WorkDir $root -Exe 'node' `
    -ArgList $prettierArgs `
    -OutLog (Join-Path $logDir 'patrol-prettier.log') -ErrLog (Join-Path $logDir 'patrol-prettier-err.log')

$failures = ($results | Where-Object { $_.ExitCode -ne 0 }).Count
$summary = $results | ForEach-Object { $_.Line }
$summary += ("=== sections: {0} | failures: {1} | prettier files: {2} ===" -f $results.Count, $failures, $prettierRel.Count)
$summary | Set-Content -LiteralPath (Join-Path $logDir 'patrol-static-summary.log') -Encoding ASCII
$summary | ForEach-Object { Write-Host $_ }
exit $failures
