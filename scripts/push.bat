@echo off
setlocal

set IMAGE=time4action/patrik-warranty-form

:: Determine tag
if "%~1"=="--latest" (
    set TAG=latest
) else if "%~1"=="--dev" (
    set TAG=dev
) else (
    :: No named tag — generate a date tag and push only that
    for /f "tokens=*" %%i in ('powershell -NoProfile -Command "Get-Date -Format 'yyyyMMdd-HHmmss'"') do set DATE_TAG=%%i
    echo [push] Pushing %IMAGE%:%DATE_TAG%...
    docker push %IMAGE%:%DATE_TAG%
    if %ERRORLEVEL% neq 0 (
        echo [push] Push failed!
        exit /b 1
    )
    echo [push] Done: %IMAGE%:%DATE_TAG%
    goto :eof
)

:: Named tag specified — find the most recent locally date-tagged image
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "docker images %IMAGE% --format '{{.Tag}}' | Where-Object { $_ -match '^\d{8}-\d{6}$' } | Sort-Object -Descending | Select-Object -First 1"') do set DATE_TAG=%%i

if "%DATE_TAG%"=="" (
    echo [push] Error: no date-tagged image found for %IMAGE%. Build first.
    exit /b 1
)

echo [push] Pushing %IMAGE%:%TAG%...
docker push %IMAGE%:%TAG%
if %ERRORLEVEL% neq 0 (
    echo [push] Push failed!
    exit /b 1
)
echo [push] Done: %IMAGE%:%TAG%

echo [push] Also pushing %IMAGE%:%DATE_TAG%...
docker push %IMAGE%:%DATE_TAG%
if %ERRORLEVEL% neq 0 (
    echo [push] Push of date tag failed!
    exit /b 1
)
echo [push] Done: %IMAGE%:%DATE_TAG%

endlocal
