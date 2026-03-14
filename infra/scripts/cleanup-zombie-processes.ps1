param(
    [switch]$WhatIf
)

$ErrorActionPreference = 'SilentlyContinue'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$selfPid = $PID

$candidates = Get-CimInstance Win32_Process | Where-Object {
    $_.ProcessId -ne $selfPid -and (
        (
            $_.Name -match '^(php|php-cgi|node)\.exe$' -and
            $_.CommandLine -like "*$projectRoot*"
        ) -or (
            $_.Name -match '^php\.exe$' -and
            $_.CommandLine -match ' -S 127\.0\.0\.1:'
        ) -or (
            $_.Name -match '^node\.exe$' -and
            $_.CommandLine -match 'vite|vitest'
        )
    )
}

if (-not $candidates) {
    Write-Host 'No zombie/stale Finance dev processes found.'
    exit 0
}

Write-Host "Found $($candidates.Count) candidate process(es)."

foreach ($proc in $candidates) {
    $line = "PID=$($proc.ProcessId) NAME=$($proc.Name)"
    if ($WhatIf) {
        Write-Host "[WhatIf] Would terminate $line"
        continue
    }

    Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
    Write-Host "Terminated $line"
}

if ($WhatIf) {
    Write-Host 'Dry run complete. No processes were terminated.'
} else {
    Write-Host 'Cleanup complete.'
}
