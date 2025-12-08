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
    
    // Analysis data (stored for voice commands and engine play)
    lastEngineMoves: [],
    lastMasterMoves: [],
    lastTopGames: [],
    lastGrandmasterInfo: null,
    
    // Book tracking
    wasInBook: true,
    
    // Analysis state
    currentAnalysisFen: null,
    currentAnalysisDepth: 0,
    currentAnalysisController: null,
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
    state.currentAnalysisFen = null;
    state.currentAnalysisDepth = 0;
    if (state.currentAnalysisController) {
        state.currentAnalysisController.abort();
        state.currentAnalysisController = null;
    }
}

