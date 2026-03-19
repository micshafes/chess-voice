@echo off
echo Starting Chess Voice Backend API...
cd backend

REM If the user stored the token locally (gitignored), load it into env var.
REM This is needed because the backend reads LICHESS_OAUTH_TOKEN.
if exist "lichess_oauth.txt" (
    for /f "usebackq delims=" %%A in ("lichess_oauth.txt") do set LICHESS_OAUTH_TOKEN=%%A
)

python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
pause

