// ===========================
// Engine Play Mode Module
// ===========================

import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { playMoveSound, playOutOfBookSound } from './sound.js';
import { speakMove, speakText } from './speech.js';
import { analyzePosition, updateStatus } from './api.js';

/**
 * Weighted random selection from items based on weights
 * @param {Array} items - Items to select from
 * @param {Array} weights - Corresponding weights
 * @returns {*} Selected item
 */
export function weightedRandomSelect(items, weights) {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) return items[0];
    
    const normalizedWeights = weights.map(w => w / totalWeight);
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < items.length; i++) {
        cumulative += normalizedWeights[i];
        if (random <= cumulative) {
            return items[i];
        }
    }
    
    return items[items.length - 1];
}

/**
 * Select a move for the engine to play
 * @returns {Object|null} Selected move with source info
 */
export function selectEnginePlayMove() {
    // Priority 1: Use master games if available
    if (state.lastMasterMoves && state.lastMasterMoves.length > 0) {
        const moves = state.lastMasterMoves.map(m => m.move);
        
        let selectedMove;
        let grandmasterInfo = null;
        
        if (state.grandmasterMode) {
            // Grandmaster mode: select from moves in top games
            let availableMoves = moves;
            
            if (state.lastTopGames && state.lastTopGames.length > 0) {
                const movesInTopGames = [...new Set(state.lastTopGames.map(g => g.move).filter(Boolean))];
                if (movesInTopGames.length > 0) {
                    availableMoves = movesInTopGames.filter(m => moves.includes(m));
                    if (availableMoves.length === 0) {
                        availableMoves = moves;
                    }
                }
            }
            
            const moveIndex = Math.floor(Math.random() * availableMoves.length);
            selectedMove = availableMoves[moveIndex];
            
            // Find a game that played this move
            if (state.lastTopGames && state.lastTopGames.length > 0 && state.game && state.enginePlaysColor) {
                const gamesWithMove = state.lastTopGames.filter(g => g.move === selectedMove);
                
                if (gamesWithMove.length > 0) {
                    const selectedGame = gamesWithMove[Math.floor(Math.random() * gamesWithMove.length)];
                    const isWhiteMove = state.enginePlaysColor === 'w';
                    grandmasterInfo = {
                        name: isWhiteMove ? selectedGame.white_name : selectedGame.black_name,
                        rating: isWhiteMove ? selectedGame.white_rating : selectedGame.black_rating,
                        color: isWhiteMove ? 'white' : 'black',
                        move: selectedMove
                    };
                    console.log('Grandmaster mode: selected', selectedMove, 'played by', grandmasterInfo.name, grandmasterInfo.rating);
                }
            }
        } else {
            // Normal mode: weighted by game count
            const weights = state.lastMasterMoves.map(m => m.total || 1);
            selectedMove = weightedRandomSelect(moves, weights);
            console.log('Selecting from master moves (weighted):', moves, weights);
        }
        
        state.lastGrandmasterInfo = grandmasterInfo;
        
        if (state.grandmasterMode && !grandmasterInfo) {
            clearGrandmasterDisplay();
        }
        
        state.wasInBook = true;
        return { move: selectedMove, fromBook: true };
    }
    
    // Priority 2: Use engine moves
    if (state.lastEngineMoves && state.lastEngineMoves.length > 0) {
        const justLeftBook = state.wasInBook && state.enginePlaysColor;
        state.wasInBook = false;
        state.lastGrandmasterInfo = null;
        
        const moves = state.lastEngineMoves.map(m => m.move);
        
        // Exponential weighting - best moves much more likely
        const weights = state.lastEngineMoves.map((m, index) => {
            return Math.pow(2, state.lastEngineMoves.length - index);
        });
        
        console.log('Selecting from engine moves:', moves, weights);
        return { move: weightedRandomSelect(moves, weights), fromBook: false, justLeftBook };
    }
    
    return null;
}

/**
 * Make engine move if it's the engine's turn
 */
export async function makeEngineMoveIfNeeded() {
    if (!state.enginePlaysColor || !state.game) return;
    
    if (state.game.turn() !== state.enginePlaysColor) return;
    
    // Pause voice recognition while engine is "thinking"
    const wasListeningBefore = state.isListening || document.getElementById('voiceBtn').classList.contains('listening');
    if (state.recognition && wasListeningBefore) {
        try {
            state.recognition.stop();
        } catch (e) {
            console.log('Could not pause recognition for engine move:', e);
        }
    }
    state.isSpeaking = true;
    
    // Wait for analysis to complete
    await new Promise(resolve => setTimeout(resolve, CONFIG.TIMING.ENGINE_THINK_DELAY));
    
    const selection = selectEnginePlayMove();
    
    if (selection && selection.move) {
        console.log('Engine playing:', selection.move, selection.fromBook ? '(from book)' : '(engine)');
        
        // Announce leaving book
        if (selection.justLeftBook) {
            console.log('Left opening book - playing notification');
            playOutOfBookSound();
            
            await speakText('Out of book');
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        try {
            const result = state.game.move(selection.move);
            if (result) {
                playMoveSound({ isCapture: result.captured !== undefined });
                
                if (state.board) {
                    requestAnimationFrame(() => {
                        state.board.position(state.game.fen());
                    });
                }
                
                updateStatus();
                const source = selection.fromBook ? '(book)' : '(engine)';
                let statusText = `Engine played: ${result.san} ${source}`;
                
                if (state.grandmasterMode && selection.fromBook && state.lastGrandmasterInfo) {
                    statusText += ` (${state.lastGrandmasterInfo.name} ${state.lastGrandmasterInfo.rating})`;
                    updateGrandmasterDisplay(state.lastGrandmasterInfo);
                } else {
                    clearGrandmasterDisplay();
                }
                
                document.getElementById('voiceStatus').textContent = statusText;
                
                // Wait for move sound then speak
                await new Promise(resolve => setTimeout(resolve, CONFIG.TIMING.SOUND_BEFORE_SPEECH));
                await speakMove(result.san);
                
                state.isSpeaking = false;
                await new Promise(resolve => setTimeout(resolve, CONFIG.TIMING.AFTER_SPEECH_DELAY));
                
                if (wasListeningBefore && document.getElementById('voiceBtn').classList.contains('listening')) {
                    try {
                        state.recognition.start();
                    } catch (e) {
                        console.log('Could not resume recognition after engine move:', e);
                    }
                }
                
                analyzePosition();
            }
        } catch (error) {
            console.error('Error making engine move:', error);
            state.isSpeaking = false;
        }
    } else {
        document.getElementById('voiceStatus').textContent = 'Engine has no moves available.';
        state.isSpeaking = false;
        
        if (wasListeningBefore && document.getElementById('voiceBtn').classList.contains('listening')) {
            try {
                state.recognition.start();
            } catch (e) {
                console.log('Could not resume recognition:', e);
            }
        }
    }
}

/**
 * Set engine mode
 * @param {string|null} color - 'w', 'b', or null for analysis mode
 */
export function setEngineMode(color) {
    state.enginePlaysColor = color;
    updateEngineModeUI();
    
    if (color) {
        state.wasInBook = true;
        
        document.getElementById('voiceStatus').textContent = 
            `Engine plays ${color === 'w' ? 'White' : 'Black'}. You play ${color === 'w' ? 'Black' : 'White'}.`;
        
        if (state.game && state.game.turn() === color) {
            analyzePosition().then(() => {
                setTimeout(makeEngineMoveIfNeeded, 500);
            });
        }
    } else {
        document.getElementById('voiceStatus').textContent = 'Analysis mode. Both sides shown.';
    }
}

/**
 * Toggle between engine mode and analysis mode
 */
export function toggleEngineMode() {
    if (state.enginePlaysColor) {
        setEngineMode(null);
    } else {
        const whiteBtn = document.getElementById('engineWhiteBtn');
        const blackBtn = document.getElementById('engineBlackBtn');
        let color = 'w';
        if (blackBtn && blackBtn.classList.contains('active')) {
            color = 'b';
        } else if (whiteBtn && !whiteBtn.classList.contains('active')) {
            whiteBtn.classList.add('active');
        }
        setEngineMode(color);
    }
}

/**
 * Set which color the engine plays
 * @param {string} color - 'w' or 'b'
 */
export function setEngineColor(color) {
    if (state.enginePlaysColor !== color) {
        setEngineMode(color);
    }
}

/**
 * Toggle grandmaster mode
 */
export function toggleGrandmasterMode() {
    state.grandmasterMode = document.getElementById('grandmasterModeCheckbox').checked;
    document.getElementById('voiceStatus').textContent = 
        state.grandmasterMode ? 'Grandmaster mode enabled' : 'Grandmaster mode disabled';
    
    updateEngineModeUI();
    
    if (!state.grandmasterMode) {
        clearGrandmasterDisplay();
        state.lastGrandmasterInfo = null;
    }
    
    // Chrome speech synthesis bug workaround
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();
    }
}

/**
 * Update engine mode UI elements
 */
export function updateEngineModeUI() {
    try {
        const analysisSection = document.querySelector('.analysis-section');
        if (!analysisSection) return;
        
        const engineColorGroup = document.getElementById('engineColorGroup');
        const grandmasterGroup = document.getElementById('grandmasterGroup');
        const grandmasterInfoGroup = document.getElementById('grandmasterInfoGroup');
        const engineModeBtn = document.getElementById('engineModeBtn');
        const engineModeText = document.getElementById('engineModeText');
        const engineWhiteBtn = document.getElementById('engineWhiteBtn');
        const engineBlackBtn = document.getElementById('engineBlackBtn');
        
        if (!engineColorGroup || !grandmasterGroup || !engineModeBtn || 
            !engineModeText || !engineWhiteBtn || !engineBlackBtn) {
            return;
        }
        
        if (state.enginePlaysColor) {
            analysisSection.classList.add('engine-mode');
            engineColorGroup.style.display = 'flex';
            grandmasterGroup.style.display = 'flex';
            if (grandmasterInfoGroup) {
                grandmasterInfoGroup.style.display = state.grandmasterMode ? 'flex' : 'none';
            }
            engineModeText.textContent = 'Analysis Mode';
            engineModeBtn.classList.add('active');
            
            if (state.enginePlaysColor === 'w') {
                engineWhiteBtn.classList.add('active');
                engineBlackBtn.classList.remove('active');
            } else {
                engineBlackBtn.classList.add('active');
                engineWhiteBtn.classList.remove('active');
            }
        } else {
            analysisSection.classList.remove('engine-mode');
            engineColorGroup.style.display = 'none';
            grandmasterGroup.style.display = 'none';
            if (grandmasterInfoGroup) {
                grandmasterInfoGroup.style.display = 'none';
            }
            engineModeText.textContent = 'Engine Mode';
            engineModeBtn.classList.remove('active');
        }
    } catch (error) {
        console.error('Error updating engine mode UI:', error);
    }
}

/**
 * Update grandmaster info display
 * @param {Object} info - Grandmaster info object
 */
export function updateGrandmasterDisplay(info) {
    if (!info) return;
    
    const grandmasterInfoGroup = document.getElementById('grandmasterInfoGroup');
    const grandmasterInfo = document.getElementById('grandmasterInfo');
    
    if (grandmasterInfoGroup && grandmasterInfo && state.grandmasterMode && state.enginePlaysColor) {
        grandmasterInfoGroup.style.display = 'flex';
        grandmasterInfo.textContent = `Last move by: ${info.name} (${info.rating})`;
        grandmasterInfo.title = `${info.name} (${info.rating}) played ${info.move}`;
    }
}

/**
 * Clear grandmaster display
 */
export function clearGrandmasterDisplay() {
    const grandmasterInfoGroup = document.getElementById('grandmasterInfoGroup');
    if (grandmasterInfoGroup) {
        grandmasterInfoGroup.style.display = 'none';
    }
}

