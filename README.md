# Chess Voice

A voice-controlled chess analysis application that allows you to analyze chess positions using your voice. The application integrates Stockfish engine analysis and a master games database to provide real-time feedback on chess positions.

## Features

- 🎤 **Voice Recognition**: Speak chess moves naturally (e.g., "e4", "knight f3", "castle kingside")
- 🤖 **Stockfish Integration**: Get top engine moves with evaluations for any position
- 📚 **Lichess Master Games**: Query Lichess Opening Explorer to see what moves masters played in similar positions
- 🎯 **Interactive Board**: Drag-and-drop or voice-controlled move input
- 📊 **Real-time Analysis**: Automatic analysis after each move
- 🔊 **Sound Effects**: Move and capture sounds (toggleable via button or voice)

## Prerequisites

- Python 3.8+
- Stockfish executable (download from https://stockfishchess.org/download/ or copy from another project)
- Internet connection (for Lichess API)
- Modern web browser with Web Speech API support (Chrome, Edge recommended)
- Lichess OAuth token (required for Lichess master games / opening explorer API)

## Installation

1. **Install Python dependencies:**
   ```bash
   cd chess-voice/backend
   pip install -r requirements.txt
   ```

2. **Stockfish is included!**
   - The repository includes `stockfish.exe` for Windows users
   - It's located in `backend/stockfish/stockfish.exe`
   - **Linux/Mac users**: Download Stockfish from https://stockfishchess.org/download/ and place it in `backend/stockfish/`
   - On Linux/Mac, make it executable: `chmod +x backend/stockfish/stockfish`

3. **No additional setup needed!** The app uses Lichess API for master games, so no local database is required.

## Running the Application

### Quick Start (Recommended)

1. **Start the backend:**
   ```bash
   cd chess-voice
   python start_backend.py
   ```
   Or on Windows, double-click `start_backend.bat`
   
   This will start the backend API on `http://127.0.0.1:8001/api`

2. **(One-time) Create and set your Lichess OAuth token (for master games)**
   
   Lichess now requires OAuth authentication for the Opening Explorer “masters” API.
   
   1. Create a token here: [https://lichess.org/account/oauth/token/create](https://lichess.org/account/oauth/token/create)
   2. Sign in to Lichess (and complete 2FA if prompted).
   3. Add a description for the token.
   4. If there is a “scopes” selector, choose the API/bot scope available for API access (commonly `bot:play` / “Play games with the bot API”).
   5. Generate the token and copy it immediately (Lichess won’t show it again later).
   
   **Where to store it (for local dev / sharing the repo):**
   - Preferred: set environment variable `LICHESS_OAUTH_TOKEN` to the token value, or
   - Use this repo’s file-based option: create `backend/lichess_oauth.txt` containing only the token (no quotes).
   
   This repo’s `start_backend.py` / `start_backend.bat` will automatically load `backend/lichess_oauth.txt` into `LICHESS_OAUTH_TOKEN` if the env var isn’t set. The token file is gitignored to avoid committing secrets.

3. **Start the frontend (in a new terminal):**
   ```bash
   cd chess-voice
   python serve.py
   ```
   
   This will start the frontend on `http://localhost:8000` and open it in your browser.

### Alternative: All-in-One

The `serve.py` script will try to start the backend automatically, but you may need to start it manually if it fails:

```bash
cd chess-voice
python serve.py
```

If the backend doesn't start automatically, start it manually using `start_backend.py` or `start_backend.bat`.

## Usage

1. **Voice Control:**
   - Click the "🎤 Start Voice" button
   - Say a move (e.g., "e4", "knight f3", "castle kingside")
   - The move will be parsed and executed automatically

2. **Manual Control:**
   - Drag and drop pieces on the board
   - Use the control buttons to reset, undo, or flip the board

3. **Analysis:**
   - After each move, the application automatically:
     - Shows top 5 engine moves with evaluations
     - Displays Lichess master games statistics (win/draw/loss percentages, game counts)

## Voice Commands

The voice recognition supports various formats:
- **Standard notation**: "e4", "Nf3", "exd5"
- **Spoken notation**: "knight f3", "e takes d5"
- **Special moves**: "castle kingside", "castle queenside"
- **Square-to-square**: "e2 to e4"
- **Board controls**: "reset", "flip", "undo"
- **Sound controls**: "sound on", "sound off"

## API Endpoints

- `GET /api/top-moves/?fen=<FEN>&depth=15&num_moves=5` - Get top engine moves
- `GET /api/evaluation/?fen=<FEN>` - Get position evaluation
- `GET /api/master-moves/?fen=<FEN>` - Get master games data
- `GET /api/health/` - Health check

## Project Structure

```
chess-voice/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── stockfish_config.py     # Stockfish configuration
│   ├── routes/                 # API routes
│   │   ├── engine.py          # Engine analysis endpoints
│   │   ├── master_games.py    # Master games endpoints
│   │   └── health_check.py    # Health check
│   ├── services/               # Business logic
│   │   ├── engine_service.py  # Stockfish integration
│   │   └── master_games_service.py  # Master games lookup
│   └── requirements.txt        # Python dependencies
└── frontend/
    ├── index.html              # Main HTML file
    ├── css/
    │   └── styles.css          # Styling
    └── js/
        ├── main.js             # Application entry point
        ├── config.js           # Configuration constants
        ├── state.js            # Centralized state management
        └── modules/
            ├── api.js          # API calls & data display
            ├── board.js        # Chessboard setup & controls
            ├── commands.js     # Voice correction dictionary
            ├── engine.js       # Engine play mode logic
            ├── moves.js        # Move parsing & execution
            ├── sound.js        # Audio effects
            ├── speech.js       # Text-to-speech synthesis
            ├── ui.js           # DOM updates & theme
            └── voice.js        # Voice recognition
```

## Frontend Architecture

The frontend uses **ES Modules** for maintainability:

| Module | Purpose |
|--------|---------|
| `main.js` | Entry point, initializes all modules |
| `config.js` | API URLs, timing values, feature flags |
| `state.js` | Single source of truth for app state |
| `modules/api.js` | Fetches engine & master game data |
| `modules/board.js` | Chessboard.js wrapper, move handling |
| `modules/commands.js` | Voice recognition error corrections |
| `modules/engine.js` | Engine vs player game mode |
| `modules/moves.js` | Parses voice input into chess moves |
| `modules/sound.js` | Move, capture, and notification sounds |
| `modules/speech.js` | Speaks moves aloud |
| `modules/ui.js` | Theme toggle, modals, event listeners |
| `modules/voice.js` | Web Speech API integration |

## Troubleshooting

- **Voice recognition not working**: Make sure you're using Chrome or Edge browser
- **Stockfish errors**: Verify that Stockfish executable is in `backend/stockfish/` directory
- **Master games not loading**: Check your internet connection (requires Lichess API access)
  - If you see `401 Unauthorized` for Lichess master games, set `LICHESS_OAUTH_TOKEN` in your environment before starting the backend.
- **CORS errors**: The backend allows all origins by default for local development

## License

This project uses components from:
- chessboard.js (MIT License)
- chess.js (MIT License)
- Stockfish (GPL v3)


