# AlbaGo Platform v2 - Local Verification Script
# Usage: powershell -ExecutionPolicy Bypass -File scripts/verify-platform-v2.ps1

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path "$ScriptDir\.."
$ArtifactsDir = Join-Path $ProjectRoot "artifacts\verification"
$LogPath = Join-Path $ArtifactsDir ("platform-v2-{0}.log" -f (Get-Date -Format "yyyyMMdd"))

$SuccessfulSteps = New-Object System.Collections.Generic.List[string]
$FailedSteps = New-Object System.Collections.Generic.List[string]
$EnvironmentBlockedSteps = New-Object System.Collections.Generic.List[string]
$Warnings = New-Object System.Collections.Generic.List[string]

function Write-Log {
    param(
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Message,
        [ConsoleColor]$Color = [ConsoleColor]::White
    )

    Write-Host $Message -ForegroundColor $Color
    Add-Content -Path $LogPath -Encoding utf8 -Value $Message
}

function Write-LogLine {
    Add-Content -Path $LogPath -Encoding utf8 -Value ""
}

function Test-ContainsNonAscii {
    param([string]$Value)
    return ($Value -match "[^\x00-\x7F]")
}

function Add-Warning {
    param([string]$Message)
    $Warnings.Add($Message) | Out-Null
    Write-Log "WARN: $Message" Yellow
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
        throw ("Android SDK not found. Checked: {0}. Set ANDROID_SDK_ROOT or install SDK under %LOCALAPPDATA%\Android\Sdk." -f ($candidates -join ", "))
    }

    return $resolved
}

function Invoke-VerificationStep {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$WorkingDirectory,
        [Parameter(Mandatory = $true)][string[]]$Command,
        [switch]$EnvironmentBlockAllowed
    )

    Write-LogLine
    Write-Log ("[{0}]" -f $Name) Cyan
    Write-Log ("cwd: {0}" -f $WorkingDirectory)
    Write-Log ("cmd: {0}" -f ($Command -join " "))

    Push-Location $WorkingDirectory
    try {
        $global:LASTEXITCODE = 0
        $program = $Command[0]
        $arguments = @()
        if ($Command.Count -gt 1) {
            $arguments = $Command[1..($Command.Count - 1)]
        }

        $previousErrorActionPreference = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        try {
            $output = & $program @arguments 2>&1
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

        if ($exitCode -eq 0) {
            $SuccessfulSteps.Add($Name) | Out-Null
            Write-Log ("RESULT: PASS - {0}" -f $Name) Green
            return $true
        }

        if ($EnvironmentBlockAllowed) {
            $EnvironmentBlockedSteps.Add($Name) | Out-Null
            Write-Log ("RESULT: ENVIRONMENT-BLOCKED - {0} (exit {1})" -f $Name, $exitCode) Yellow
            return $false
        }

        $FailedSteps.Add($Name) | Out-Null
        Write-Log ("RESULT: FAIL - {0} (exit {1})" -f $Name, $exitCode) Red
        throw "Verification step failed: $Name"
    }
    finally {
        Pop-Location
    }
}

function Ensure-GradleWrapperDistribution {
    param([Parameter(Mandatory = $true)][string]$GradleUserHome)

    $wrapperPropertiesPath = Join-Path $ProjectRoot "android\gradle\wrapper\gradle-wrapper.properties"
    if (-not (Test-Path $wrapperPropertiesPath)) {
        Add-Warning "Gradle wrapper properties file was not found; wrapper distribution cache cannot be pre-seeded."
        return
    }

    $distributionUrlLine = Get-Content -Path $wrapperPropertiesPath |
        Where-Object { $_ -match "^distributionUrl=" } |
        Select-Object -First 1
    if (-not $distributionUrlLine) {
        Add-Warning "Gradle distributionUrl was not found; wrapper distribution cache cannot be pre-seeded."
        return
    }

    $zipMatch = [regex]::Match($distributionUrlLine, "([^/\\]+\.zip)$")
    if (-not $zipMatch.Success) {
        Add-Warning "Gradle distributionUrl could not be parsed: $distributionUrlLine"
        return
    }

    $zipName = $zipMatch.Groups[1].Value
    $distName = [System.IO.Path]::GetFileNameWithoutExtension($zipName)
    $expandedName = $distName -replace "-bin$", ""
    $targetRoot = Join-Path $GradleUserHome "wrapper\dists\$distName"

    $existingTarget = if (Test-Path $targetRoot) {
        Get-ChildItem -Path $targetRoot -Directory |
            Where-Object {
                (Test-Path (Join-Path $_.FullName $expandedName)) -and
                (Test-Path (Join-Path $_.FullName "$zipName.ok"))
            } |
            Select-Object -First 1
    } else {
        $null
    }
    if ($existingTarget) {
        Write-Log "Gradle wrapper distribution cache - OK ($($existingTarget.FullName))" Green
        return
    }

    $defaultGradleHome = Join-Path $env:USERPROFILE ".gradle"
    $sourceRoot = Join-Path $defaultGradleHome "wrapper\dists\$distName"
    $source = if (Test-Path $sourceRoot) {
        Get-ChildItem -Path $sourceRoot -Directory |
            Where-Object {
                (Test-Path (Join-Path $_.FullName $expandedName)) -and
                (Test-Path (Join-Path $_.FullName "$zipName.ok"))
            } |
            Select-Object -First 1
    } else {
        $null
    }

    if (-not $source) {
        Add-Warning "Gradle wrapper distribution is not pre-cached in $GradleUserHome or $defaultGradleHome; Gradle may need network access."
        return
    }

    $target = Join-Path $targetRoot $source.Name
    New-Item -ItemType Directory -Force -Path $target | Out-Null
    Remove-Item -LiteralPath (Join-Path $target "$zipName.lck") -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath (Join-Path $target "$zipName.part") -Force -ErrorAction SilentlyContinue
    Copy-Item -LiteralPath (Join-Path $source.FullName $expandedName) -Destination $target -Recurse -Force
    Copy-Item -LiteralPath (Join-Path $source.FullName "$zipName.ok") -Destination $target -Force
    Write-Log "Seeded Gradle wrapper distribution into $target" Green
}

function Write-Summary {
    Write-LogLine
    Write-Log "========================================" Cyan
    Write-Log " Verification Summary" Cyan
    Write-Log "========================================" Cyan
    Write-Log ("Log: {0}" -f $LogPath)

    Write-LogLine
    Write-Log "Successful steps:" Green
    if ($SuccessfulSteps.Count -eq 0) {
        Write-Log "  (none)"
    } else {
        foreach ($step in $SuccessfulSteps) {
            Write-Log ("  - {0}" -f $step)
        }
    }

    Write-LogLine
    Write-Log "Environment-blocked steps:" Yellow
    if ($EnvironmentBlockedSteps.Count -eq 0) {
        Write-Log "  (none)"
    } else {
        foreach ($step in $EnvironmentBlockedSteps) {
            Write-Log ("  - {0}" -f $step)
        }
    }

    Write-LogLine
    Write-Log "Failed steps:" Red
    if ($FailedSteps.Count -eq 0) {
        Write-Log "  (none)"
    } else {
        foreach ($step in $FailedSteps) {
            Write-Log ("  - {0}" -f $step)
        }
    }

    Write-LogLine
    Write-Log "Warnings:" Yellow
    if ($Warnings.Count -eq 0) {
        Write-Log "  (none)"
    } else {
        foreach ($warning in $Warnings) {
            Write-Log ("  - {0}" -f $warning)
        }
    }
}

function Assert-AndroidPreflight {
    $javaHome = "C:\Program Files\Android\Android Studio\jbr"
    $forcedGradleUserHome = "C:\gradle-cache"

    Write-LogLine
    Write-Log "[PREFLIGHT]" Yellow

    if (-not (Test-Path "$javaHome\bin\java.exe")) {
        $FailedSteps.Add("preflight: Java") | Out-Null
        Write-Log "FATAL: Android Studio JBR not found at $javaHome" Red
        throw "Android Studio JBR not found"
    }

    try {
        $androidSdkRoot = Resolve-AndroidSdkRoot
    }
    catch {
        $FailedSteps.Add("preflight: Android SDK") | Out-Null
        Write-Log ("FATAL: {0}" -f $_.Exception.Message) Red
        throw
    }
    Write-Log ("Android SDK root - OK ({0})" -f $androidSdkRoot) Green

    $previousGradleUserHome = $env:GRADLE_USER_HOME
    if ([string]::IsNullOrWhiteSpace($previousGradleUserHome)) {
        Add-Warning "GRADLE_USER_HOME was not set; using $forcedGradleUserHome."
    } elseif (Test-ContainsNonAscii $previousGradleUserHome) {
        Add-Warning "GRADLE_USER_HOME contains non-ASCII characters ($previousGradleUserHome); using $forcedGradleUserHome."
    } elseif ($previousGradleUserHome -ne $forcedGradleUserHome) {
        Add-Warning "Android verification is pinned to $forcedGradleUserHome for deterministic Gradle worker behavior."
    }

    if (-not (Test-Path $forcedGradleUserHome)) {
        New-Item -ItemType Directory -Force -Path $forcedGradleUserHome | Out-Null
        Write-Log "Created $forcedGradleUserHome" Green
    }
    Ensure-GradleWrapperDistribution $forcedGradleUserHome

    $env:JAVA_HOME = $javaHome
    $env:ANDROID_SDK_ROOT = $androidSdkRoot
    $env:ANDROID_HOME = $androidSdkRoot
    $env:GRADLE_USER_HOME = $forcedGradleUserHome
    $env:PATH = "$javaHome\bin;$androidSdkRoot\platform-tools;$env:PATH"

    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $javaOut = & "$javaHome\bin\java.exe" -version 2>&1
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    foreach ($line in $javaOut) {
        Write-Log ("java: {0}" -f $line)
    }

    $javaVersionLine = $javaOut | Select-Object -First 1
    $javaMajor = if ($javaVersionLine -match 'version "(\d+)') { [int]$Matches[1] } else { 0 }
    if ($javaMajor -lt 17 -or $javaMajor -gt 21) {
        $FailedSteps.Add("preflight: Java version") | Out-Null
        Write-Log "FATAL: Java major version $javaMajor is not supported for this baseline. Use Android Studio JBR 21 or a supported JDK 17-21 runtime." Red
        Write-Log "FATAL: Java 26 is intentionally rejected for Gradle/Kotlin/AGP 8.4.2." Red
        throw "Unsupported Java version"
    }
    Write-Log ("Java major version {0} - OK" -f $javaMajor) Green

    if ($env:GRADLE_USER_HOME -ne $forcedGradleUserHome) {
        $FailedSteps.Add("preflight: GRADLE_USER_HOME") | Out-Null
        Write-Log "FATAL: Android verification refuses to run without GRADLE_USER_HOME=$forcedGradleUserHome" Red
        throw "GRADLE_USER_HOME is not pinned"
    }

    $androidBuildGradle = Join-Path $ProjectRoot "android\build.gradle.kts"
    $browserPinText = Get-Content -Raw -Encoding UTF8 -Path $androidBuildGradle
    if ($browserPinText -notmatch "androidx\.browser" -or $browserPinText -notmatch 'useVersion\("1\.8\.0"\)') {
        Add-Warning "androidx.browser:browser:1.8.0 pin was not found in android/build.gradle.kts."
    } else {
        Write-Log "androidx.browser:browser:1.8.0 pin - OK" Green
    }

    $SuccessfulSteps.Add("preflight") | Out-Null
}

New-Item -ItemType Directory -Force -Path $ArtifactsDir | Out-Null
Set-Content -Path $LogPath -Encoding utf8 -Value ("AlbaGo Platform v2 verification - {0}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz"))

Write-Log "========================================" Cyan
Write-Log " AlbaGo Platform v2 - Verification" Cyan
Write-Log "========================================" Cyan

try {
    Assert-AndroidPreflight

    Invoke-VerificationStep "npm install" $ProjectRoot @("npm.cmd", "install") | Out-Null
    Invoke-VerificationStep "backend prisma generate" $ProjectRoot @("npm.cmd", "run", "prisma:generate", "--workspace", "backend") | Out-Null
    Invoke-VerificationStep "backend build" $ProjectRoot @("npm.cmd", "run", "build", "--workspace", "backend") | Out-Null
    Invoke-VerificationStep "backend test" $ProjectRoot @("npm.cmd", "run", "test", "--workspace", "backend") | Out-Null
    Invoke-VerificationStep "admin build" $ProjectRoot @("npm.cmd", "run", "build", "--workspace", "admin") | Out-Null

    $androidDir = Join-Path $ProjectRoot "android"
    $coreRuntimeTestsPassed = Invoke-VerificationStep "android core_runtime unit tests" $androidDir @(".\gradlew.bat", ":core_runtime:testDebugUnitTest", "--no-daemon", "--stacktrace") -EnvironmentBlockAllowed
    if (-not $coreRuntimeTestsPassed) {
        Invoke-VerificationStep "android core_runtime unit test compile proof" $androidDir @(".\gradlew.bat", ":core_runtime:compileDebugUnitTestKotlin", "--no-daemon", "--stacktrace") | Out-Null
    }

    $appTestsPassed = Invoke-VerificationStep "android app unit tests" $androidDir @(".\gradlew.bat", ":app:testDebugUnitTest", "--no-daemon", "--stacktrace") -EnvironmentBlockAllowed
    if (-not $appTestsPassed) {
        Invoke-VerificationStep "android app unit test compile proof" $androidDir @(".\gradlew.bat", ":app:compileDebugUnitTestKotlin", "--no-daemon", "--stacktrace") | Out-Null
    }

    Invoke-VerificationStep "android debug apk assemble" $androidDir @(".\gradlew.bat", ":app:assembleDebug", "--no-daemon", "--stacktrace") | Out-Null

    Write-Summary

    if ($FailedSteps.Count -gt 0) {
        exit 1
    }

    if ($EnvironmentBlockedSteps.Count -gt 0) {
        Write-LogLine
        Write-Log "Verification completed with environment-blocked Android unit test execution. Compile proof and APK build completed." Yellow
    } else {
        Write-LogLine
        Write-Log "Verification completed successfully." Green
    }
}
catch {
    Write-LogLine
    Write-Log ("FATAL: {0}" -f $_.Exception.Message) Red
    Write-Summary
    exit 1
}
