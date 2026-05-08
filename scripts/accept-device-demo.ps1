# AlbaGo P1 physical device demo acceptance automation.
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/accept-device-demo.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/accept-device-demo.ps1 -DeviceSerial <serial>
#   powershell -ExecutionPolicy Bypass -File scripts/accept-device-demo.ps1 -Build

param(
    [string]$DeviceSerial,
    [switch]$Build
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path "$ScriptDir\.."
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$VerificationDir = Join-Path $ProjectRoot "artifacts\verification"
$CrashDir = Join-Path $ProjectRoot "artifacts\crash-reports"
$VideoDir = Join-Path $ProjectRoot "artifacts\demo-videos"
$SummaryPath = Join-Path $VerificationDir "p1-device-acceptance-summary-$Stamp.md"
$ApkPath = Join-Path $ProjectRoot "android\app\build\outputs\apk\debug\app-debug.apk"
$ScannerPath = Join-Path $ProjectRoot "scripts\check-android-crash-log.ps1"

New-Item -ItemType Directory -Force -Path $VerificationDir, $CrashDir, $VideoDir | Out-Null

function Write-Step {
    param(
        [Parameter(Mandatory = $true)][string]$Message,
        [ConsoleColor]$Color = [ConsoleColor]::White
    )
    Write-Host $Message -ForegroundColor $Color
}

function Resolve-AndroidSdkRoot {
    $candidates = @(
        $env:ANDROID_SDK_ROOT,
        $env:ANDROID_HOME,
        (Join-Path $env:LOCALAPPDATA "Android\Sdk"),
        "C:\Android\Sdk"
    ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique

    $resolved = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $resolved) {
        throw "Android SDK not found. Set ANDROID_SDK_ROOT or install SDK under %LOCALAPPDATA%\Android\Sdk."
    }

    return $resolved
}

function Resolve-JavaHome {
    $candidates = @(
        $env:JAVA_HOME,
        "C:\Program Files\Android\Android Studio\jbr"
    ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique

    return $candidates | Where-Object { Test-Path (Join-Path $_ "bin\java.exe") } | Select-Object -First 1
}

function Initialize-AndroidEnvironment {
    $javaHome = Resolve-JavaHome
    if ($javaHome) {
        $env:JAVA_HOME = $javaHome
    }
    $sdkRoot = Resolve-AndroidSdkRoot
    $env:ANDROID_SDK_ROOT = $sdkRoot
    $env:ANDROID_HOME = $sdkRoot
    $env:GRADLE_USER_HOME = if ([string]::IsNullOrWhiteSpace($env:GRADLE_USER_HOME)) { "C:\gradle-cache" } else { $env:GRADLE_USER_HOME }
    $env:PATH = if ($javaHome) {
        "$javaHome\bin;$sdkRoot\platform-tools;$env:PATH"
    } else {
        "$sdkRoot\platform-tools;$env:PATH"
    }

    return [pscustomobject]@{
        JavaHome = $javaHome
        SdkRoot = $sdkRoot
        GradleUserHome = $env:GRADLE_USER_HOME
        AdbPath = (Get-Command adb -ErrorAction Stop).Source
    }
}

function Invoke-External {
    param(
        [Parameter(Mandatory = $true)][string]$Program,
        [Parameter(Mandatory = $true)][string[]]$CommandArgs,
        [switch]$AllowFailure
    )

    Write-Step ("> {0} {1}" -f $Program, ($CommandArgs -join " ")) Cyan
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $output = & $Program @CommandArgs 2>&1
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    if ($output) {
        foreach ($line in $output) {
            Write-Host ([string]$line)
        }
    }
    if ($exitCode -ne 0 -and -not $AllowFailure) {
        throw ("Command failed with exit code {0}: {1} {2}" -f $exitCode, $Program, ($CommandArgs -join " "))
    }
    return [pscustomobject]@{
        ExitCode = $exitCode
        Output = @($output | ForEach-Object { [string]$_ })
    }
}

function ConvertFrom-AdbDeviceOutput {
    param([string[]]$Lines)

    $rows = @()
    foreach ($line in $Lines) {
        $trimmed = ([string]$line).Trim()
        if ([string]::IsNullOrWhiteSpace($trimmed)) {
            continue
        }
        if ($trimmed -like "List of devices attached*") {
            continue
        }
        $parts = $trimmed -split "\s+"
        if ($parts.Count -lt 2) {
            continue
        }
        $rows += [pscustomobject]@{
            Serial = $parts[0]
            State = $parts[1]
            Raw = $trimmed
            IsEmulator = ($parts[0] -like "emulator-*")
        }
    }
    return $rows
}

function Select-PhysicalDevice {
    param(
        [Parameter(Mandatory = $true)][string]$AdbPath,
        [string]$RequestedSerial
    )

    Invoke-External $AdbPath @("version") | Out-Null
    $devicesResult = Invoke-External $AdbPath @("devices", "-l")
    $rows = @(ConvertFrom-AdbDeviceOutput $devicesResult.Output)
    $physicalRows = @($rows | Where-Object { -not $_.IsEmulator })
    $usablePhysical = @($physicalRows | Where-Object { $_.State -eq "device" })
    $unauthorizedPhysical = @($physicalRows | Where-Object { $_.State -eq "unauthorized" })
    $offlinePhysical = @($physicalRows | Where-Object { $_.State -eq "offline" })
    $emulators = @($rows | Where-Object { $_.IsEmulator })

    if ($emulators.Count -gt 0 -and $usablePhysical.Count -eq 0) {
        return [pscustomobject]@{
            Success = $false
            Reason = "only emulator devices are visible; emulator evidence is secondary and does not satisfy P1"
            Rows = $rows
        }
    }

    if (-not [string]::IsNullOrWhiteSpace($RequestedSerial)) {
        $selected = $rows | Where-Object { $_.Serial -eq $RequestedSerial } | Select-Object -First 1
        if (-not $selected) {
            return [pscustomobject]@{ Success = $false; Reason = "requested device serial was not returned by adb devices -l"; Rows = $rows }
        }
        if ($selected.IsEmulator) {
            return [pscustomobject]@{ Success = $false; Reason = "requested serial is an emulator and cannot satisfy P1"; Rows = $rows }
        }
        if ($selected.State -eq "unauthorized") {
            return [pscustomobject]@{ Success = $false; Reason = "device is unauthorized; unlock device and accept RSA prompt"; Rows = $rows }
        }
        if ($selected.State -ne "device") {
            return [pscustomobject]@{ Success = $false; Reason = "device state is $($selected.State)"; Rows = $rows }
        }
        return [pscustomobject]@{ Success = $true; Device = $selected; Rows = $rows }
    }

    if ($unauthorizedPhysical.Count -gt 0) {
        return [pscustomobject]@{ Success = $false; Reason = "unauthorized physical device returned by adb devices -l; unlock device and accept RSA prompt"; Rows = $rows }
    }
    if ($offlinePhysical.Count -gt 0) {
        return [pscustomobject]@{ Success = $false; Reason = "offline physical device returned by adb devices -l"; Rows = $rows }
    }
    if ($usablePhysical.Count -eq 0) {
        return [pscustomobject]@{ Success = $false; Reason = "no usable physical device returned by adb devices -l"; Rows = $rows }
    }
    if ($usablePhysical.Count -gt 1) {
        return [pscustomobject]@{ Success = $false; Reason = "multiple usable physical devices returned; re-run with -DeviceSerial <serial>"; Rows = $rows }
    }

    return [pscustomobject]@{ Success = $true; Device = $usablePhysical[0]; Rows = $rows }
}

function Write-BlockedSummary {
    param(
        [Parameter(Mandatory = $true)][string]$Reason,
        [Parameter(Mandatory = $true)][object]$Environment
    )

    $branch = (& git -C $ProjectRoot branch --show-current 2>$null)
    $content = @(
        "# P1 Physical Device Acceptance",
        "",
        ("Date: {0}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz")),
        ("Branch: {0}" -f $branch),
        "Result: BLOCKED",
        ("Reason: {0}." -f $Reason),
        "Next human action: connect/unlock device, enable USB debugging, accept RSA prompt, verify Windows ADB driver.",
        "",
        "## Environment",
        "",
        ("- JAVA_HOME: {0}" -f $Environment.JavaHome),
        ("- ANDROID_SDK_ROOT: {0}" -f $Environment.SdkRoot),
        ("- ANDROID_HOME: {0}" -f $env:ANDROID_HOME),
        ("- GRADLE_USER_HOME: {0}" -f $Environment.GradleUserHome),
        ("- adb.exe: {0}" -f $Environment.AdbPath),
        "",
        "## Result",
        "",
        "- Device detection: FAIL",
        "- Debug APK install: NOT RUN",
        "- Backend reverse / QA override: NOT RUN",
        "- Cold launch: NOT RUN",
        "- Fruit Slash demo: NOT RUN",
        "- Dodge Run demo: NOT RUN",
        "- Fit Challenge demo: NOT RUN",
        "- Crash logs: NOT RUN",
        "",
        "## Operator Checklist",
        "",
        "- USB cable supports data, not charge-only.",
        "- Android device is unlocked.",
        "- Developer options are enabled.",
        "- USB debugging is enabled.",
        "- USB mode is File Transfer / MTP if required.",
        "- RSA debugging prompt is accepted.",
        "- Windows Device Manager shows Android ADB Interface or the OEM USB driver.",
        "- Android Studio Device Manager / Device Mirroring can see the device.",
        "",
        "## Notes",
        "",
        "- Emulator evidence was not substituted for P1 acceptance.",
        "- P2/P3/P4 feature expansion was not started."
    )
    Set-Content -Path $SummaryPath -Encoding utf8 -Value $content
    Write-Step ("Summary: {0}" -f $SummaryPath) Yellow
}

function Get-DeviceProperty {
    param(
        [Parameter(Mandatory = $true)][string]$AdbPath,
        [Parameter(Mandatory = $true)][string]$Serial,
        [Parameter(Mandatory = $true)][string]$Property
    )
    $result = Invoke-External $AdbPath @("-s", $Serial, "shell", "getprop", $Property) -AllowFailure
    return (($result.Output | Select-Object -First 1) -as [string]).Trim()
}

function Save-Logcat {
    param(
        [Parameter(Mandatory = $true)][string]$AdbPath,
        [Parameter(Mandatory = $true)][string]$Serial,
        [Parameter(Mandatory = $true)][string]$Destination
    )
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $output = & $AdbPath -s $Serial logcat -d AndroidRuntime:E AlbaGo:D "*:S" 2>&1
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    Set-Content -Path $Destination -Encoding utf8 -Value @($output | ForEach-Object { [string]$_ })
}

function Test-CrashLog {
    param([Parameter(Mandatory = $true)][string]$Path)
    Invoke-External "powershell" @("-ExecutionPolicy", "Bypass", "-File", $ScannerPath, $Path) | Out-Null
}

function Capture-Demo {
    param(
        [Parameter(Mandatory = $true)][string]$AdbPath,
        [Parameter(Mandatory = $true)][string]$Serial,
        [Parameter(Mandatory = $true)][string]$GameId,
        [Parameter(Mandatory = $true)][string]$MockRep,
        [Parameter(Mandatory = $true)][string]$Slug
    )

    $remoteVideo = "/sdcard/$Slug-$Stamp.mp4"
    $localVideo = Join-Path $VideoDir "$Slug-$Stamp.mp4"
    $localLog = Join-Path $CrashDir "$Slug-$Stamp.log"

    Invoke-External $AdbPath @("-s", $Serial, "logcat", "-c") | Out-Null
    Invoke-External $AdbPath @(
        "-s", $Serial,
        "shell", "am", "start",
        "-n", "com.alba.app/com.alba.app.MainActivity",
        "--es", "albago.startDestination", "GAMES",
        "--es", "albago.autostartGameId", $GameId,
        "--es", "albago.mockRep", $MockRep
    ) | Out-Null
    Invoke-External $AdbPath @("-s", $Serial, "shell", "screenrecord", "--time-limit", "45", $remoteVideo) | Out-Null
    Invoke-External $AdbPath @("-s", $Serial, "pull", $remoteVideo, $localVideo) | Out-Null
    Save-Logcat $AdbPath $Serial $localLog
    Test-CrashLog $localLog

    return [pscustomobject]@{
        Video = $localVideo
        Log = $localLog
    }
}

$summary = $null
$failed = $false

try {
    Push-Location $ProjectRoot
    $environment = Initialize-AndroidEnvironment
    Write-Step ("ANDROID_SDK_ROOT={0}" -f $environment.SdkRoot) Green
    Write-Step ("adb.exe={0}" -f $environment.AdbPath) Green

    $selection = Select-PhysicalDevice $environment.AdbPath $DeviceSerial
    if (-not $selection.Success) {
        Write-Step ("P1 physical device acceptance blocked: {0}." -f $selection.Reason) Red
        Write-BlockedSummary $selection.Reason $environment
        exit 1
    }

    $serial = $selection.Device.Serial
    $deviceModel = Get-DeviceProperty $environment.AdbPath $serial "ro.product.model"
    $androidVersion = Get-DeviceProperty $environment.AdbPath $serial "ro.build.version.release"

    if ($Build) {
        Invoke-External "powershell" @("-ExecutionPolicy", "Bypass", "-File", (Join-Path $ProjectRoot "scripts\verify-platform-v2.ps1")) | Out-Null
    } elseif (-not (Test-Path $ApkPath)) {
        throw "Debug APK not found at $ApkPath. Re-run with -Build."
    }

    Invoke-External $environment.AdbPath @("-s", $serial, "install", "-r", $ApkPath) | Out-Null

    $backendMode = "adb reverse tcp:3000 tcp:3000"
    $reverseResult = Invoke-External $environment.AdbPath @("-s", $serial, "reverse", "tcp:3000", "tcp:3000") -AllowFailure
    if ($reverseResult.ExitCode -ne 0) {
        $backendMode = "QA backend URL override required; adb reverse failed"
        Write-Step "adb reverse failed. Use the QA panel backend URL override before remote-config acceptance." Yellow
    }

    $coldLaunchLog = Join-Path $CrashDir "p1-cold-launch-$Stamp.log"
    Invoke-External $environment.AdbPath @("-s", $serial, "logcat", "-c") | Out-Null
    Invoke-External $environment.AdbPath @("-s", $serial, "shell", "am", "start", "-n", "com.alba.app/com.alba.app.MainActivity") | Out-Null
    Start-Sleep -Seconds 8
    Save-Logcat $environment.AdbPath $serial $coldLaunchLog
    Test-CrashLog $coldLaunchLog

    $fruit = Capture-Demo $environment.AdbPath $serial "fruit_slash_demo" "JUMPING_JACK" "fruit-slash"
    $dodge = Capture-Demo $environment.AdbPath $serial "dodge_run_demo" "JUMP_ROPE" "dodge-run"
    $fit = Capture-Demo $environment.AdbPath $serial "fit_challenge_demo" "SQUAT" "fit-challenge"

    $summary = @(
        "# P1 Physical Device Acceptance",
        "",
        ("Date: {0}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz")),
        ("Branch: {0}" -f (& git -C $ProjectRoot branch --show-current 2>$null)),
        ("Device serial: {0}" -f $serial),
        ("Device model: {0}" -f $deviceModel),
        ("Android version: {0}" -f $androidVersion),
        ("APK: {0}" -f $ApkPath),
        ("Backend URL mode: {0}" -f $backendMode),
        "",
        "## Result",
        "",
        "- Cold launch: PASS",
        "- Fruit Slash demo: PASS",
        "- Dodge Run demo: PASS",
        "- Fit Challenge demo: PASS",
        "- Crash logs: PASS",
        "",
        "## Evidence",
        "",
        "- P0 verification log: artifacts/verification/platform-v2-20260508.log",
        ("- Cold launch crash log: {0}" -f $coldLaunchLog),
        ("- Fruit Slash video: {0}" -f $fruit.Video),
        ("- Fruit Slash log: {0}" -f $fruit.Log),
        ("- Dodge Run video: {0}" -f $dodge.Video),
        ("- Dodge Run log: {0}" -f $dodge.Log),
        ("- Fit Challenge video: {0}" -f $fit.Video),
        ("- Fit Challenge log: {0}" -f $fit.Log),
        "",
        "## Notes",
        "",
        "- Debug QA launch extras were used for direct demo startup.",
        "- Direct manual tap validation still needs human touch / mirroring if ADB input injection is blocked."
    )
}
catch {
    $failed = $true
    $summary = @(
        "# P1 Physical Device Acceptance",
        "",
        ("Date: {0}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz")),
        ("Branch: {0}" -f (& git -C $ProjectRoot branch --show-current 2>$null)),
        "Result: FAIL",
        ("Reason: {0}" -f $_.Exception.Message),
        "",
        "## Notes",
        "",
        "- P1 did not complete.",
        "- Review console output and generated crash logs before retrying."
    )
    Write-Step ("P1 acceptance failed: {0}" -f $_.Exception.Message) Red
}
finally {
    Pop-Location
    if ($summary) {
        Set-Content -Path $SummaryPath -Encoding utf8 -Value $summary
        Write-Step ("Summary: {0}" -f $SummaryPath) Cyan
    }
}

if ($failed) {
    exit 1
}
exit 0
