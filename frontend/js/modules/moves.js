// ===========================
// Move Parsing Module
// ===========================

import { state } from '../state.js';
import { correctVoiceInput } from './commands.js';
import { playMoveSound, toggleSound } from './sound.js';
import { speakMove } from './speech.js';
import { resetGame, undoMove, flipBoard } from './board.js';
import { analyzePosition, updateStatus } from './api.js';
import { setEngineMode, toggleGrandmasterMode } from './engine.js';
import { showCommandsModal, hideCommandsModal, toggleDarkMode } from './ui.js';

/**
 * Update the pause mode UI (local copy to avoid circular import with voice.js)
 */
function updatePauseUI() {
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
 * Find all pawns that can capture on a given square
 * @param {string} targetSquare - Target square (e.g., "d5")
 * @returns {Array} Array of legal pawn capture moves
 */
export function findPawnCaptures(targetSquare) {
    if (!state.game) return [];
    
    const legalMoves = state.game.moves({ verbose: true });
    const pawnCaptures = legalMoves.filter(move => 
        move.piece === 'p' && 
        move.to === targetSquare.toLowerCase() && 
        move.captured
    );
    
    return pawnCaptures;
}

/**
 * Find all legal captures in the current position
 * @returns {Array} Array of legal capture moves
 */
export function findAllCaptures() {
    if (!state.game) return [];
    
    const legalMoves = state.game.moves({ verbose: true });
    return legalMoves.filter(move => move.captured);
}

/**
 * Get the top engine capture move
 * @returns {string|null} Top capture move or null
 */
export function getTopEngineCapture() {
    if (!state.lastEngineMoves || state.lastEngineMoves.length === 0) return null;
    
    const topMove = state.lastEngineMoves[0];
    if (!topMove || !topMove.move) return null;
    
    if (topMove.move.includes('x')) {
        return topMove.move;
    }
    
    return null;
}

/**
 * Parse voice input and make the corresponding move
 * @param {string} voiceText - The raw voice input
 */
export function parseAndMakeMove(voiceText) {
    if (!state.game) {
        console.error('Game not initialized');
        return;
    }
    
    let text = voiceText.toLowerCase().trim();
    text = correctVoiceInput(text);
    
    console.log(`Original: "${voiceText}" -> Corrected: "${text}"`);
    
    // Handle resume command first (works even when paused)
    const resumeCommands = ['resume', 'unpause', 'continue', 'start listening', 'listen'];
    if (resumeCommands.some(cmd => text.includes(cmd))) {
        if (state.isPaused) {
            state.isPaused = false;
            updatePauseUI();
            document.getElementById('voiceStatus').textContent = 'Resumed! Listening for moves...';
        } else {
            document.getElementById('voiceStatus').textContent = 'Already listening.';
        }
        return;
    }
    
    // Handle pause command
    const pauseCommands = ['pause', 'stop listening', 'hold on', 'wait'];
    if (pauseCommands.some(cmd => text.includes(cmd))) {
        state.isPaused = true;
        updatePauseUI();
        document.getElementById('voiceStatus').textContent = 'Paused. Say "resume" to continue.';
        return;
    }
    
    // If paused, ignore all other commands
    if (state.isPaused) {
        document.getElementById('voiceStatus').textContent = 'Paused. Say "resume" to continue.';
        return;
    }
    
    // Handle voice commands
    if (handleVoiceCommands(text)) return;
    
    // Handle engine mode commands
    if (handleEngineModeCommands(text)) return;
    
    // Handle special move commands
    if (handleSpecialMoveCommands(text)) return;
    
    // Parse as chess move
    parseChessMove(text, voiceText);
}

/**
 * Handle general voice commands (reset, flip, undo, sound)
 * @param {string} text - Corrected voice text
 * @returns {boolean} True if command was handled
 */
function handleVoiceCommands(text) {
    const resetCommands = ['reset', 'restart', 'clear', 'new game', 'start over'];
    const flipCommands = ['flip', 'rotate', 'turn', 'switch'];
    const undoCommands = ['undo', 'back', 'previous', 'go back', 'take back'];
    const soundOnCommands = ['sound on', 'enable sound', 'turn on sound', 'unmute'];
    const soundOffCommands = ['sound off', 'disable sound', 'turn off sound', 'mute'];
    
    if (resetCommands.some(cmd => text.includes(cmd))) {
        resetGame();
        document.getElementById('voiceStatus').textContent = 'Board reset';
        return true;
    }
    
    if (flipCommands.some(cmd => text.includes(cmd)) && !text.includes('move')) {
        flipBoard();
        document.getElementById('voiceStatus').textContent = 'Board flipped';
        return true;
    }
    
    if (undoCommands.some(cmd => text.includes(cmd))) {
        undoMove();
        document.getElementById('voiceStatus').textContent = 'Move undone';
        return true;
    }
    
    if (soundOnCommands.some(cmd => text.includes(cmd))) {
        if (!state.soundEnabled) {
            toggleSound();
        }
        document.getElementById('voiceStatus').textContent = 'Sound enabled';
        return true;
    }
    
    if (soundOffCommands.some(cmd => text.includes(cmd))) {
        if (state.soundEnabled) {
            toggleSound();
        }
        document.getElementById('voiceStatus').textContent = 'Sound disabled';
        return true;
    }
    
    // Handle show/hide commands
    if (text.includes('show commands') || text.includes('show command') || 
        text.includes('help') || text.includes('what can i say') || 
        text.includes('commands') || text.includes('voice commands')) {
        showCommandsModal();
        document.getElementById('voiceStatus').textContent = 'Showing voice commands';
        return true;
    }
    
    if (text.includes('hide commands') || text.includes('hide command') || 
        text.includes('hide help') || text.includes('close commands') || 
        text.includes('close command') || text.includes('close help')) {
        hideCommandsModal();
        document.getElementById('voiceStatus').textContent = 'Commands hidden';
        return true;
    }
    
    // Handle dark/light mode
    if (text.includes('dark mode') || text.includes('dark theme')) {
        if (!document.body.classList.contains('dark-mode')) {
            toggleDarkMode();
        }
        document.getElementById('voiceStatus').textContent = 'Dark mode enabled';
        return true;
    }
    
    if (text.includes('light mode') || text.includes('light theme')) {
        if (document.body.classList.contains('dark-mode')) {
            toggleDarkMode();
        }
        document.getElementById('voiceStatus').textContent = 'Light mode enabled';
        return true;
    }
    
    return false;
}

/**
 * Handle engine mode voice commands
 * @param {string} text - Corrected voice text
 * @returns {boolean} True if command was handled
 */
function handleEngineModeCommands(text) {
    if (text.includes('engine plays white') || text.includes('computer plays white') || 
        text.includes('play against white') || text.includes('engine white')) {
        setEngineMode('w');
        return true;
    }
    
    if (text.includes('engine plays black') || text.includes('computer plays black') || 
        text.includes('play against black') || text.includes('engine black')) {
        setEngineMode('b');
        return true;
    }
    
    if (text.includes('analysis mode') || text.includes('analyze mode') || 
        text.includes('analysis') || text.includes('stop engine') || 
        text.includes('two player') || text.includes('2 player')) {
        setEngineMode(null);
        return true;
    }
    
    // Grandmaster plays commands
    if (text.includes('grandmaster plays white') || text.includes('gm plays white') || 
        text.includes('grandmaster white')) {
        setEngineMode('w');
        setTimeout(() => {
            const checkbox = document.getElementById('grandmasterModeCheckbox');
            if (checkbox && !checkbox.checked) {
                checkbox.checked = true;
                toggleGrandmasterMode();
            }
        }, 100);
        return true;
    }
    
    if (text.includes('grandmaster plays black') || text.includes('gm plays black') || 
        text.includes('grandmaster black')) {
        setEngineMode('b');
        setTimeout(() => {
            const checkbox = document.getElementById('grandmasterModeCheckbox');
            if (checkbox && !checkbox.checked) {
                checkbox.checked = true;
                toggleGrandmasterMode();
            }
        }, 100);
        return true;
    }
    
    // Grandmaster mode toggle
    if (text.includes('grandmaster mode') || text.includes('grandmaster') || text.includes('gm mode')) {
        if (state.enginePlaysColor) {
            const checkbox = document.getElementById('grandmasterModeCheckbox');
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                toggleGrandmasterMode();
            }
        } else {
            document.getElementById('voiceStatus').textContent = 'Grandmaster mode only works in engine mode';
        }
        return true;
    }
    
    if (text.includes('enable grandmaster') || text.includes('turn on grandmaster') || 
        text.includes('grandmaster on')) {
        if (state.enginePlaysColor) {
            const checkbox = document.getElementById('grandmasterModeCheckbox');
            if (checkbox && !checkbox.checked) {
                checkbox.checked = true;
                toggleGrandmasterMode();
            }
        } else {
            document.getElementById('voiceStatus').textContent = 'Grandmaster mode only works in engine mode';
        }
        return true;
    }
    
    if (text.includes('disable grandmaster') || text.includes('turn off grandmaster') || 
        text.includes('grandmaster off')) {
        if (state.enginePlaysColor) {
            const checkbox = document.getElementById('grandmasterModeCheckbox');
            if (checkbox && checkbox.checked) {
                checkbox.checked = false;
                toggleGrandmasterMode();
            }
        } else {
            document.getElementById('voiceStatus').textContent = 'Grandmaster mode only works in engine mode';
        }
        return true;
    }
    
    return false;
}

/**
 * Handle special move commands (top move, master move, takes)
 * @param {string} text - Corrected voice text
 * @returns {boolean} True if command was handled
 */
function handleSpecialMoveCommands(text) {
    // Handle "top move" - play the top engine move
    if (text.includes('top move') || text.includes('best move') || text.includes('engine move')) {
        if (state.lastEngineMoves && state.lastEngineMoves.length > 0) {
            const topMove = state.lastEngineMoves[0].move;
            try {
                const result = state.game.move(topMove);
                if (result) {
                    state.isSpeaking = true;
                    playMoveSound({ isCapture: result.captured !== undefined });
                    if (state.board) {
                        requestAnimationFrame(() => {
                            state.board.position(state.game.fen());
                        });
                    }
                    updateStatus();
                    analyzePosition();
                    document.getElementById('voiceStatus').textContent = `Top move: ${result.san}`;
                    speakMove(result.san);
                    return true;
                }
            } catch (error) {
                console.error('Error making top move:', error);
            }
        }
        document.getElementById('voiceStatus').textContent = 'No engine analysis available yet';
        return true;
    }
    
    // Handle "master move" - play the most common master move
    if (text.includes('master move') || text.includes('book move')) {
        if (state.lastMasterMoves && state.lastMasterMoves.length > 0) {
            const sortedMoves = [...state.lastMasterMoves].sort((a, b) => (b.total || 0) - (a.total || 0));
            const topMasterMove = sortedMoves[0].move;
            try {
                const result = state.game.move(topMasterMove);
                if (result) {
                    state.isSpeaking = true;
                    playMoveSound({ isCapture: result.captured !== undefined });
                    if (state.board) {
                        requestAnimationFrame(() => {
                            state.board.position(state.game.fen());
                        });
                    }
                    updateStatus();
                    analyzePosition();
                    const gameCount = sortedMoves[0].total || 0;
                    document.getElementById('voiceStatus').textContent = `Master move: ${result.san} (${gameCount} games)`;
                    speakMove(result.san);
                    return true;
                }
            } catch (error) {
                console.error('Error making master move:', error);
            }
        }
        document.getElementById('voiceStatus').textContent = 'No master games found for this position';
        return true;
    }
    
    return false;
}

/**
 * Parse and execute a chess move
 * @param {string} text - Corrected voice text
 * @param {string} originalText - Original voice text for error messages
 */
function parseChessMove(text, originalText) {
    const cleaned = text.replace(/\b(move|play|to|the|square)\b/gi, ' ').trim();
    let move = null;
    
    // Handle "just takes"
    if (/^(takes|capture|captures|x)$/i.test(cleaned.trim())) {
        const allCaptures = findAllCaptures();
        
        if (allCaptures.length === 1) {
            makeMoveAndUpdate(allCaptures[0]);
            return;
        } else if (allCaptures.length > 1) {
            const topCapture = getTopEngineCapture();
            if (topCapture) {
                try {
                    const result = state.game.move(topCapture);
                    if (result) {
                        playMoveSound({ isCapture: true });
                        if (state.board) {
                            requestAnimationFrame(() => {
                                state.board.position(state.game.fen());
                            });
                        }
                        updateStatus();
                        analyzePosition();
                        document.getElementById('voiceStatus').textContent = `Move made: ${result.san} (top engine capture)`;
                        return;
                    }
                } catch (error) {
                    console.error('Error making top engine capture:', error);
                }
            }
            document.getElementById('voiceStatus').textContent = 
                `Multiple captures available (${allCaptures.length}). Please specify which piece takes where.`;
            return;
        } else {
            document.getElementById('voiceStatus').textContent = 'No captures available in this position.';
            return;
        }
    }
    
    // Handle pawn captures
    const pieceNames = ['knight', 'bishop', 'rook', 'queen', 'king'];
    const hasPieceName = pieceNames.some(piece => text.includes(piece));
    const hasCapturePattern = /\b(?:takes|x|captures?)\b/i.test(cleaned);
    const isPawnCapture = hasCapturePattern && (text.includes('pawn') || !hasPieceName);
    
    if (isPawnCapture && !hasPieceName) {
        const squareMatch = cleaned.match(/([a-h][1-8])/i);
        if (squareMatch) {
            const targetSquare = squareMatch[1].toLowerCase();
            const pawnCaptures = findPawnCaptures(targetSquare);
            
            if (pawnCaptures.length === 1) {
                makeMoveAndUpdate(pawnCaptures[0]);
                return;
            } else if (pawnCaptures.length > 1) {
                document.getElementById('voiceStatus').textContent = 
                    `Two pawns can take on ${targetSquare}. Say "${pawnCaptures[0].from[0]} takes ${targetSquare}" or "${pawnCaptures[1].from[0]} takes ${targetSquare}"`;
                return;
            } else if (pawnCaptures.length === 0) {
                document.getElementById('voiceStatus').textContent = 
                    `No pawn can capture on ${targetSquare}.`;
                return;
            }
        }
    }
    
    // Handle "pawn to [square]" - non-capture
    if (text.includes('pawn') && !hasCapturePattern) {
        const squareMatch = cleaned.match(/([a-h][1-8])/i);
        if (squareMatch) {
            const targetSquare = squareMatch[1].toLowerCase();
            try {
                const result = state.game.move(targetSquare);
                if (result) {
                    playMoveSound({ isCapture: result.captured !== undefined });
                    if (state.board) {
                        requestAnimationFrame(() => {
                            state.board.position(state.game.fen());
                        });
                    }
                    updateStatus();
                    analyzePosition();
                    document.getElementById('voiceStatus').textContent = `Move made: ${result.san}`;
                    return;
                }
            } catch (error) {
                console.log('Direct pawn move failed, trying standard parsing');
            }
        }
    }
    
    // Handle castling
    if (text.includes('castle') || text.includes('castles')) {
        if (text.includes('king') || text.includes('short')) {
            move = 'O-O';
        } else if (text.includes('queen') || text.includes('long')) {
            move = 'O-O-O';
        } else {
            const legalMoves = state.game.moves();
            const canCastleKingside = legalMoves.includes('O-O');
            const canCastleQueenside = legalMoves.includes('O-O-O');
            
            if (canCastleKingside && canCastleQueenside) {
                document.getElementById('voiceStatus').textContent = 
                    'Both castling options available. Say "castle kingside" or "castle queenside"';
                return;
            } else if (canCastleKingside) {
                move = 'O-O';
            } else if (canCastleQueenside) {
                move = 'O-O-O';
            } else {
                document.getElementById('voiceStatus').textContent = 'Castling is not legal in this position';
                return;
            }
        }
    } else if (text.includes('resign')) {
        alert('Game resigned');
        document.getElementById('voiceStatus').textContent = 'Game resigned';
        return;
    } else {
        // Parse standard notation
        let notation = cleaned.replace(/\b(takes|captures|capture)\b/gi, 'x');
        notation = notation.replace(/\bpawn\b/gi, '');
        notation = notation.replace(/\bknight\b/gi, 'N');
        notation = notation.replace(/\bbishop\b/gi, 'B');
        notation = notation.replace(/\brook\b/gi, 'R');
        notation = notation.replace(/\bqueen\b/gi, 'Q');
        notation = notation.replace(/\bking\b/gi, 'K');
        notation = notation.replace(/\s+/g, '').trim();
        
        move = notation;
    }
    
    if (move) {
        try {
            const result = state.game.move(move);
            if (result) {
                playMoveSound({ isCapture: result.captured !== undefined });
                if (state.board) {
                    requestAnimationFrame(() => {
                        state.board.position(state.game.fen());
                    });
                }
                updateStatus();
                analyzePosition();
                document.getElementById('voiceStatus').textContent = `Move made: ${result.san}`;
            } else {
                tryAlternativeParsing(text);
            }
        } catch (error) {
            console.error('Error making move:', error);
            tryAlternativeParsing(text);
        }
    } else {
        document.getElementById('voiceStatus').textContent = 
            `Could not parse: "${originalText}". Try saying moves like "e4", "knight f3", or "castle kingside"`;
    }
}

/**
 * Try alternative parsing methods for a move
 * @param {string} text - Voice text to parse
 */
function tryAlternativeParsing(text) {
    const squarePattern = /([a-h][1-8])/gi;
    const squares = text.match(squarePattern);
    
    if (squares && squares.length >= 2) {
        const from = squares[0];
        const to = squares[1];
        try {
            const moveObj = { from, to, promotion: 'q' };
            const result = state.game.move(moveObj);
            if (result) {
                playMoveSound({ isCapture: result.captured !== undefined });
                if (state.board) {
                    requestAnimationFrame(() => {
                        state.board.position(state.game.fen());
                    });
                }
                updateStatus();
                analyzePosition();
                document.getElementById('voiceStatus').textContent = `Move made: ${result.san}`;
                return;
            }
        } catch (error) {
            console.error('Alternative parsing failed:', error);
        }
    }
    
    document.getElementById('voiceStatus').textContent = 
        `Could not understand: "${text}". Please try again with clearer notation.`;
}

/**
 * Make a move and update the UI
 * @param {Object|string} move - Move object or string
 */
function makeMoveAndUpdate(move) {
    try {
        const result = state.game.move(move);
        if (result) {
            playMoveSound({ isCapture: result.captured !== undefined });
            if (state.board) {
                requestAnimationFrame(() => {
                    state.board.position(state.game.fen());
                });
            }
            updateStatus();
            analyzePosition();
            document.getElementById('voiceStatus').textContent = `Move made: ${result.san}`;
        }
    } catch (error) {
        console.error('Error making move:', error);
    }
}

