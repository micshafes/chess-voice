# GitHub Setup Guide

Follow these steps to get your chess-voice project on GitHub:

## 1. Initialize Git Repository

```bash
cd chess-voice
git init
```

## 2. Add All Files

```bash
git add .
```

Note: `stockfish.exe` is excluded by `.gitignore` since it's large and platform-specific. Users will need to download it separately.

## 3. Create Initial Commit

```bash
git commit -m "Initial commit: Voice-controlled chess analysis app"
```

## 4. Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository (e.g., `chess-voice`)
3. **Don't** initialize with README, .gitignore, or license (we already have these)

## 5. Connect and Push

```bash
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/chess-voice.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## 6. Clone on Your Laptop

Once pushed, you can clone it on your laptop:

```bash
git clone https://github.com/YOUR_USERNAME/chess-voice.git
cd chess-voice
```

Then follow the installation steps in README.md:
1. Install dependencies: `pip install -r backend/requirements.txt`
2. **Windows users**: Stockfish is already included! No action needed.
   **Linux/Mac users**: Download Stockfish from https://stockfishchess.org/download/ and place it in `backend/stockfish/`
3. Run `python start_backend.py` and `python serve.py`

## Notes

- The `stockfish.exe` file **is** included in the repository for Windows users
- Linux/Mac users will need to download Stockfish from https://stockfishchess.org/download/ and place it in `backend/stockfish/`
- All code, configuration files, and Windows Stockfish executable are included

