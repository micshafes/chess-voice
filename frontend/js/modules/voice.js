// ===========================
// Voice Recognition Module
// ===========================

import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { parseAndMakeMove } from './moves.js';

/**
 * Initialize voice recognition
 */
export function initializeVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        document.getElementById('voiceStatus').textContent = 
            'Voice recognition not supported in this browser. Please use Chrome or Edge.';
        document.getElementById('voiceBtn').disabled = true;
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    state.recognition = new SpeechRecognition();
    
    state.recognition.continuous = CONFIG.VOICE.CONTINUOUS;
    state.recognition.interimResults = CONFIG.VOICE.INTERIM_RESULTS;
    state.recognition.lang = CONFIG.VOICE.LANGUAGE;
    state.recognition.maxAlternatives = CONFIG.VOICE.MAX_ALTERNATIVES;
    
    state.recognition.onstart = handleRecognitionStart;
    state.recognition.onresult = handleRecognitionResult;
    state.recognition.onerror = handleRecognitionError;
    state.recognition.onend = handleRecognitionEnd;
    
    // Check microphone permission on init
    checkMicrophonePermission();
}

/**
 * Handle recognition start event
 */
function handleRecognitionStart() {
    state.isListening = true;
    state.recognitionRestarting = false;
    state.lastRecognitionStart = Date.now();
    updateVoiceUI();
    document.getElementById('voiceStatus').textContent = 'Listening... Say a move!';
}

/**
 * Handle recognition result event
 */
function handleRecognitionResult(event) {
    const transcript = event.results[0][0].transcript.trim();
    document.getElementById('voiceTranscript').textContent = `Heard: "${transcript}"`;
    
    // Mark that we're processing a command
    state.isProcessingVoiceCommand = true;
    
    // Stop recognition immediately to prevent appending new speech
    try {
        state.recognition.stop();
    } catch (e) {
        console.log('Could not stop recognition after result:', e);
    }
    
    // Parse and make move
    setTimeout(() => {
        parseAndMakeMove(transcript);
        // Clear the flag after a delay
        setTimeout(() => {
            state.isProcessingVoiceCommand = false;
            
            // If not speaking, restart recognition
            if (!state.isSpeaking) {
                restartRecognitionAfterCommand();
            }
        }, 100);
    }, 50);
}

/**
 * Restart recognition after processing a command
 */
function restartRecognitionAfterCommand() {
    const btn = document.getElementById('voiceBtn');
    if (btn.classList.contains('listening')) {
        state.isListening = false;
        
        setTimeout(() => {
            if (!state.isSpeaking && btn.classList.contains('listening')) {
                try {
                    state.recognition.start();
                    state.isListening = true;
                    console.log('Restarted recognition after command processing');
                } catch (e) {
                    console.log('Could not restart recognition after command:', e);
                    // Try again after a longer delay
                    setTimeout(() => {
                        if (!state.isSpeaking && btn.classList.contains('listening')) {
                            try {
                                state.recognition.start();
                                state.isListening = true;
                                console.log('Restarted recognition on retry');
                            } catch (e2) {
                                console.error('Failed to restart recognition:', e2);
                            }
                        }
                    }, 300);
                }
            }
        }, 100);
    }
}

/**
 * Handle recognition error event
 */
function handleRecognitionError(event) {
    console.error('Speech recognition error:', event.error);
    
    // Don't update UI if we're speaking or processing
    if (state.isSpeaking || state.isProcessingVoiceCommand) {
        console.log('Recognition error while speaking/processing - ignoring:', event.error);
        return;
    }
    
    switch (event.error) {
        case 'aborted':
            console.log('Recognition aborted, will restart...');
            return;
        case 'no-speech':
            document.getElementById('voiceStatus').textContent = 'No speech detected. Try again.';
            break;
        case 'audio-capture':
            document.getElementById('voiceStatus').textContent = 
                'No microphone found. Please check your microphone.';
            break;
        case 'not-allowed':
            document.getElementById('voiceStatus').textContent = 
                'Microphone access denied. Please allow microphone access.';
            document.getElementById('voiceBtn').classList.remove('listening');
            break;
        case 'network':
            document.getElementById('voiceStatus').textContent = 
                'Network error. Please check your connection.';
            break;
        default:
            document.getElementById('voiceStatus').textContent = 
                `Error: ${event.error}. Click to try again.`;
    }
    
    state.isListening = false;
    updateVoiceUI();
}

/**
 * Handle recognition end event
 */
function handleRecognitionEnd() {
    const btn = document.getElementById('voiceBtn');
    
    // Don't update UI or restart if speaking or processing
    if (state.isSpeaking || state.isProcessingVoiceCommand) {
        console.log('Recognition ended while speaking/processing - will resume after');
        return;
    }
    
    state.isListening = false;
    updateVoiceUI();
    
    if (btn.classList.contains('listening') && !state.recognitionRestarting) {
        // Restart quickly for short commands
        const timeSinceStart = Date.now() - state.lastRecognitionStart;
        const delay = Math.max(
            CONFIG.VOICE.RESTART_DELAY_MIN, 
            CONFIG.VOICE.RESTART_DELAY_MAX - timeSinceStart
        );
        
        state.recognitionRestarting = true;
        
        setTimeout(() => {
            if (btn.classList.contains('listening') && !state.isSpeaking) {
                try {
                    state.recognition.start();
                } catch (e) {
                    console.log('Could not restart recognition:', e);
                    setTimeout(() => {
                        if (btn.classList.contains('listening') && !state.isSpeaking) {
                            try {
                                state.recognition.start();
                            } catch (e2) {
                                console.error('Failed to restart recognition:', e2);
                                btn.classList.remove('listening');
                                document.getElementById('voiceStatus').textContent = 
                                    'Voice recognition stopped. Click to restart.';
                            }
                        }
                    }, 500);
                }
            }
            state.recognitionRestarting = false;
        }, delay);
    } else if (!btn.classList.contains('listening')) {
        document.getElementById('voiceStatus').textContent = 'Click to start voice recognition';
    }
}

/**
 * Toggle voice recognition on/off
 */
export function toggleVoiceRecognition() {
    if (!state.recognition) {
        alert('Voice recognition not available');
        return;
    }
    
    const btn = document.getElementById('voiceBtn');
    
    if (state.isListening || btn.classList.contains('listening')) {
        try {
            state.recognition.stop();
        } catch (e) {
            console.log('Error stopping recognition:', e);
        }
        btn.classList.remove('listening');
        state.recognitionRestarting = false;
        document.getElementById('voiceStatus').textContent = 'Voice recognition stopped';
    } else {
        try {
            state.recognition.start();
            btn.classList.add('listening');
        } catch (e) {
            console.error('Error starting recognition:', e);
            try {
                state.recognition.stop();
                setTimeout(() => {
                    try {
                        state.recognition.start();
                        btn.classList.add('listening');
                    } catch (e2) {
                        document.getElementById('voiceStatus').textContent = 
                            'Could not start voice recognition. Please refresh the page.';
                    }
                }, 500);
            } catch (e2) {
                document.getElementById('voiceStatus').textContent = 
                    'Could not start voice recognition. Please refresh the page.';
            }
        }
    }
}

/**
 * Update the voice button UI
 */
export function updateVoiceUI() {
    const btn = document.getElementById('voiceBtn');
    const btnText = document.getElementById('voiceBtnText');
    
    if (state.isPaused) {
        btnText.textContent = '⏸️ Paused';
        btn.classList.add('paused');
    } else if (state.isListening) {
        btnText.textContent = '🎤 Listening...';
        btn.classList.remove('paused');
    } else {
        btnText.textContent = '🎤 Start Voice';
        btn.classList.remove('paused');
    }
}

/**
 * Update the pause mode UI
 */
export function updatePauseUI() {
    const btn = document.getElementById('voiceBtn');
    const btnText = document.getElementById('voiceBtnText');
    
    if (state.isPaused) {
        btnText.textContent = '⏸️ Paused (say "resume")';
        btn.classList.add('paused');
    } else {
        btn.classList.remove('paused');
        if (state.isListening || btn.classList.contains('listening')) {
            btnText.textContent = '🎤 Listening...';
            btn.classList.add('listening');
        }
    }
}

/**
 * Check microphone permission
 */
function checkMicrophonePermission() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                stream.getTracks().forEach(track => track.stop());
                console.log('Microphone permission granted');
            })
            .catch(err => {
                console.log('Microphone permission check:', err.name);
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    document.getElementById('voiceStatus').textContent = 
                        'Microphone access needed. Click the button to enable.';
                }
            });
    }
}

