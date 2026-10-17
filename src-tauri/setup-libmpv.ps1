#!/usr/bin/env pwsh
# Run from src-tauri directory:
#   pwsh ./setup-libmpv.ps1
# or:
#   powershell -ExecutionPolicy Bypass -File .\setup-libmpv.ps1

$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$libDir = Join-Path $root "libmpv"
$archiveUrl = "https://nightly.link/shinchiro/mpv-winbuild-cmake/workflows/build_libmpv/master/mpv-dev-x86_64-v3.zip"
$archivePath = Join-Path $env:TEMP "mpv-dev-x86_64.zip"

Write-Host "[setup-libmpv] target dir: $libDir"

if (-not (Test-Path $libDir)) {
    New-Item -ItemType Directory -Force -Path $libDir | Out-Null
}

if (-not (Test-Path (Join-Path $libDir "libmpv-2.dll"))) {
    Write-Host "[setup-libmpv] downloading libmpv dev bundle..."
    try {
        Invoke-WebRequest -Uri $archiveUrl -OutFile $archivePath -UseBasicParsing
    } catch {
        Write-Host "[setup-libmpv] download failed; falling back to mpv.io build" -ForegroundColor Yellow
        $archiveUrl = "https://github.com/shinchiro/mpv-winbuild-cmake/releases/latest/download/mpv-dev-x86_64-v3.zip"
        Invoke-WebRequest -Uri $archiveUrl -OutFile $archivePath -UseBasicParsing
    }
    Write-Host "[setup-libmpv] extracting..."
    Expand-Archive -Path $archivePath -DestinationPath $libDir -Force
    Remove-Item $archivePath -Force
}

# Locate the import lib. Some bundles ship mpv.lib (MSVC), some ship libmpv.dll.a (MinGW).
$mpvLib = Get-ChildItem -Path $libDir -Filter "mpv.lib" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
$libmpvDllA = Get-ChildItem -Path $libDir -Filter "libmpv.dll.a" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
$libmpvDef = Get-ChildItem -Path $libDir -Filter "libmpv.def" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $mpvLib) {
    if ($libmpvDef) {
        Write-Host "[setup-libmpv] no mpv.lib found, generating from libmpv.def via lib.exe..."
        $libExe = Get-Command lib.exe -ErrorAction SilentlyContinue
        if (-not $libExe) {
            Write-Host "[setup-libmpv] ERROR: lib.exe not in PATH. Open 'x64 Native Tools Command Prompt for VS' and re-run." -ForegroundColor Red
            exit 1
        }
        Push-Location $libmpvDef.DirectoryName
        & lib.exe /def:libmpv.def /out:mpv.lib /machine:x64
        Pop-Location
        $mpvLib = Get-ChildItem -Path $libDir -Filter "mpv.lib" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    } elseif ($libmpvDllA) {
        Write-Host "[setup-libmpv] only libmpv.dll.a (MinGW format) found — copy to mpv.lib for MSVC linker"
        Copy-Item -Path $libmpvDllA.FullName -Destination (Join-Path $libmpvDllA.DirectoryName "mpv.lib")
        $mpvLib = Get-ChildItem -Path $libDir -Filter "mpv.lib" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    }
}

if (-not $mpvLib) {
    Write-Host "[setup-libmpv] ERROR: could not produce mpv.lib." -ForegroundColor Red
    exit 1
}

$libDirAbs = $mpvLib.DirectoryName
$dll = Get-ChildItem -Path $libDir -Filter "libmpv-2.dll" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $dll) {
    Write-Host "[setup-libmpv] WARN: libmpv-2.dll not found in archive" -ForegroundColor Yellow
} else {
    # Copy DLL next to compass.exe so it loads at runtime (debug + release)
    $debugDir = Join-Path $root "target\debug"
    $releaseDir = Join-Path $root "target\release"
    foreach ($d in @($debugDir, $releaseDir)) {
        if (Test-Path $d) {
            Copy-Item -Path $dll.FullName -Destination $d -Force
            Write-Host "[setup-libmpv] copied libmpv-2.dll -> $d"
        }
    }
}

Write-Host ""
Write-Host "[setup-libmpv] DONE." -ForegroundColor Green
Write-Host ""
Write-Host "Add this to your environment for cargo build:"
Write-Host "  set LIB=%LIB%;$libDirAbs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Or run cargo build through this script (sets LIB for one invocation):"
Write-Host "  `$env:LIB = `"`$env:LIB;$libDirAbs`"; cargo build" -ForegroundColor Cyan
Write-Host ""
Write-Host "After build, libmpv-2.dll has been copied next to compass.exe."
