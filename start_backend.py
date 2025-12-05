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

