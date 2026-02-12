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
 * Convert evaluation to centipawns for comparison
 * @param {Object} move - Move object with evaluation and type
 * @returns {number} Evaluation in centipawns (positive = good for white, negative = good for black)
 */
function evaluationToCentipawns(move) {
    if (move.type === 'mate') {
        // Convert mate scores to large centipawn values
        // Mate in 1 = very good, mate in -1 = very bad
        // Use 10000 as base, subtract mate distance * 1000
        const mateValue = move.evaluation;
        if (mateValue > 0) {
            return 10000 - (mateValue - 1) * 1000;  // Mate in 1 = 10000, mate in 2 = 9000, etc.
        } else {
            return -10000 - (Math.abs(move.evaluation) - 1) * 1000;  // Mate in -1 = -10000, etc.
        }
    }
    // Already in pawns, convert to centipawns
    return move.evaluation * 100;
}

/**
 * Select engine move based on strength level and evaluation differences
 * @param {Array} moves - Array of move objects with evaluation
 * @param {number} strength - Engine strength rating (1000, 1500, 2000, 2500)
 * @returns {string} Selected move in SAN notation
 */
function selectEngineMoveByStrength(moves, strength) {
    if (!moves || moves.length === 0) {
        return null;
    }
    
    // Convert all evaluations to centipawns for comparison
    // Note: Stockfish evaluations are from white's perspective
    // Moves are already sorted by backend (best first)
    const movesWithCp = moves.map(move => ({
        ...move,
        centipawns: evaluationToCentipawns(move)
    }));
    
    // The first move is the best move (already sorted by backend)
    const bestMove = movesWithCp[0];
    const bestCp = bestMove.centipawns;
    
    // Determine if engine is playing for white or black
    // For black, we need to think in terms of minimizing white's advantage
    // So we'll use absolute differences, which works for both sides
    
    // Define strength parameters
    // maxDiff: Maximum allowed difference from best move (in centipawns)
    // biasFactor: How much to favor moves closer to best (higher = more bias)
    let maxDiff, biasFactor;
    
    switch (strength) {
        case 2500:
            // 2500: Always best move, only pick moves within 2 centipawns (essentially equivalent)
            maxDiff = 2;
            biasFactor = 10000;  // Extremely high bias - essentially deterministic
            break;
        case 2000:
            // 2000: Strong play, moves within 20 centipawns
            maxDiff = 20;
            biasFactor = 50;
            break;
        case 1500:
            // 1500: Intermediate, moves within 50 centipawns
            maxDiff = 50;
            biasFactor = 10;
            break;
        case 1000:
            // 1000: Beginner, moves within 100 centipawns
            maxDiff = 100;
            biasFactor = 3;
            break;
        default:
            // Default to 2000
            maxDiff = 20;
            biasFactor = 50;
    }
    
    // Filter moves within acceptable range
    // For the side to move, we want moves that are close to the best move
    // We use absolute difference to handle both white and black correctly
    const acceptableMoves = movesWithCp.filter(move => {
        const diff = Math.abs(move.centipawns - bestCp);
        return diff <= maxDiff;
    });
    
    // If no acceptable moves (shouldn't happen), use best move
    if (acceptableMoves.length === 0) {
        return bestMove.move;
    }
    
    // Calculate weights based on how close each move is to the best move
    const weights = acceptableMoves.map(move => {
        const diff = Math.abs(move.centipawns - bestCp);
        // Weight = 1 / (1 + diff * biasFactor)
        // Moves closer to best get much higher weight
        const weight = 1 / (1 + diff * biasFactor / 10);
        return weight;
    });
    
    // Select using weighted random
    const selectedMove = weightedRandomSelect(
        acceptableMoves.map(m => m.move),
        weights
    );
    
    return selectedMove;
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
        // Only mark as "left book" if master games API has responded with no moves
        // This prevents false "out of book" when API is just slow
        const justLeftBook = state.wasInBook && state.enginePlaysColor && state.masterGamesLoaded;
        state.wasInBook = false;
        state.lastGrandmasterInfo = null;
        
        // Smart move selection based on engine strength and evaluation differences
        const selectedMove = selectEngineMoveByStrength(state.lastEngineMoves, state.engineStrength);
        
        console.log('Selecting from engine moves (strength:', state.engineStrength + '):', selectedMove);
        return { move: selectedMove, fromBook: false, justLeftBook };
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
            
            await speakText('Out of book', { fromEngine: true });
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
                await speakMove(result.san, { fromEngine: true });
                
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
 * Set engine strength
 * @param {number} strength - Engine strength rating (1000, 1500, 2000, 2500)
 */
export function setEngineStrength(strength) {
    const validStrengths = [1000, 1500, 2000, 2500];
    if (!validStrengths.includes(strength)) {
        console.warn('Invalid engine strength:', strength);
        return;
    }
    
    state.engineStrength = strength;
    updateEngineModeUI();
    
    const strengthNames = {
        1000: 'Beginner',
        1500: 'Intermediate',
        2000: 'Advanced',
        2500: 'Master'
    };
    
    document.getElementById('voiceStatus').textContent = 
        `Engine strength set to ${strength} (${strengthNames[strength]})`;
}

/**
 * Update engine mode UI elements
 */
export function updateEngineModeUI() {
    try {
        const analysisSection = document.querySelector('.analysis-section');
        if (!analysisSection) return;
        
        const engineColorGroup = document.getElementById('engineColorGroup');
        const engineStrengthGroup = document.getElementById('engineStrengthGroup');
        const grandmasterGroup = document.getElementById('grandmasterGroup');
        const announceMuteGroup = document.getElementById('announceMuteGroup');
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
            if (engineStrengthGroup) {
                engineStrengthGroup.style.display = 'flex';
            }
            grandmasterGroup.style.display = 'flex';
            if (announceMuteGroup) {
                announceMuteGroup.style.display = 'flex';
            }
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
            
            // Update strength button highlights
            if (engineStrengthGroup) {
                const strengthButtons = engineStrengthGroup.querySelectorAll('.strength-btn');
                strengthButtons.forEach(btn => {
                    const strength = parseInt(btn.getAttribute('data-strength'));
                    if (strength === state.engineStrength) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
            }
        } else {
            analysisSection.classList.remove('engine-mode');
            engineColorGroup.style.display = 'none';
            if (engineStrengthGroup) {
                engineStrengthGroup.style.display = 'none';
            }
            grandmasterGroup.style.display = 'none';
            if (announceMuteGroup) {
                announceMuteGroup.style.display = 'none';
            }
            if (grandmasterInfoGroup) {
                grandmasterInfoGroup.style.display = 'none';
            }
            engineModeText.textContent = 'Engine Mode';
            engineModeBtn.classList.remove('active');
        }
        updateAnnounceMuteButton();
    } catch (error) {
        console.error('Error updating engine mode UI:', error);
    }
}

/**
 * Update the mute announcements button appearance
 */
export function updateAnnounceMuteButton() {
    const btn = document.getElementById('announceMuteBtn');
    const textEl = document.getElementById('announceMuteBtnText');
    if (!btn || !textEl) return;
    if (state.announceMuted) {
        btn.classList.add('muted');
        btn.title = 'Unmute move announcements';
        textEl.textContent = 'Announcements off';
    } else {
        btn.classList.remove('muted');
        btn.title = 'Mute move announcements';
        textEl.textContent = 'Mute announcements';
    }
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

/**
 * Toggle mute for engine/grandmaster move announcements
 */
export function toggleAnnounceMute() {
    state.announceMuted = !state.announceMuted;
    updateAnnounceMuteButton();
    document.getElementById('voiceStatus').textContent = state.announceMuted
        ? 'Move announcements muted'
        : 'Move announcements on';
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

