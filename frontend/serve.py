#!/usr/bin/env python3
"""
This file is kept for backwards compatibility.
Use serve.py in the root directory instead.
"""

import sys
from pathlib import Path

# Redirect to root serve.py
root_serve = Path(__file__).parent.parent / "serve.py"
if root_serve.exists():
    print("⚠️  Please use serve.py from the root directory:")
    print(f"   python {root_serve}")
    sys.exit(1)
else:
    print("Error: serve.py not found in root directory")
    sys.exit(1)


