from stockfish import Stockfish
import os
from pathlib import Path

# Get the backend directory (where this file is located)
BACKEND_DIR = Path(__file__).parent.absolute()
PROJECT_ROOT = BACKEND_DIR.parent.absolute()

# Try multiple paths to find Stockfish executable
STOCKFISH_PATHS = [
    # Try relative to backend directory
    BACKEND_DIR / "stockfish" / "stockfish.exe",
    BACKEND_DIR / "stockfish.exe",
    # Try from restock-chess project
    PROJECT_ROOT / "restock-chess" / "backend" / "stockfish" / "stockfish.exe",
    # Try in parent directory
    PROJECT_ROOT / "stockfish.exe",
    # Try just "stockfish" (if in PATH on Linux/Mac)
    "stockfish",
    "stockfish.exe"
]

stockfish = None
stockfish_path = None

# Try to find and initialize Stockfish
for path in STOCKFISH_PATHS:
    try:
        # For string paths, check if file exists
        if isinstance(path, (str, Path)):
            if isinstance(path, Path):
                path_str = str(path)
            else:
                path_str = path
            
            # For non-absolute string paths, try to find them
            if not os.path.isabs(path_str) and path_str not in ["stockfish", "stockfish.exe"]:
                if not os.path.exists(path_str):
                    continue
            
            # Try to initialize Stockfish
            stockfish = Stockfish(path=path_str, parameters={"Threads": 2, "Ponder": "true"})
            stockfish_path = path_str
            break
        else:
            # Try as-is for "stockfish" in PATH
            stockfish = Stockfish(path=path, parameters={"Threads": 2, "Ponder": "true"})
            stockfish_path = path
            break
    except Exception as e:
        # Continue to next path if this one fails
        continue

if stockfish is None:
    # Don't raise error at import time - let it fail when actually used
    # This allows the app to start even if Stockfish isn't configured yet
    stockfish_path = None


