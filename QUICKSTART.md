# Quick Start Guide

## Prerequisites Check

1. **Python 3.8+** installed
2. **Stockfish executable** available (see setup below)
3. **Master games database** (optional, but recommended)

## Setup Steps

### 1. Install Dependencies

```bash
cd chess-voice/backend
pip install -r requirements.txt
```

### 2. Set Up Stockfish

**Option A: Copy from restock-chess (if available)**
```bash
# Copy stockfish.exe from restock-chess
cp ../restock-chess/backend/stockfish/stockfish.exe backend/stockfish/
```

**Option B: Download Stockfish**
- Download from https://stockfishchess.org/download/
- Place `stockfish.exe` in `chess-voice/backend/stockfish/`

### 3. Set Up Master Games Database (Optional)

**Option A: Copy from chess-gift (if available)**
```bash
# Copy the master games JSON file
cp ../chess-gift/data/json/chess_positions_frontend.json backend/data/
```

**Option B: Use without master games**
- The app will work without it, but won't show master game data

## Running the Application

### Start the Backend

**Windows:**
```bash
start_backend.bat
```

**Linux/Mac:**
```bash
chmod +x start_backend.sh
./start_backend.sh
```

**Or manually:**
```bash
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The backend will start on `http://127.0.0.1:8000`

### Start the Frontend

**Option A: Use the Python server**
```bash
cd frontend
python serve.py
```

**Option B: Open directly**
- Open `frontend/index.html` in Chrome or Edge browser
- Note: Some features may not work with `file://` protocol, so using a server is recommended

## Using Voice Recognition

1. **Click "🎤 Start Voice"** button
2. **Say a move** in natural language:
   - "e4"
   - "knight f3"
   - "castle kingside"
   - "e takes d5"
3. The move will be parsed and executed automatically
4. Analysis will appear showing:
   - Top 5 engine moves
   - Master games data (if available)

## Troubleshooting

### Voice recognition not working
- **Use Chrome or Edge** - Web Speech API support is best in these browsers
- **Check microphone permissions** - Allow microphone access when prompted
- **Speak clearly** - Try saying moves in standard notation (e.g., "e4" instead of "pawn to e4")

### Backend not starting
- **Check Python version**: `python --version` (need 3.8+)
- **Check dependencies**: `pip list` to verify packages installed
- **Check Stockfish path**: Verify `stockfish.exe` exists in `backend/stockfish/`

### No engine analysis
- **Verify backend is running**: Check `http://127.0.0.1:8000/api/health/`
- **Check browser console**: Open DevTools (F12) and look for errors
- **Verify CORS**: Backend should allow all origins for local development

### Master games not showing
- **Check file path**: Verify JSON file exists in one of the expected locations
- **Check file format**: Should be valid JSON with position data
- **Not critical**: App works without master games, just won't show that data

## Example Voice Commands

- "e4" → Plays e4
- "knight f3" → Plays Nf3
- "castle kingside" → Castles kingside
- "e takes d5" → Plays exd5
- "queen e2" → Plays Qe2
- "resign" → Resigns the game

## Next Steps

- Try different positions and see the engine analysis
- Compare your moves with master games
- Use the board controls to reset, undo, or flip the board
- Experiment with voice commands to find what works best for you


