@echo off
echo Starting Chess Voice Backend API...
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
pause

