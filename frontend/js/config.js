// ===========================
// Configuration
// ===========================

export const CONFIG = {
    API_BASE_URL: 'http://127.0.0.1:8001/api',
    
    ENGINE: {
        DEFAULT_DEPTH: 15,
        NUM_TOP_MOVES: 5,
        ANALYSIS_DEPTHS: [12, 16, 20],
    },
    
    BOARD: {
        PIECE_THEME: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
        ANIMATION: {
            APPEAR_SPEED: 100,
            MOVE_SPEED: 150,
            SNAP_SPEED: 50,
            TRASH_SPEED: 100,
        },
        MAX_SIZE: 500,
    },
    
    VOICE: {
        LANGUAGE: 'en-US',
        CONTINUOUS: false,
        INTERIM_RESULTS: false,
        MAX_ALTERNATIVES: 1,
        RESTART_DELAY_MIN: 100,
        RESTART_DELAY_MAX: 200,
    },
    
    SOUND: {
        URLS: {
            MOVE: 'https://lichess1.org/assets/sound/standard/Move.mp3',
            CAPTURE: 'https://lichess1.org/assets/sound/standard/Capture.mp3',
            OUT_OF_BOOK: 'https://lichess1.org/assets/sound/standard/GenericNotify.mp3',
        },
        VOLUME: {
            MOVE: 0.5,
            CAPTURE: 0.5,
            OUT_OF_BOOK: 0.6,
        },
    },
    
    SPEECH: {
        RATE: 0.9,
        PITCH: 1,
        RESUME_DELAY: 300,
    },
    
    TIMING: {
        ENGINE_THINK_DELAY: 800,
        ENGINE_MOVE_DELAY: 600,
        SOUND_BEFORE_SPEECH: 400,
        AFTER_SPEECH_DELAY: 500,
        ANALYSIS_INTERVAL: 100,
    },
    
    STORAGE_KEYS: {
        THEME: 'chess-voice-theme',
    },
};

