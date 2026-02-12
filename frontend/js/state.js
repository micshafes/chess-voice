// ===========================
// Centralized State Management
// ===========================

/**
 * Global application state
 * All modules read/write to this shared state object
 */
export const state = {
    // Chess game instances
    board: null,
    game: null,
    
    // Voice recognition
    recognition: null,
    isListening: false,
    isPaused: false,
    isProcessingVoiceCommand: false,
    recognitionRestarting: false,
    lastRecognitionStart: 0,
    
    // Speech synthesis
    isSpeaking: false,
    /** When true, engine/grandmaster move announcements are muted */
    announceMuted: false,
    
    // Sound
    soundEnabled: true,
    sounds: {
        move: null,
        capture: null,
        outOfBook: null,
    },
    
    // Engine play mode
    enginePlaysColor: null,  // null = analysis mode, 'w' = engine plays white, 'b' = engine plays black
    grandmasterMode: false,
    engineStrength: 2000,  // Engine strength rating: 1000, 1500, 2000, or 2500
    
    // Analysis data (stored for voice commands and engine play)
    lastEngineMoves: [],
    lastMasterMoves: [],
    lastTopGames: [],
    lastGrandmasterInfo: null,
    
    // Book tracking
    wasInBook: true,
    masterGamesLoaded: false,  // True when master games API has responded for current position
    
    // Analysis state
    currentAnalysisFen: null,
    currentAnalysisDepth: 0,
    currentAnalysisController: null,
    
    // Position cache stack - stores analysis data for each position in current game path
    // Each entry: { fen, engineMoves, masterMoves, masterData, depth }
    // Stack grows as we make moves, shrinks on undo
    positionStack: [],
};

/**
 * Reset state to initial values (useful for testing or game reset)
 */
export function resetAnalysisState() {
    state.lastEngineMoves = [];
    state.lastMasterMoves = [];
    state.lastTopGames = [];
    state.lastGrandmasterInfo = null;
    state.wasInBook = true;
    state.masterGamesLoaded = false;
    state.currentAnalysisFen = null;
    state.currentAnalysisDepth = 0;
    state.positionStack = [];  // Clear position cache
    if (state.currentAnalysisController) {
        state.currentAnalysisController.abort();
        state.currentAnalysisController = null;
    }
}

