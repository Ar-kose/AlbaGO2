# AlbaGo P1 physical Android device preflight.
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/preflight-physical-device.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/preflight-physical-device.ps1 -DeviceSerial <serial>
#   powershell -ExecutionPolicy Bypass -File scripts/preflight-physical-device.ps1 -RestartAdb

param(
    [string]$DeviceSerial,
    [switch]$RestartAdb
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path "$ScriptDir\.."
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ArtifactsDir = Join-Path $ProjectRoot "artifacts\verification"
$LogPath = Join-Path $ArtifactsDir "physical-device-preflight-$Stamp.log"

New-Item -ItemType Directory -Force -Path $ArtifactsDir | Out-Null

function Write-Log {
    param(
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Message,
        [ConsoleColor]$Color = [ConsoleColor]::White
    )

    Write-Host $Message -ForegroundColor $Color
    Add-Content -Path $LogPath -Encoding utf8 -Value $Message
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

function Invoke-LoggedCommand {
    param(
        [Parameter(Mandatory = $true)][string]$Program,
        [Parameter(Mandatory = $true)][string[]]$CommandArgs
    )

    Write-Log ""
    Write-Log ("> {0} {1}" -f $Program, ($CommandArgs -join " ")) Cyan
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $output = & $Program @CommandArgs 2>&1
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    if ($null -ne $output) {
        foreach ($line in $output) {
            Write-Log ([string]$line)
        }
    }
    Write-Log ("exitCode={0}" -f $exitCode)
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

Set-Content -Path $LogPath -Encoding utf8 -Value ("AlbaGo physical device preflight - {0}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz"))

$exitCode = 0

try {
    Push-Location $ProjectRoot
    $branch = (& git branch --show-current 2>$null)
    Pop-Location
    Write-Log ("Branch: {0}" -f $branch)
    if ($branch -ne "platform-v2") {
        Write-Log ("WARN: expected branch platform-v2, current branch is {0}." -f $branch) Yellow
    }

    $javaHome = Resolve-JavaHome
    if (-not $javaHome) {
        Write-Log "WARN: JAVA_HOME is not set to a valid JDK/JBR path." Yellow
    } else {
        $env:JAVA_HOME = $javaHome
        Write-Log ("JAVA_HOME={0}" -f $env:JAVA_HOME) Green
        $previousErrorActionPreference = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        try {
            $javaVersion = & (Join-Path $env:JAVA_HOME "bin\java.exe") -version 2>&1
        }
        finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }
        foreach ($line in $javaVersion) {
            Write-Log ("java: {0}" -f $line)
        }
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
    Write-Log ("ANDROID_SDK_ROOT={0}" -f $env:ANDROID_SDK_ROOT) Green
    Write-Log ("ANDROID_HOME={0}" -f $env:ANDROID_HOME) Green
    Write-Log ("GRADLE_USER_HOME={0}" -f $env:GRADLE_USER_HOME)

    $adb = Get-Command adb -ErrorAction Stop
    Write-Log ("adb.exe={0}" -f $adb.Source) Green

    if ($RestartAdb) {
        Invoke-LoggedCommand $adb.Source @("kill-server") | Out-Null
        Invoke-LoggedCommand $adb.Source @("start-server") | Out-Null
    }

    $versionResult = Invoke-LoggedCommand $adb.Source @("version")
    if ($versionResult.ExitCode -ne 0) {
        throw "adb version failed"
    }

    $devicesResult = Invoke-LoggedCommand $adb.Source @("devices", "-l")
    if ($devicesResult.ExitCode -ne 0) {
        throw "adb devices -l failed"
    }

    $rows = @(ConvertFrom-AdbDeviceOutput $devicesResult.Output)
    $physicalRows = @($rows | Where-Object { -not $_.IsEmulator })
    $usablePhysical = @($physicalRows | Where-Object { $_.State -eq "device" })
    $unauthorizedPhysical = @($physicalRows | Where-Object { $_.State -eq "unauthorized" })
    $offlinePhysical = @($physicalRows | Where-Object { $_.State -eq "offline" })
    $emulators = @($rows | Where-Object { $_.IsEmulator })

    Write-Log ""
    Write-Log "Device classification:" Cyan
    Write-Log ("  physical total: {0}" -f $physicalRows.Count)
    Write-Log ("  usable physical: {0}" -f $usablePhysical.Count)
    Write-Log ("  unauthorized physical: {0}" -f $unauthorizedPhysical.Count)
    Write-Log ("  offline physical: {0}" -f $offlinePhysical.Count)
    Write-Log ("  emulators: {0}" -f $emulators.Count)

    if ($emulators.Count -gt 0 -and $usablePhysical.Count -eq 0) {
        Write-Log "Emulator detected, but emulator evidence is secondary and does not satisfy P1 physical device acceptance." Yellow
    }

    if (-not [string]::IsNullOrWhiteSpace($DeviceSerial)) {
        $selected = $rows | Where-Object { $_.Serial -eq $DeviceSerial } | Select-Object -First 1
        if (-not $selected) {
            Write-Log ("P1 physical device acceptance blocked: requested device serial {0} was not returned by adb devices -l." -f $DeviceSerial) Red
            $exitCode = 1
        } elseif ($selected.IsEmulator) {
            Write-Log ("P1 physical device acceptance blocked: requested serial {0} is an emulator and cannot satisfy P1." -f $DeviceSerial) Red
            $exitCode = 1
        } elseif ($selected.State -eq "unauthorized") {
            Write-Log "P1 physical device acceptance blocked: device is unauthorized. Unlock the device and accept the RSA debugging prompt." Red
            $exitCode = 1
        } elseif ($selected.State -ne "device") {
            Write-Log ("P1 physical device acceptance blocked: device {0} state is {1}." -f $DeviceSerial, $selected.State) Red
            $exitCode = 1
        } else {
            Write-Log ("P1 physical device preflight PASS: usable physical device {0} found." -f $DeviceSerial) Green
        }
    } elseif ($unauthorizedPhysical.Count -gt 0) {
        Write-Log "P1 physical device acceptance blocked: unauthorized physical device returned by adb devices -l. Unlock the device and accept the RSA debugging prompt." Red
        $exitCode = 1
    } elseif ($offlinePhysical.Count -gt 0) {
        Write-Log "P1 physical device acceptance blocked: offline physical device returned by adb devices -l. Reconnect the USB cable and confirm USB debugging is enabled." Red
        $exitCode = 1
    } elseif ($usablePhysical.Count -eq 0) {
        Write-Log "P1 physical device acceptance blocked: no usable physical device returned by adb devices -l." Red
        Write-Log "Next action: connect/unlock device, enable USB debugging, accept RSA prompt, and verify Windows ADB driver." Yellow
        $exitCode = 1
    } elseif ($usablePhysical.Count -gt 1) {
        Write-Log "P1 physical device acceptance blocked: multiple usable physical devices returned. Re-run with -DeviceSerial <serial>." Red
        foreach ($device in $usablePhysical) {
            Write-Log ("  - {0}" -f $device.Raw)
        }
        $exitCode = 1
    } else {
        Write-Log ("P1 physical device preflight PASS: usable physical device {0} found." -f $usablePhysical[0].Serial) Green
    }
}
catch {
    Write-Log ("FATAL: {0}" -f $_.Exception.Message) Red
    $exitCode = 1
}

Write-Log ""
Write-Log ("Log: {0}" -f $LogPath)
exit $exitCode
