// ===========================
// Speech Synthesis Module
// ===========================

import { CONFIG } from '../config.js';
import { state } from '../state.js';

/**
 * Speak a chess move using text-to-speech
 * @param {string} moveText - The move in chess notation (e.g., "Nf3", "O-O")
 * @param {{ fromEngine?: boolean }} [options] - If fromEngine is true, respect announceMuted
 * @returns {Promise} Resolves when speech is complete
 */
export function speakMove(moveText, options = {}) {
    return new Promise((resolve) => {
        if (state.announceMuted && options.fromEngine) {
            resolve();
            return;
        }
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech and ensure not paused (Chrome bug workaround)
            window.speechSynthesis.cancel();
            window.speechSynthesis.resume();
            
            // Set isSpeaking BEFORE stopping recognition to prevent onend handler from updating UI
            const wasListening = state.isListening;
            state.isSpeaking = true;
            
            // Pause voice recognition while speaking
            if (state.recognition && wasListening) {
                try {
                    state.recognition.stop();
                } catch (e) {
                    console.log('Could not stop recognition for speech:', e);
                }
            }
            
            // Convert chess notation to spoken words
            let spoken = moveText
                .replace(/K/g, 'King ')
                .replace(/Q/g, 'Queen ')
                .replace(/R/g, 'Rook ')
                .replace(/B/g, 'Bishop ')
                .replace(/N/g, 'Knight ')
                .replace(/x/g, ' takes ')
                .replace(/\+/g, ', check')
                .replace(/#/g, ', checkmate')
                .replace(/O-O-O/g, 'queenside castle')
                .replace(/O-O/g, 'kingside castle')
                .replace(/=/g, ' promotes to ');
            
            // Add spaces between letters and numbers for clarity
            spoken = spoken.replace(/([a-h])([1-8])/g, '$1 $2');
            
            const utterance = new SpeechSynthesisUtterance(spoken);
            utterance.rate = CONFIG.SPEECH.RATE;
            utterance.pitch = CONFIG.SPEECH.PITCH;
            
            utterance.onend = () => {
                state.isSpeaking = false;
                state.isProcessingVoiceCommand = false;
                // Resume voice recognition after a short delay
                setTimeout(() => {
                    resumeRecognitionAfterSpeech(wasListening);
                    resolve();
                }, CONFIG.SPEECH.RESUME_DELAY);
            };
            
            utterance.onerror = () => {
                state.isSpeaking = false;
                state.isProcessingVoiceCommand = false;
                setTimeout(() => {
                    resumeRecognitionAfterSpeech(wasListening);
                    resolve();
                }, CONFIG.SPEECH.RESUME_DELAY);
            };
            
            window.speechSynthesis.speak(utterance);
        } else {
            resolve();
        }
    });
}

/**
 * Resume voice recognition after speech synthesis completes
 * @param {boolean} wasListening - Whether recognition was active before speech
 */
function resumeRecognitionAfterSpeech(wasListening) {
    const btn = document.getElementById('voiceBtn');
    // Restart if we were listening before OR if button still shows listening state
    if (wasListening || btn.classList.contains('listening')) {
        try {
            state.recognition.start();
            btn.classList.add('listening');
            state.isListening = true;
            console.log('Restarted recognition after speech');
        } catch (e) {
            console.log('Could not restart recognition after speech:', e);
            // Retry after a longer delay
            setTimeout(() => {
                if (btn.classList.contains('listening')) {
                    try {
                        state.recognition.start();
                        state.isListening = true;
                        console.log('Restarted recognition on retry after speech');
                    } catch (e2) {
                        console.error('Failed to restart recognition after speech:', e2);
                    }
                }
            }, 300);
        }
    }
}

/**
 * Speak a simple message (not a chess move)
 * @param {string} text - The text to speak
 * @param {{ fromEngine?: boolean }} [options] - If fromEngine is true, respect announceMuted
 * @returns {Promise} Resolves when speech is complete
 */
export function speakText(text, options = {}) {
    return new Promise((resolve) => {
        if (state.announceMuted && options.fromEngine) {
            resolve();
            return;
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            window.speechSynthesis.resume();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1;
            utterance.volume = 0.7;
            utterance.onend = resolve;
            utterance.onerror = resolve;
            window.speechSynthesis.speak(utterance);
        } else {
            resolve();
        }
    });
}

