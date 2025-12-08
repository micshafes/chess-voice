# Quick Start Guide

## Prerequisites Check

1. **Python 3.8+** installed
2. **Stockfish executable** available (included for Windows, see setup for other OS)
3. **Internet connection** for Lichess master games API

## Setup Steps

### 1. Install Dependencies

```bash
cd chess-voice/backend
pip install -r requirements.txt
```

### 2. Set Up Stockfish

**Windows users:** Stockfish is already included at `backend/stockfish/stockfish.exe`

**Linux/Mac users:**
- Download from https://stockfishchess.org/download/
- Place executable in `chess-voice/backend/stockfish/`
- Make it executable: `chmod +x backend/stockfish/stockfish`

### 3. Master Games (No Setup Needed!)

Master games data is fetched live from the **Lichess Opening Explorer API** - no local database required!

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
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

The backend will start on `http://127.0.0.1:8001`

### Start the Frontend

**Use the Python server (recommended):**
```bash
python serve.py
```

This will start the frontend on `http://localhost:8000` and open it in your browser.

> **Note:** Opening `index.html` directly won't work because the app uses ES Modules which require a web server.

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
- **Verify backend is running**: Check `http://127.0.0.1:8001/api/health/`
- **Check browser console**: Open DevTools (F12) and look for errors
- **Verify CORS**: Backend should allow all origins for local development

### Master games not showing
- **Check internet connection**: Master games are fetched from Lichess API
- **Check browser console**: Look for network errors (F12 → Network tab)
- **Position may not exist**: Many positions won't have master game data

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


