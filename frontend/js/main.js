// ===========================
// Main Entry Point
// ===========================

import { state } from './state.js';
import { initializeBoard } from './modules/board.js';
import { initializeSounds } from './modules/sound.js';
import { initializeVoiceRecognition } from './modules/voice.js';
import { setupEventListeners, initializeUI } from './modules/ui.js';
import { updateStatus } from './modules/api.js';

/**
 * Initialize the application
 * Waits for all required libraries to load before starting
 */
function initializeApp() {
    // Check if all required libraries are loaded
    if (typeof Chess === 'undefined') {
        console.error('Chess.js library not loaded!');
        setTimeout(initializeApp, 100);
        return;
    }
    
    if (typeof Chessboard === 'undefined') {
        console.error('Chessboard.js library not loaded!');
        setTimeout(initializeApp, 100);
        return;
    }
    
    if (typeof $ === 'undefined') {
        console.error('jQuery library not loaded!');
        setTimeout(initializeApp, 100);
        return;
    }
    
    console.log('All libraries loaded, initializing app...');
    
    // Initialize chess game
    try {
        state.game = new Chess();
        console.log('Chess game initialized');
    } catch (error) {
        console.error('Error initializing Chess:', error);
        alert('Error initializing chess game. Please refresh the page.');
        return;
    }
    
    // Initialize all modules
    initializeBoard();
    initializeVoiceRecognition();
    initializeSounds();
    setupEventListeners();
    updateStatus();
    initializeUI();
    
    console.log('Application initialized successfully');
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Export for potential external use
export { initializeApp };

