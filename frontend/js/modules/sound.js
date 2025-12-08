// ===========================
// Sound Effects Module
// ===========================

import { CONFIG } from '../config.js';
import { state } from '../state.js';

/**
 * Initialize sound effects
 */
export function initializeSounds() {
    try {
        // Use Lichess open-source sound files
        state.sounds.move = new Audio(CONFIG.SOUND.URLS.MOVE);
        state.sounds.capture = new Audio(CONFIG.SOUND.URLS.CAPTURE);
        state.sounds.outOfBook = new Audio(CONFIG.SOUND.URLS.OUT_OF_BOOK);

        [state.sounds.move, state.sounds.capture, state.sounds.outOfBook].forEach(audio => {
            audio.crossOrigin = 'anonymous';
            audio.preload = 'auto';
        });
        
        // Preload sounds
        state.sounds.move.load();
        state.sounds.capture.load();
        state.sounds.outOfBook.load();
        
        // Set volume
        state.sounds.move.volume = CONFIG.SOUND.VOLUME.MOVE;
        state.sounds.capture.volume = CONFIG.SOUND.VOLUME.CAPTURE;
        state.sounds.outOfBook.volume = CONFIG.SOUND.VOLUME.OUT_OF_BOOK;
        
        console.log('Sounds initialized');
    } catch (error) {
        console.log('Could not initialize sounds:', error);
        state.soundEnabled = false;
    }
}

/**
 * Play the out-of-book notification sound
 */
export function playOutOfBookSound() {
    if (!state.soundEnabled || !state.sounds.outOfBook) return;
    
    try {
        state.sounds.outOfBook.currentTime = 0;
        state.sounds.outOfBook.play().catch(e => {
            console.log('Could not play out of book sound:', e);
        });
    } catch (error) {
        console.log('Error playing out of book sound:', error);
    }
}

/**
 * Play move or capture sound
 * @param {Object} options - Options object
 * @param {boolean} options.isCapture - Whether the move is a capture
 */
export function playMoveSound({ isCapture = false } = {}) {
    if (!state.soundEnabled) return;
    
    try {
        let sound = state.sounds.move;
        if (isCapture && state.sounds.capture) {
            sound = state.sounds.capture;
        }
        
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => {
                // Browser autoplay policy may block - that's ok
            });
        }
    } catch (error) {
        // Silently handle errors
    }
}

/**
 * Toggle sound on/off
 */
export function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    updateSoundButton();
    
    // Play a test sound when enabling
    if (state.soundEnabled) {
        setTimeout(() => playMoveSound(), 100);
    }
}

/**
 * Update the sound button UI state
 */
export function updateSoundButton() {
    const btn = document.getElementById('soundBtn');
    if (!btn) return;
    
    if (state.soundEnabled) {
        btn.classList.remove('muted');
        btn.title = 'Sound on (click to mute)';
    } else {
        btn.classList.add('muted');
        btn.title = 'Sound off (click to unmute)';
    }
}

