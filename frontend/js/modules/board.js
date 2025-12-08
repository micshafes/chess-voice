// ===========================
// Board Setup Module
// ===========================

import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { playMoveSound } from './sound.js';
import { updateStatus, analyzePosition } from './api.js';

/**
 * Initialize the chessboard
 */
export function initializeBoard() {
    try {
        const boardElement = document.getElementById('myBoard');
        if (!boardElement) {
            console.error('Board element not found!');
            return;
        }
        
        if (typeof Chessboard === 'undefined') {
            console.error('Chessboard library not loaded!');
            return;
        }
        
        const config = {
            draggable: true,
            position: 'start',
            pieceTheme: CONFIG.BOARD.PIECE_THEME,
            onDragStart: onDragStart,
            onDrop: onDrop,
            onSnapEnd: onSnapEnd,
            appearSpeed: CONFIG.BOARD.ANIMATION.APPEAR_SPEED,
            moveSpeed: CONFIG.BOARD.ANIMATION.MOVE_SPEED,
            snapSpeed: CONFIG.BOARD.ANIMATION.SNAP_SPEED,
            trashSpeed: CONFIG.BOARD.ANIMATION.TRASH_SPEED,
        };
        
        state.board = Chessboard('myBoard', config);
        
        if (!state.board) {
            throw new Error('Failed to initialize chessboard');
        }
        
        console.log('Chessboard initialized successfully');
        
        // Resize board after a short delay to ensure container is rendered
        requestAnimationFrame(() => {
            setTimeout(() => {
                resizeBoard();
            }, 100);
        });
        
        // Also resize on window resize
        window.addEventListener('resize', () => {
            if (state.board && typeof state.board.resize === 'function') {
                state.board.resize();
            }
        });
        
    } catch (error) {
        console.error('Error initializing board:', error);
        alert('Error initializing chess board. Please refresh the page.');
    }
}

/**
 * Resize the board to fit its container
 */
function resizeBoard() {
    if (state.board && typeof state.board.resize === 'function') {
        state.board.resize();
    }
    
    const boardElement = document.getElementById('myBoard');
    if (boardElement) {
        const container = boardElement.parentElement;
        if (container) {
            const containerWidth = container.offsetWidth;
            const boardSize = Math.min(containerWidth - 40, CONFIG.BOARD.MAX_SIZE);
            boardElement.style.width = boardSize + 'px';
            boardElement.style.height = boardSize + 'px';
            if (state.board && typeof state.board.resize === 'function') {
                state.board.resize();
            }
        }
    }
}

/**
 * Handle drag start event
 */
function onDragStart(source, piece, position, orientation) {
    if (!state.game) return false;
    
    // Prevent dragging if game is over
    if (state.game.isGameOver && state.game.isGameOver()) {
        return false;
    }
    
    // Prevent dragging opponent's pieces
    if ((state.game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (state.game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
}

/**
 * Handle piece drop event
 */
function onDrop(source, target) {
    if (!state.game) return 'snapback';
    
    try {
        const move = state.game.move({
            from: source,
            to: target,
            promotion: 'q' // Default to queen promotion
        });
        
        if (move === null) {
            return 'snapback';
        }
        
        // Play sound
        playMoveSound({ isCapture: move.captured !== undefined });
        
        // Use requestAnimationFrame for smoother updates
        requestAnimationFrame(() => {
            state.board.position(state.game.fen());
        });
        updateStatus();
        analyzePosition();
        return true;
    } catch (error) {
        console.error('Error making move:', error);
        return 'snapback';
    }
}

/**
 * Handle snap end event
 */
function onSnapEnd() {
    if (state.board && state.game) {
        requestAnimationFrame(() => {
            state.board.position(state.game.fen());
        });
    }
}

/**
 * Flip the board orientation
 */
export function flipBoard() {
    if (!state.board) return;
    
    const currentOrientation = state.board.orientation();
    requestAnimationFrame(() => {
        state.board.orientation(currentOrientation === 'white' ? 'black' : 'white');
    });
}

/**
 * Reset the game to starting position
 */
export function resetGame() {
    if (!state.game || !state.board) return;
    
    state.game.reset();
    
    // Reset book tracking
    state.wasInBook = true;
    state.lastMasterMoves = [];
    state.lastEngineMoves = [];
    
    // Clear position cache stack
    state.positionStack = [];
    console.log('Cleared position cache stack');
    
    // Cancel any ongoing analysis
    state.currentAnalysisFen = null;
    state.currentAnalysisDepth = 0;
    
    requestAnimationFrame(() => {
        state.board.position('start');
        state.board.orientation('white');
    });
    
    updateStatus();
    
    // Reset header and content
    const header = document.querySelector('.analysis-panel h2');
    if (header && header.textContent.includes('Engine')) {
        header.textContent = 'Top Engine Moves';
    }
    document.getElementById('engineMoves').innerHTML = 
        '<p class="placeholder">Make a move to see engine analysis</p>';
    document.getElementById('masterMoves').innerHTML = 
        '<p class="placeholder">Make a move to see master games</p>';
}

/**
 * Undo the last move(s)
 */
export function undoMove() {
    if (!state.game || !state.board) return;
    
    // Pop current position from cache stack (we're going back)
    if (state.positionStack.length > 0) {
        state.positionStack.pop();
        console.log(`Popped position from cache stack (${state.positionStack.length} remaining)`);
    }
    
    // In engine mode, undo two moves so it's the player's turn again
    if (state.enginePlaysColor) {
        const playerColor = state.enginePlaysColor === 'w' ? 'b' : 'w';
        
        // Undo first move
        const move1 = state.game.undo();
        if (!move1) return;
        
        // Pop again if we undo a second move
        if (state.positionStack.length > 0) {
            state.positionStack.pop();
        }
        
        // If it's still not the player's turn, undo another move
        if (state.game.turn() !== playerColor) {
            const move2 = state.game.undo();
            if (move2) {
                console.log(`Undid 2 moves: ${move2.san} and ${move1.san}`);
                document.getElementById('voiceStatus').textContent = 
                    `Undid ${move2.san} and ${move1.san}. Your turn.`;
            }
        } else {
            console.log(`Undid 1 move: ${move1.san}`);
            document.getElementById('voiceStatus').textContent = 
                `Undid ${move1.san}. Your turn.`;
        }
        
        requestAnimationFrame(() => {
            state.board.position(state.game.fen());
        });
        updateStatus();
        analyzePosition();  // Will use cached data from stack
    } else {
        // Normal mode - just undo one move
        const move = state.game.undo();
        if (move) {
            requestAnimationFrame(() => {
                state.board.position(state.game.fen());
            });
            updateStatus();
            analyzePosition();  // Will use cached data from stack
        }
    }
}

