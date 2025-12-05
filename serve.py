#!/usr/bin/env python3
"""
Simple local development server for Chess Voice
Starts both backend API and frontend server

Usage: python serve.py
Then visit: http://localhost:8000 (frontend)
Backend API: http://127.0.0.1:8001/api
"""

import http.server
import socketserver
import subprocess
import sys
import os
import time
import webbrowser
import urllib.request
import urllib.error
from pathlib import Path

FRONTEND_PORT = 8000
BACKEND_PORT = 8001
BACKEND_HOST = "127.0.0.1"

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Handle clean URLs (e.g., /about -> /about.html)
        if not os.path.splitext(self.path)[1]:
            # No file extension, try adding .html
            html_path = self.path.rstrip('/') + '.html'
            if os.path.isfile('.' + html_path):
                self.path = html_path
        
        # Default behavior
        return http.server.SimpleHTTPRequestHandler.do_GET(self)
    
    def end_headers(self):
        # Add CORS headers for API calls
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def check_backend_running():
    """Check if backend is already running."""
    try:
        req = urllib.request.Request(f"http://{BACKEND_HOST}:{BACKEND_PORT}/api/health/")
        with urllib.request.urlopen(req, timeout=1) as response:
            return response.status == 200
    except:
        return False

def start_backend():
    """Start the backend FastAPI server."""
    # Check if backend is already running
    if check_backend_running():
        print(f"✅ Backend API already running at http://{BACKEND_HOST}:{BACKEND_PORT}/api")
        return
    
    backend_script = Path(__file__).parent / "start_backend.py"
    
    print("🚀 Starting backend server...")
    print(f"   (This will open in a new window)")
    
    if sys.platform == "win32":
        # Windows: Start in new window using the Python script
        subprocess.Popen(
            ["cmd", "/c", "start", "cmd", "/k", f'python "{backend_script}"'],
            shell=True
        )
    else:
        # Linux/Mac: Start in background
        subprocess.Popen(
            [sys.executable, str(backend_script)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
    
    # Wait for backend to start (check multiple times)
    print("   Waiting for backend to start...")
    max_attempts = 15
    for i in range(max_attempts):
        time.sleep(1)
        if check_backend_running():
            print(f"✅ Backend API running at http://{BACKEND_HOST}:{BACKEND_PORT}/api")
            return
        if i % 3 == 2:
            print(f"   Still waiting... ({i+1}/{max_attempts})")
    
    print(f"\n⚠️  Backend may not have started.")
    print(f"   Please start it manually:")
    print(f"   - Windows: double-click start_backend.bat")
    print(f"   - Or run: python start_backend.py")
    print(f"   - Expected at: http://{BACKEND_HOST}:{BACKEND_PORT}/api")

def main():
    # Change to frontend directory
    frontend_dir = Path(__file__).parent / "frontend"
    os.chdir(frontend_dir)
    
    # Start backend server
    start_backend()
    
    # Start frontend server
    with socketserver.TCPServer(("", FRONTEND_PORT), CustomHandler) as httpd:
        url = f"http://localhost:{FRONTEND_PORT}"
        print(f"\n🚀 Frontend server running at {url}/")
        print(f"📁 Serving files from: {frontend_dir}")
        print(f"\n✨ URLs:")
        print(f"   Frontend: {url}/")
        print(f"   Backend API: http://{BACKEND_HOST}:{BACKEND_PORT}/api")
        print(f"\n💡 Note: Backend runs in a separate window/process")
        print(f"   Press Ctrl+C to stop frontend server only")
        print(f"   (Backend must be stopped separately)\n")
        
        # Try to open browser automatically
        try:
            webbrowser.open(url)
        except:
            pass
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n👋 Frontend server stopped")
            print("   (Backend is still running - stop it separately if needed)")

if __name__ == "__main__":
    main()

