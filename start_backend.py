#!/usr/bin/env python3
"""
Start the backend API server for Chess Voice.

Usage: python start_backend.py
"""

import sys
import os
from pathlib import Path

# Change to backend directory
backend_dir = Path(__file__).parent / "backend"
os.chdir(backend_dir)

# If the user stored the OAuth token in a local file (and gitignored it),
# load it into the expected environment variable.
token_file = Path(__file__).parent / "backend" / "lichess_oauth.txt"
if not os.getenv("LICHESS_OAUTH_TOKEN", "").strip() and token_file.exists():
    try:
        token = token_file.read_text(encoding="utf-8").strip()
        if token:
            os.environ["LICHESS_OAUTH_TOKEN"] = token
            print("🔑 Loaded Lichess OAuth token from `backend/lichess_oauth.txt`")
        else:
            print("⚠️ `backend/lichess_oauth.txt` exists but is empty")
    except Exception as e:
        print(f"⚠️ Could not read `backend/lichess_oauth.txt`: {e}")

# Start uvicorn
if __name__ == "__main__":
    print("🚀 Starting Chess Voice Backend API...")
    print(f"📁 Working directory: {os.getcwd()}")
    print(f"🌐 Server will run at: http://127.0.0.1:8001")
    print(f"📚 API docs at: http://127.0.0.1:8001/docs")
    print("\nPress Ctrl+C to stop the server\n")
    
    try:
        import uvicorn
        uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)
    except KeyboardInterrupt:
        print("\n\n👋 Backend server stopped")
    except ImportError:
        print("❌ Error: uvicorn not installed")
        print("Please run: pip install -r requirements.txt")
        sys.exit(1)

