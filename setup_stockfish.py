#!/usr/bin/env python3
"""
Helper script to set up Stockfish for chess-voice.
This script will try to find stockfish.exe and copy it to the correct location.
"""

import os
import shutil
from pathlib import Path

def find_stockfish():
    """Find stockfish.exe in common locations."""
    script_dir = Path(__file__).parent.absolute()
    backend_dir = script_dir / "backend"
    project_root = script_dir.parent.absolute()
    
    search_paths = [
        # From restock-chess
        project_root / "restock-chess" / "backend" / "stockfish" / "stockfish.exe",
        # In backend/stockfish/
        backend_dir / "stockfish" / "stockfish.exe",
        # In backend/
        backend_dir / "stockfish.exe",
        # In project root
        script_dir / "stockfish.exe",
    ]
    
    for path in search_paths:
        if path.exists():
            return path
    
    return None

def setup_stockfish():
    """Set up Stockfish by copying it to the correct location."""
    script_dir = Path(__file__).parent.absolute()
    backend_dir = script_dir / "backend"
    target_dir = backend_dir / "stockfish"
    target_path = target_dir / "stockfish.exe"
    
    # Check if Stockfish already exists in the repo
    if target_path.exists():
        print(f"✓ Stockfish already exists at: {target_path}")
        print("   (Included in repository for Windows users)")
        return True
    
    print("Looking for Stockfish executable...")
    source_path = find_stockfish()
    
    if source_path:
        print(f"Found Stockfish at: {source_path}")
        
        # Create target directory if it doesn't exist
        target_dir.mkdir(exist_ok=True)
        
        # Copy if target doesn't exist or is different
        if not target_path.exists() or target_path.stat().st_size != source_path.stat().st_size:
            print(f"Copying to: {target_path}")
            shutil.copy2(source_path, target_path)
            print("✓ Stockfish set up successfully!")
        else:
            print(f"✓ Stockfish already exists at: {target_path}")
        
        return True
    else:
        print("✗ Stockfish executable not found in common locations.")
        print("\nPlease:")
        print("  1. Download Stockfish from https://stockfishchess.org/download/")
        print("  2. Place stockfish.exe in one of these locations:")
        print(f"     - {target_dir / 'stockfish.exe'}")
        print(f"     - {backend_dir / 'stockfish.exe'}")
        print("  3. Or copy it from restock-chess/backend/stockfish/")
        print("\nNote: Windows users - stockfish.exe should be included in the repository.")
        return False

if __name__ == "__main__":
    setup_stockfish()

