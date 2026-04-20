@echo off
setlocal

set IMAGE=time4action/patrik-warranty-form

:: Always generate a date tag
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "Get-Date -Format 'yyyyMMdd-HHmmss'"') do set DATE_TAG=%%i

:: Determine tag
if "%~1"=="--latest" (
    set TAG=latest
) else if "%~1"=="--dev" (
    set TAG=dev
) else (
    set TAG=%DATE_TAG%
)

echo [build] Reading .env for NEXT_PUBLIC_ build args...

:: Build with the primary tag
powershell -NoProfile -Command ^
  "$env = @{};" ^
  "Get-Content '.env' | Where-Object { $_ -match '^\s*[A-Za-z]' } | ForEach-Object {" ^
  "  $parts = $_ -split '=', 2;" ^
  "  if ($parts.Count -eq 2) { $env[$parts[0].Trim()] = $parts[1].Trim() }" ^
  "};" ^
  "$mapbox = $env['NEXT_PUBLIC_MAPBOX_API_KEY'];" ^
  "$ga = $env['NEXT_PUBLIC_GA_MEASUREMENT_ID'];" ^
  "Write-Host \"[build] Building %IMAGE%:%TAG%...\";" ^
  "docker build" ^
  "  --build-arg NEXT_PUBLIC_MAPBOX_API_KEY=$mapbox" ^
  "  --build-arg NEXT_PUBLIC_GA_MEASUREMENT_ID=$ga" ^
  "  -t %IMAGE%:%TAG% .;" ^
  "if ($LASTEXITCODE -ne 0) { Write-Error 'Build failed'; exit 1 };" ^
  "Write-Host \"[build] Done: %IMAGE%:%TAG%\""

:: If a named tag was specified, also tag with the date
if "%TAG%" neq "%DATE_TAG%" (
    echo [build] Also tagging as %IMAGE%:%DATE_TAG%...
    docker tag %IMAGE%:%TAG% %IMAGE%:%DATE_TAG%
    echo [build] Done: %IMAGE%:%DATE_TAG%
)

endlocal
