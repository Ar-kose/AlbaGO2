# AlbaGo Android crash log scanner.
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/check-android-crash-log.ps1 artifacts\crash-reports\some-log.log

param(
    [Parameter(Mandatory = $true, Position = 0)][string]$LogPath
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $LogPath)) {
    Write-Host ("Crash log not found: {0}" -f $LogPath) -ForegroundColor Red
    exit 1
}

$patterns = @(
    "FATAL EXCEPTION",
    "AndroidRuntime",
    "Process: com.alba.app",
    "java.lang.RuntimeException",
    "ANR in com.alba.app"
)

$matches = Select-String -Path $LogPath -Pattern $patterns -SimpleMatch -Context 2,2
if ($matches) {
    Write-Host ("Android crash signatures found in {0}" -f $LogPath) -ForegroundColor Red
    foreach ($match in $matches) {
        Write-Host ""
        foreach ($line in $match.Context.PreContext) {
            Write-Host ("  {0}" -f $line)
        }
        Write-Host ("> {0}" -f $match.Line) -ForegroundColor Red
        foreach ($line in $match.Context.PostContext) {
            Write-Host ("  {0}" -f $line)
        }
    }
    exit 1
}

Write-Host ("No Android crash signatures found in {0}" -f $LogPath) -ForegroundColor Green
exit 0
