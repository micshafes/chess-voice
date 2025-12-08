// ===========================
// API Calls Module
// ===========================

import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { playMoveSound } from './sound.js';

// Note: makeEngineMoveIfNeeded is imported dynamically to avoid circular dependency with engine.js

/**
 * Analyze the current position - fetches engine and master moves
 */
export async function analyzePosition() {
    if (!state.game) {
        console.error('Game not initialized');
        return;
    }
    
    const fen = state.game.fen();
    
    // Update FEN display
    document.getElementById('fen').textContent = fen;
    
    // Cancel any ongoing analysis
    if (state.currentAnalysisController) {
        state.currentAnalysisController.abort();
        console.log('Cancelled previous analysis');
    }
    
    // Create new abort controller
    state.currentAnalysisController = new AbortController();
    const signal = state.currentAnalysisController.signal;
    
    state.currentAnalysisFen = fen;
    state.currentAnalysisDepth = 0;
    
    // Show loading
    document.getElementById('engineMoves').innerHTML = '<p class="loading">Analyzing...</p>';
    document.getElementById('masterMoves').innerHTML = '<p class="loading">Loading master games...</p>';
    
    // Fetch master moves first (quick)
    try {
        const masterResponse = await fetch(
            `${CONFIG.API_BASE_URL}/master-moves/?fen=${encodeURIComponent(fen)}`,
            { signal }
        );
        if (masterResponse.ok) {
            const masterData = await masterResponse.json();
            displayMasterMoves(masterData);
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Master moves fetch aborted');
            return;
        }
        console.error('Error fetching master moves:', error);
        document.getElementById('masterMoves').innerHTML = 
            `<p class="placeholder">Error loading master games</p>`;
    }
    
    // In engine play mode, just do depth 15 and play
    if (state.enginePlaysColor) {
        try {
            const engineResponse = await fetch(
                `${CONFIG.API_BASE_URL}/top-moves/?fen=${encodeURIComponent(fen)}&depth=${CONFIG.ENGINE.DEFAULT_DEPTH}&num_moves=${CONFIG.ENGINE.NUM_TOP_MOVES}`,
                { signal }
            );
            if (engineResponse.ok) {
                const engineData = await engineResponse.json();
                displayEngineMoves(engineData.moves || [], CONFIG.ENGINE.DEFAULT_DEPTH);
                
                if (state.game.turn() === state.enginePlaysColor) {
                    // Dynamic import to avoid circular dependency
                    import('./engine.js').then(({ makeEngineMoveIfNeeded }) => {
                        setTimeout(makeEngineMoveIfNeeded, CONFIG.TIMING.ENGINE_MOVE_DELAY);
                    });
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Engine analysis fetch aborted');
                return;
            }
            console.error('Error fetching engine analysis:', error);
            document.getElementById('engineMoves').innerHTML = 
                `<p class="placeholder">Error loading analysis: ${error.message}</p>`;
        }
        return;
    }
    
    // Analysis mode: continuous deepening
    await continuousDeepening(fen, signal);
}

/**
 * Perform continuous deepening analysis
 * @param {string} fen - Position FEN
 * @param {AbortSignal} signal - Abort signal for cancellation
 */
async function continuousDeepening(fen, signal) {
    const depths = CONFIG.ENGINE.ANALYSIS_DEPTHS;
    
    for (const depth of depths) {
        if (signal.aborted) {
            console.log(`Analysis aborted at depth ${depth}`);
            return;
        }
        
        try {
            console.log(`Analyzing at depth ${depth}...`);
            const engineResponse = await fetch(
                `${CONFIG.API_BASE_URL}/top-moves/?fen=${encodeURIComponent(fen)}&depth=${depth}&num_moves=${CONFIG.ENGINE.NUM_TOP_MOVES}`,
                { signal }
            );
            
            if (engineResponse.ok) {
                const engineData = await engineResponse.json();
                state.currentAnalysisDepth = depth;
                displayEngineMoves(engineData.moves || [], depth, depth === depths[depths.length - 1]);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log(`Analysis aborted during depth ${depth} fetch`);
                return;
            }
            console.error(`Error at depth ${depth}:`, error);
        }
        
        if (!signal.aborted) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.TIMING.ANALYSIS_INTERVAL));
        }
    }
    
    console.log('Continuous deepening complete');
}

/**
 * Display engine moves in the UI
 * @param {Array} moves - Array of move objects
 * @param {number} depth - Analysis depth
 * @param {boolean} isComplete - Whether analysis is complete
 */
export function displayEngineMoves(moves, depth = null, isComplete = false) {
    const container = document.getElementById('engineMoves');
    
    state.lastEngineMoves = moves || [];
    
    // Update header with depth
    const header = document.querySelector('.analysis-panel h2');
    if (header && header.textContent.includes('Engine')) {
        if (depth && !state.enginePlaysColor) {
            const isAnalyzing = !isComplete;
            header.innerHTML = `Top Engine Moves <span class="depth-indicator ${isAnalyzing ? 'analyzing' : ''}">(d${depth}${isAnalyzing ? '...' : ''})</span>`;
        } else {
            header.textContent = 'Top Engine Moves';
        }
    }
    
    if (!moves || moves.length === 0) {
        container.innerHTML = '<p class="placeholder">No moves found</p>';
        return;
    }
    
    container.innerHTML = moves.map((move, index) => {
        const evalText = move.type === 'mate' 
            ? `M${move.evaluation > 0 ? '+' : ''}${move.evaluation}`
            : move.evaluation > 0 
                ? `+${move.evaluation.toFixed(2)}`
                : move.evaluation.toFixed(2);
        
        const evalClass = move.type === 'mate' ? 'mate' : (move.evaluation > 0.5 ? 'winning' : move.evaluation < -0.5 ? 'losing' : '');
        
        return `
            <div class="move-item clickable-move" data-move="${move.move}" title="Click to play ${move.move}">
                <span class="move-name">${move.move}</span>
                <span class="move-eval ${evalClass}">${evalText}</span>
            </div>
        `;
    }).join('');
    
    // Add click handlers
    container.querySelectorAll('.clickable-move').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const move = el.dataset.move;
            if (move) {
                playMoveFromClick(move);
            }
        });
    });
}

/**
 * Display master moves in the UI
 * @param {Object} data - Master moves data from API
 */
export function displayMasterMoves(data) {
    const container = document.getElementById('masterMoves');
    
    state.lastMasterMoves = (data && data.moves) ? data.moves : [];
    state.lastTopGames = (data && data.top_games) ? data.top_games : [];
    
    if (data.error) {
        container.innerHTML = `<p class="placeholder">Error: ${data.error}</p>`;
        return;
    }
    
    if (!data.found || !data.moves || data.moves.length === 0) {
        state.lastMasterMoves = [];
        state.lastTopGames = [];
        container.innerHTML = '<p class="placeholder">Position not found in Lichess master games database</p>';
        return;
    }
    
    const moves = data.moves || [];
    const topGames = data.top_games || [];
    const totalGames = data.total_games || 0;
    
    let html = '';
    
    if (totalGames > 0) {
        html += `<p class="master-stats">
            <strong>${totalGames.toLocaleString()}</strong> master games from this position
        </p>`;
    }
    
    html += '<h3 class="section-title">Popular Moves</h3>';
    
    moves.forEach((moveData, index) => {
        const move = moveData.move;
        const total = moveData.total || 0;
        const white = moveData.white || 0;
        const draws = moveData.draws || 0;
        const black = moveData.black || 0;
        const avgRating = moveData.average_rating || 0;
        
        const whitePct = total > 0 ? ((white / total) * 100).toFixed(1) : 0;
        const drawPct = total > 0 ? ((draws / total) * 100).toFixed(1) : 0;
        const blackPct = total > 0 ? ((black / total) * 100).toFixed(1) : 0;
        
        html += `
            <div class="move-item clickable-move" data-move="${move}" title="Click to play ${move}">
                <div class="move-left">
                    <span class="move-name">${move}</span>
                    <div class="move-stats">
                        <span class="win-stat">+${whitePct}%</span>
                        <span class="draw-stat">=${drawPct}%</span>
                        <span class="loss-stat">-${blackPct}%</span>
                    </div>
                </div>
                <div class="move-right">
                    <span class="move-count">${total.toLocaleString()}</span>
                    ${avgRating > 0 ? `<span class="rating-stat">${Math.round(avgRating)}</span>` : ''}
                </div>
            </div>
        `;
    });
    
    // Top games section
    if (topGames.length > 0) {
        html += '<h3 class="section-title" style="margin-top: 12px;">Notable Games</h3>';
        
        // Get number of moves played to link to exact position (d4,d5,c4,Nf6 = 4)
        const movesPlayed = state.game ? state.game.history().length : 0;
        
        topGames.forEach(game => {
            const result = game.winner === 'white' ? '1-0' : game.winner === 'black' ? '0-1' : '½-½';
            const resultClass = game.winner === 'white' ? 'white-win' : game.winner === 'black' ? 'black-win' : 'draw';
            const gameUrl = `https://lichess.org/${game.id}#${movesPlayed}`;
            const moveHtml = game.move ? `<span class="game-move clickable-move" data-move="${game.move}" title="Click to play ${game.move}">${game.move}</span>` : '';
            
            html += `
                <div class="game-item">
                    <div class="game-players">
                        <span class="player white-player">
                            <span class="name">${game.white_name}</span>
                            <span class="rating">${game.white_rating}</span>
                        </span>
                        <span class="game-result ${resultClass}">${result}</span>
                        <span class="player black-player">
                            <span class="name">${game.black_name}</span>
                            <span class="rating">${game.black_rating}</span>
                        </span>
                    </div>
                    <div class="game-info">
                        ${moveHtml}
                        <span class="game-year">${game.year}</span>
                        <a href="${gameUrl}" target="_blank" class="game-link" title="View on Lichess at this position">↗</a>
                    </div>
                </div>
            `;
        });
    }
    
    container.innerHTML = html;
    
    // Add click handlers
    container.querySelectorAll('.clickable-move').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const move = el.dataset.move;
            if (move) {
                playMoveFromClick(move);
            }
        });
    });
}

/**
 * Play a move when clicking on it in the analysis panels
 * @param {string} moveStr - Move in SAN notation
 */
export function playMoveFromClick(moveStr) {
    if (!state.game || !state.board) return;
    
    // Don't allow clicking moves in engine play mode
    if (state.enginePlaysColor) {
        document.getElementById('voiceStatus').textContent = 'Cannot click moves in engine mode';
        return;
    }
    
    try {
        const result = state.game.move(moveStr);
        if (result) {
            playMoveSound({ isCapture: result.captured !== undefined });
            
            requestAnimationFrame(() => {
                state.board.position(state.game.fen());
            });
            
            updateStatus();
            analyzePosition();
            document.getElementById('voiceStatus').textContent = `Played: ${result.san}`;
        } else {
            document.getElementById('voiceStatus').textContent = `Invalid move: ${moveStr}`;
        }
    } catch (error) {
        console.error('Error playing clicked move:', error);
        document.getElementById('voiceStatus').textContent = `Could not play: ${moveStr}`;
    }
}

/**
 * Update the game status display
 */
export function updateStatus() {
    if (!state.game) {
        console.error('Game not initialized');
        return;
    }
    
    let status = '';
    const moveColor = state.game.turn() === 'w' ? 'White' : 'Black';
    
    try {
        if (state.game.isCheckmate && state.game.isCheckmate()) {
            status = `Game over, ${moveColor} is in checkmate.`;
        } else if (state.game.isDraw && state.game.isDraw()) {
            status = 'Game over, drawn position.';
        } else if (state.game.isStalemate && state.game.isStalemate()) {
            status = 'Game over, stalemate.';
        } else {
            status = `${moveColor} to move`;
            if (state.game.isCheck && state.game.isCheck()) {
                status += `, ${moveColor} is in check.`;
            }
        }
        
        document.getElementById('status').textContent = status;
        document.getElementById('fen').textContent = state.game.fen();
        
        const history = state.game.history();
        document.getElementById('moveHistory').textContent = 
            history.length > 0 ? history.join(' ') : 'No moves yet';
    } catch (error) {
        console.error('Error updating status:', error);
        document.getElementById('status').textContent = 'Error: ' + error.message;
    }
}

