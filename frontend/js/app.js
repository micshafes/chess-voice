// ===========================
// Global State
// ===========================

let board = null;
let game = null;
let recognition = null;
let isListening = false;
let API_BASE_URL = 'http://127.0.0.1:8001/api';

// Sound effects
let soundEnabled = true;
let moveSound = null;
let captureSound = null;

// ===========================
// Initialization
// ===========================

// Wait for all dependencies to load
function initializeApp() {
    // Check if all required libraries are loaded
    if (typeof Chess === 'undefined') {
        console.error('Chess.js library not loaded!');
        setTimeout(initializeApp, 100); // Retry after 100ms
        return;
    }
    
    if (typeof Chessboard === 'undefined') {
        console.error('Chessboard.js library not loaded!');
        setTimeout(initializeApp, 100); // Retry after 100ms
        return;
    }
    
    if (typeof $ === 'undefined') {
        console.error('jQuery library not loaded!');
        setTimeout(initializeApp, 100); // Retry after 100ms
        return;
    }
    
    // All libraries loaded, initialize app
    console.log('All libraries loaded, initializing app...');
    
    // Initialize game
    try {
        game = new Chess();
        console.log('Chess game initialized');
    } catch (error) {
        console.error('Error initializing Chess:', error);
        alert('Error initializing chess game. Please refresh the page.');
        return;
    }
    
    initializeBoard();
    initializeVoiceRecognition();
    initializeSounds();
    setupEventListeners();
    updateStatus();
    updateSoundButton(); // Initialize sound button state
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM is already ready
    initializeApp();
}

// ===========================
// Board Setup
// ===========================

function initializeBoard() {
    try {
        const config = {
            draggable: true,
            position: 'start',
            pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
            onDragStart: onDragStart,
            onDrop: onDrop,
            onSnapEnd: onSnapEnd,
            appearSpeed: 100,
            moveSpeed: 150,
            snapSpeed: 50,
            trashSpeed: 100
        };
        
        board = Chessboard('myBoard', config);
        
        if (!board) {
            throw new Error('Failed to initialize chessboard');
        }
        
        // Resize board after a short delay to ensure container is rendered
        // Use requestAnimationFrame for smoother rendering
        requestAnimationFrame(() => {
            setTimeout(() => {
                if (board && typeof board.resize === 'function') {
                    board.resize();
                }
                // Force resize by setting explicit size
                const boardElement = document.getElementById('myBoard');
                if (boardElement) {
                    const container = boardElement.parentElement;
                    if (container) {
                        const containerWidth = container.offsetWidth;
                        const boardSize = Math.min(containerWidth - 40, 500); // 40px for padding
                        boardElement.style.width = boardSize + 'px';
                        boardElement.style.height = boardSize + 'px';
                        if (board && typeof board.resize === 'function') {
                            board.resize();
                        }
                    }
                }
            }, 100);
        });
        
        // Also resize on window resize
        window.addEventListener('resize', () => {
            if (board && typeof board.resize === 'function') {
                board.resize();
            }
        });
        
        console.log('Chessboard initialized successfully');
    } catch (error) {
        console.error('Error initializing board:', error);
        alert('Error initializing chess board. Please refresh the page.');
    }
}

function onDragStart(source, piece, position, orientation) {
    if (!game) return false;
    
    // Prevent dragging if game is over
    if (game.isGameOver && game.isGameOver()) {
        return false;
    }
    
    // Prevent dragging opponent's pieces
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
}

function onDrop(source, target) {
    if (!game) return 'snapback';
    
    try {
        const move = game.move({
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
            board.position(game.fen());
        });
        updateStatus();
        analyzePosition();
        return true;
    } catch (error) {
        console.error('Error making move:', error);
        return 'snapback';
    }
}

function onSnapEnd() {
    if (board && game) {
        // Use requestAnimationFrame for smoother updates
        requestAnimationFrame(() => {
            board.position(game.fen());
        });
    }
}

// ===========================
// Voice Recognition
// ===========================

function initializeVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        document.getElementById('voiceStatus').textContent = 
            'Voice recognition not supported in this browser. Please use Chrome or Edge.';
        document.getElementById('voiceBtn').disabled = true;
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
        isListening = true;
        updateVoiceUI();
        document.getElementById('voiceStatus').textContent = 'Listening... Say a move!';
    };
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim();
        document.getElementById('voiceTranscript').textContent = `Heard: "${transcript}"`;
        
        // Parse and make move
        setTimeout(() => {
            parseAndMakeMove(transcript);
        }, 100);
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        document.getElementById('voiceStatus').textContent = 
            `Error: ${event.error}. Click to try again.`;
        isListening = false;
        updateVoiceUI();
    };
    
    recognition.onend = () => {
        isListening = false;
        updateVoiceUI();
        if (document.getElementById('voiceBtn').classList.contains('listening')) {
            // If still in listening mode, restart
            setTimeout(() => {
                if (document.getElementById('voiceBtn').classList.contains('listening')) {
                    recognition.start();
                }
            }, 100);
        } else {
            document.getElementById('voiceStatus').textContent = 'Click to start voice recognition';
        }
    };
}

function toggleVoiceRecognition() {
    if (!recognition) {
        alert('Voice recognition not available');
        return;
    }
    
    if (isListening) {
        recognition.stop();
        document.getElementById('voiceBtn').classList.remove('listening');
        document.getElementById('voiceStatus').textContent = 'Voice recognition stopped';
    } else {
        recognition.start();
        document.getElementById('voiceBtn').classList.add('listening');
    }
}

function updateVoiceUI() {
    const btn = document.getElementById('voiceBtn');
    const btnText = document.getElementById('voiceBtnText');
    
    if (isListening) {
        btnText.textContent = '🎤 Listening...';
    } else {
        btnText.textContent = '🎤 Start Voice';
    }
}

// ===========================
// Sound Effects
// ===========================

function initializeSounds() {
    try {
        // Use Lichess open-source sound files
        moveSound = new Audio('https://lichess1.org/assets/sound/standard/Move.mp3');
        captureSound = new Audio('https://lichess1.org/assets/sound/standard/Capture.mp3');

        [moveSound, captureSound].forEach(audio => {
            audio.crossOrigin = 'anonymous';
            audio.preload = 'auto';
        });
        
        // Preload sounds
        moveSound.load();
        captureSound.load();
        
        // Set volume
        moveSound.volume = 0.5;
        captureSound.volume = 0.5;
        
        console.log('Sounds initialized');
    } catch (error) {
        console.log('Could not initialize sounds:', error);
        soundEnabled = false;
    }
}

function playMoveSound({ isCapture = false } = {}) {
    if (!soundEnabled) return;
    
    try {
        let sound = moveSound;
        if (isCapture && captureSound) {
            sound = captureSound;
        }
        
        // Reset and play
        sound.currentTime = 0;
        sound.play().catch(e => {
            console.log('Could not play sound:', e);
            // Browsers may block autoplay - that's ok
        });
    } catch (error) {
        console.log('Error playing sound:', error);
    }
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    updateSoundButton();
    
    // Play a test sound when enabling
    if (soundEnabled) {
        setTimeout(() => playMoveSound(), 100);
    }
}

function updateSoundButton() {
    const btn = document.getElementById('soundBtn');
    if (!btn) return;
    
    if (soundEnabled) {
        btn.textContent = '🔊 Sound';
        btn.classList.remove('muted');
        btn.title = 'Sound on (click to toggle)';
    } else {
        btn.textContent = '🔇 Sound';
        btn.classList.add('muted');
        btn.title = 'Sound off (click to toggle)';
    }
}

// ===========================
// Voice Recognition Corrections
// ===========================

const VOICE_CORRECTIONS = {
    // Common misrecognitions for "a" column
    'asics': 'a6',
    'a six': 'a6',
    'a-six': 'a6',
    'a 6': 'a6',
    'a-6': 'a6',
    'ace six': 'a6',
    'ace 6': 'a6',
    'hey six': 'a6',
    'hey 6': 'a6',
    'ay six': 'a6',
    'ay 6': 'a6',
    'a for': 'a4',
    'a-four': 'a4',
    'a four': 'a4',
    'a-4': 'a4',
    'a 4': 'a4',
    'hey four': 'a4',
    'hey 4': 'a4',
    'a five': 'a5',
    'a-five': 'a5',
    'a 5': 'a5',
    'a-5': 'a5',
    'a three': 'a3',
    'a 3': 'a3',
    'a two': 'a2',
    'a 2': 'a2',
    'a one': 'a1',
    'a 1': 'a1',
    'a seven': 'a7',
    'a 7': 'a7',
    'a eight': 'a8',
    'a 8': 'a8',
    // Common misrecognitions for "c" column - "see" is very common
    'see one': 'c1',
    'see 1': 'c1',
    'sea one': 'c1',
    'sea 1': 'c1',
    'see two': 'c2',
    'see 2': 'c2',
    'sea two': 'c2',
    'sea 2': 'c2',
    'see three': 'c3',
    'see 3': 'c3',
    'sea three': 'c3',
    'sea 3': 'c3',
    'see four': 'c4',
    'see 4': 'c4',
    'sea four': 'c4',
    'sea 4': 'c4',
    'see for': 'c4',
    'sea for': 'c4',
    'see five': 'c5',
    'see 5': 'c5',
    'sea five': 'c5',
    'sea 5': 'c5',
    'see six': 'c6',
    'see 6': 'c6',
    'sea six': 'c6',
    'sea 6': 'c6',
    'see seven': 'c7',
    'see 7': 'c7',
    'sea seven': 'c7',
    'sea 7': 'c7',
    'see eight': 'c8',
    'see 8': 'c8',
    'sea eight': 'c8',
    'sea 8': 'c8',
    'c for': 'c4',
    'c-four': 'c4',
    'c four': 'c4',
    'c-4': 'c4',
    'c 4': 'c4',
    'c 5': 'c5',
    'c 6': 'c6',
    'c 3': 'c3',
    'c 2': 'c2',
    'c 1': 'c1',
    'c 7': 'c7',
    'c 8': 'c8',
    // Common misrecognitions for "b" column
    'be one': 'b1',
    'be 1': 'b1',
    'bee one': 'b1',
    'bee 1': 'b1',
    'be two': 'b2',
    'be 2': 'b2',
    'bee two': 'b2',
    'bee 2': 'b2',
    'be three': 'b3',
    'be 3': 'b3',
    'bee three': 'b3',
    'bee 3': 'b3',
    'be four': 'b4',
    'be 4': 'b4',
    'bee four': 'b4',
    'bee 4': 'b4',
    'be for': 'b4',
    'bee for': 'b4',
    'be five': 'b5',
    'be 5': 'b5',
    'bee five': 'b5',
    'bee 5': 'b5',
    'be six': 'b6',
    'be 6': 'b6',
    'bee six': 'b6',
    'bee 6': 'b6',
    'be seven': 'b7',
    'be 7': 'b7',
    'bee seven': 'b7',
    'bee 7': 'b7',
    'be eight': 'b8',
    'be 8': 'b8',
    'bee eight': 'b8',
    'bee 8': 'b8',
    'b for': 'b4',
    'b-four': 'b4',
    'b four': 'b4',
    'b-4': 'b4',
    'b 4': 'b4',
    // Common misrecognitions for "e" column
    'e-cigs': 'e6',
    'e cigs': 'e6',
    'e-cig': 'e6',
    'e cig': 'e6',
    'e cigs': 'e6',
    'e six': 'e6',
    'e-6': 'e6',
    'e 6': 'e6',
    'e for': 'e4',
    'e-four': 'e4',
    'e four': 'e4',
    'e-4': 'e4',
    'e 4': 'e4',
    'e five': 'e5',
    'e 5': 'e5',
    'e three': 'e3',
    'e 3': 'e3',
    'e two': 'e2',
    'e 2': 'e2',
    'e one': 'e1',
    'e 1': 'e1',
    'e seven': 'e7',
    'e 7': 'e7',
    'e eight': 'e8',
    'e 8': 'e8',
    // Common misrecognitions for "d" column
    'd for': 'd4',
    'd-four': 'd4',
    'd four': 'd4',
    'd-4': 'd4',
    'd 4': 'd4',
    'd five': 'd5',
    'd-five': 'd5',
    'd-5': 'd5',
    'd 5': 'd5',
    'd six': 'd6',
    'd 6': 'd6',
    'd three': 'd3',
    'd 3': 'd3',
    'd two': 'd2',
    'd 2': 'd2',
    'd one': 'd1',
    'd 1': 'd1',
    'd seven': 'd7',
    'd 7': 'd7',
    'd eight': 'd8',
    'd 8': 'd8',
    // Common misrecognitions for "f" column
    'f for': 'f4',
    'f-four': 'f4',
    'f four': 'f4',
    'f-4': 'f4',
    'f 4': 'f4',
    'f 5': 'f5',
    'f 6': 'f6',
    'f 3': 'f3',
    'f 2': 'f2',
    'f 1': 'f1',
    'f 7': 'f7',
    'f 8': 'f8',
    // Common misrecognitions for "g" column
    'g for': 'g4',
    'g-four': 'g4',
    'g four': 'g4',
    'g-4': 'g4',
    'g 4': 'g4',
    'gee four': 'g4',
    'gee 4': 'g4',
    'g 5': 'g5',
    'g 6': 'g6',
    'g 3': 'g3',
    'g 2': 'g2',
    'g 1': 'g1',
    'g 7': 'g7',
    'g 8': 'g8',
    // Common misrecognitions for "h" column
    'h 4': 'h4',
    'h 5': 'h5',
    'h 6': 'h6',
    'h 3': 'h3',
    'h 2': 'h2',
    'h 1': 'h1',
    'h 7': 'h7',
    'h 8': 'h8',
    'age four': 'h4',
    'age 4': 'h4',
    'ache four': 'h4',
    // Numbers
    'six': '6',
    'five': '5',
    'four': '4',
    'three': '3',
    'two': '2',
    'one': '1',
    'seven': '7',
    'eight': '8',
    // Common piece misrecognitions - Knight
    'night': 'knight',
    'nite': 'knight',
    'knit': 'knight',
    'neat': 'knight',
    'knife': 'knight',
    'lite': 'knight',
    'right': 'knight',
    'knight f': 'nf',
    'knight e': 'ne',
    'knight d': 'nd',
    'knight c': 'nc',
    'knight b': 'nb',
    'knight a': 'na',
    'knight g': 'ng',
    'knight h': 'nh',
    'night f': 'nf',
    'night e': 'ne',
    'night d': 'nd',
    'night c': 'nc',
    'night b': 'nb',
    'night a': 'na',
    'night g': 'ng',
    'night h': 'nh',
    // Common piece misrecognitions - Rook
    'brook': 'rook',
    'brooke': 'rook',
    'rock': 'rook',
    'rookie': 'rook',
    'ruck': 'rook',
    'roof': 'rook',
    'route': 'rook',
    'root': 'rook',
    'look': 'rook',
    'brook f': 'rf',
    'brook e': 're',
    'brook d': 'rd',
    'brook c': 'rc',
    'brook b': 'rb',
    'brook a': 'ra',
    'brook g': 'rg',
    'brook h': 'rh',
    'rock f': 'rf',
    'rock e': 're',
    'rock d': 'rd',
    'rock c': 'rc',
    'rock b': 'rb',
    'rock a': 'ra',
    'rock g': 'rg',
    'rock h': 'rh',
    'rook f': 'rf',
    'rook e': 're',
    'rook d': 'rd',
    'rook c': 'rc',
    'rook b': 'rb',
    'rook a': 'ra',
    'rook g': 'rg',
    'rook h': 'rh',
    // Common piece misrecognitions - Bishop
    'dish up': 'bishop',
    'bishup': 'bishop',
    'bish up': 'bishop',
    'dish of': 'bishop',
    'fish up': 'bishop',
    'bishopric': 'bishop',
    'bishoff': 'bishop',
    'bishop f': 'bf',
    'bishop e': 'be',
    'bishop d': 'bd',
    'bishop c': 'bc',
    'bishop b': 'bb',
    'bishop a': 'ba',
    'bishop g': 'bg',
    'bishop h': 'bh',
    // Common piece misrecognitions - Queen
    'green': 'queen',
    'cream': 'queen',
    'quean': 'queen',
    'ween': 'queen',
    'clean': 'queen',
    'keen': 'queen',
    'queen f': 'qf',
    'queen e': 'qe',
    'queen d': 'qd',
    'queen c': 'qc',
    'queen b': 'qb',
    'queen a': 'qa',
    'queen g': 'qg',
    'queen h': 'qh',
    // Common piece misrecognitions - King
    'thing': 'king',
    'sing': 'king',
    'kin': 'king',
    'keen': 'king',
    'pink': 'king',
    'ring': 'king',
    'king f': 'kf',
    'king e': 'ke',
    'king d': 'kd',
    'king c': 'kc',
    'king b': 'kb',
    'king a': 'ka',
    'king g': 'kg',
    'king h': 'kh',
    // Takes/captures
    'takes': 'x',
    'take': 'x',
    'captures': 'x',
    'capture': 'x',
    'times': 'x',
    // Castling
    'castles': 'castle',
    'castling': 'castle',
    'king side': 'kingside',
    'queen side': 'queenside',
    'short castle': 'castle kingside',
    'long castle': 'castle queenside',
    // Board commands
    'reset board': 'reset',
    'restart board': 'reset',
    'clear board': 'reset',
    'flip board': 'flip',
    'rotate board': 'flip',
    'turn board': 'flip',
    'undo move': 'undo',
    'go back': 'undo',
    'previous move': 'undo',
};

function correctVoiceInput(text) {
    // Convert to lowercase for matching
    let corrected = text.toLowerCase().trim();
    
    // Remove "check" from the end of moves (it's just annotation and can confuse parsing)
    corrected = corrected.replace(/\s*check\s*$/gi, '');
    corrected = corrected.replace(/\s*\+\s*$/gi, '');
    
    // Apply corrections from the dictionary
    for (const [wrong, correct] of Object.entries(VOICE_CORRECTIONS)) {
        // Replace whole word matches
        const regex = new RegExp(`\\b${wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        corrected = corrected.replace(regex, correct);
    }
    
    // Handle "see/sea" as "c" column (very common misrecognition)
    corrected = corrected.replace(/\b(see|sea)[- ]?([1-8])\b/gi, 'c$2');
    corrected = corrected.replace(/\b(see|sea)[- ]?(one)\b/gi, 'c1');
    corrected = corrected.replace(/\b(see|sea)[- ]?(two)\b/gi, 'c2');
    corrected = corrected.replace(/\b(see|sea)[- ]?(three)\b/gi, 'c3');
    corrected = corrected.replace(/\b(see|sea)[- ]?(four|for)\b/gi, 'c4');
    corrected = corrected.replace(/\b(see|sea)[- ]?(five)\b/gi, 'c5');
    corrected = corrected.replace(/\b(see|sea)[- ]?(six)\b/gi, 'c6');
    corrected = corrected.replace(/\b(see|sea)[- ]?(seven)\b/gi, 'c7');
    corrected = corrected.replace(/\b(see|sea)[- ]?(eight)\b/gi, 'c8');
    
    // Handle "be/bee" as "b" column
    corrected = corrected.replace(/\b(be|bee)[- ]?([1-8])\b/gi, 'b$2');
    corrected = corrected.replace(/\b(be|bee)[- ]?(one)\b/gi, 'b1');
    corrected = corrected.replace(/\b(be|bee)[- ]?(two)\b/gi, 'b2');
    corrected = corrected.replace(/\b(be|bee)[- ]?(three)\b/gi, 'b3');
    corrected = corrected.replace(/\b(be|bee)[- ]?(four|for)\b/gi, 'b4');
    corrected = corrected.replace(/\b(be|bee)[- ]?(five)\b/gi, 'b5');
    corrected = corrected.replace(/\b(be|bee)[- ]?(six)\b/gi, 'b6');
    corrected = corrected.replace(/\b(be|bee)[- ]?(seven)\b/gi, 'b7');
    corrected = corrected.replace(/\b(be|bee)[- ]?(eight)\b/gi, 'b8');
    
    // Handle "a" column misrecognitions (asics, hey, ay, ace)
    corrected = corrected.replace(/\basics\b/gi, 'a6');
    corrected = corrected.replace(/\b(hey|ay|ace)[- ]?([1-8])\b/gi, 'a$2');
    corrected = corrected.replace(/\b(hey|ay|ace)[- ]?(one)\b/gi, 'a1');
    corrected = corrected.replace(/\b(hey|ay|ace)[- ]?(two)\b/gi, 'a2');
    corrected = corrected.replace(/\b(hey|ay|ace)[- ]?(three)\b/gi, 'a3');
    corrected = corrected.replace(/\b(hey|ay|ace)[- ]?(four|for)\b/gi, 'a4');
    corrected = corrected.replace(/\b(hey|ay|ace)[- ]?(five)\b/gi, 'a5');
    corrected = corrected.replace(/\b(hey|ay|ace)[- ]?(six)\b/gi, 'a6');
    corrected = corrected.replace(/\b(hey|ay|ace)[- ]?(seven)\b/gi, 'a7');
    corrected = corrected.replace(/\b(hey|ay|ace)[- ]?(eight)\b/gi, 'a8');
    
    // Handle patterns like "e-cigs" -> "e6"
    corrected = corrected.replace(/\be[- ]?cigs?\b/gi, 'e6');
    corrected = corrected.replace(/\be[- ]?six\b/gi, 'e6');
    corrected = corrected.replace(/\be[- ]?for\b/gi, 'e4');
    corrected = corrected.replace(/\bd[- ]?for\b/gi, 'd4');
    corrected = corrected.replace(/\bc[- ]?for\b/gi, 'c4');
    corrected = corrected.replace(/\bf[- ]?for\b/gi, 'f4');
    corrected = corrected.replace(/\bg[- ]?for\b/gi, 'g4');
    corrected = corrected.replace(/\ba[- ]?for\b/gi, 'a4');
    corrected = corrected.replace(/\bb[- ]?for\b/gi, 'b4');
    
    // Handle "gee" as "g" column
    corrected = corrected.replace(/\bgee[- ]?([1-8])\b/gi, 'g$1');
    corrected = corrected.replace(/\bgee[- ]?(one)\b/gi, 'g1');
    corrected = corrected.replace(/\bgee[- ]?(two)\b/gi, 'g2');
    corrected = corrected.replace(/\bgee[- ]?(three)\b/gi, 'g3');
    corrected = corrected.replace(/\bgee[- ]?(four|for)\b/gi, 'g4');
    corrected = corrected.replace(/\bgee[- ]?(five)\b/gi, 'g5');
    corrected = corrected.replace(/\bgee[- ]?(six)\b/gi, 'g6');
    corrected = corrected.replace(/\bgee[- ]?(seven)\b/gi, 'g7');
    corrected = corrected.replace(/\bgee[- ]?(eight)\b/gi, 'g8');
    
    // Handle piece name misrecognitions with regex
    // Knight variations
    corrected = corrected.replace(/\b(night|nite|knit|neat|knife)\b/gi, 'knight');
    // Rook variations
    corrected = corrected.replace(/\b(brook|brooke|rock|rookie|ruck|roof|route|root)\b/gi, 'rook');
    // Bishop variations  
    corrected = corrected.replace(/\b(dish ?up|bish ?up|bishup|fish ?up)\b/gi, 'bishop');
    // Queen variations
    corrected = corrected.replace(/\b(quean|ween)\b/gi, 'queen');
    // Note: "green", "cream", "clean" are too common as regular words, kept only in dictionary
    
    // Handle piece + column patterns (e.g., "brook to e4" -> "rook to e4")
    corrected = corrected.replace(/\b(night|nite)[- ]?([a-h])/gi, 'knight $2');
    corrected = corrected.replace(/\b(brook|brooke|rock)[- ]?([a-h])/gi, 'rook $2');
    
    return corrected;
}

// ===========================
// Move Parsing
// ===========================

function parseAndMakeMove(voiceText) {
    if (!game) {
        console.error('Game not initialized');
        return;
    }
    
    // Normalize and correct the input
    let text = voiceText.toLowerCase().trim();
    
    // Apply voice recognition corrections FIRST (before removing words)
    text = correctVoiceInput(text);
    
    console.log(`Original: "${voiceText}" -> Corrected: "${text}"`);
    
    // Handle voice commands first (before parsing as moves)
    // Check for exact matches or phrases containing these commands
    const resetCommands = ['reset', 'restart', 'clear', 'new game', 'start over'];
    const flipCommands = ['flip', 'rotate', 'turn', 'switch'];
    const undoCommands = ['undo', 'back', 'previous', 'go back', 'take back'];
    const soundOnCommands = ['sound on', 'enable sound', 'turn on sound', 'unmute'];
    const soundOffCommands = ['sound off', 'disable sound', 'turn off sound', 'mute'];
    
    if (resetCommands.some(cmd => text.includes(cmd))) {
        resetGame();
        document.getElementById('voiceStatus').textContent = 'Board reset';
        return;
    }
    
    if (flipCommands.some(cmd => text.includes(cmd)) && !text.includes('move')) {
        // Only flip if it's not part of a move command
        flipBoard();
        document.getElementById('voiceStatus').textContent = 'Board flipped';
        return;
    }
    
    if (undoCommands.some(cmd => text.includes(cmd))) {
        undoMove();
        document.getElementById('voiceStatus').textContent = 'Move undone';
        return;
    }
    
    if (soundOnCommands.some(cmd => text.includes(cmd))) {
        if (!soundEnabled) {
            toggleSound();
        }
        document.getElementById('voiceStatus').textContent = 'Sound enabled';
        return;
    }
    
    if (soundOffCommands.some(cmd => text.includes(cmd))) {
        if (soundEnabled) {
            toggleSound();
        }
        document.getElementById('voiceStatus').textContent = 'Sound disabled';
        return;
    }
    
    // Remove common filler words (but keep chess notation)
    const cleaned = text.replace(/\b(move|play|to|the|square)\b/gi, ' ').trim();
    
    // Try to parse as standard algebraic notation
    let move = null;
    
    // Handle special cases
    if (text.includes('castle') || text.includes('castles')) {
        if (text.includes('king') || text.includes('short')) {
            move = game.turn() === 'w' ? 'O-O' : 'O-O';
        } else if (text.includes('queen') || text.includes('long')) {
            move = game.turn() === 'w' ? 'O-O-O' : 'O-O-O';
        }
    } else if (text.includes('resign')) {
        alert('Game resigned');
        document.getElementById('voiceStatus').textContent = 'Game resigned';
        return;
    } else {
        // Try to parse standard notation
        // Examples: "e4", "knight f3", "nf3", "e takes d5", "exd5"
        
        // Remove "takes" or "captures" and replace with "x"
        let notation = cleaned.replace(/\b(takes|captures|capture)\b/gi, 'x');
        
        // Handle piece names
        notation = notation.replace(/\bknight\b/gi, 'N');
        notation = notation.replace(/\bbishop\b/gi, 'B');
        notation = notation.replace(/\brook\b/gi, 'R');
        notation = notation.replace(/\bqueen\b/gi, 'Q');
        notation = notation.replace(/\bking\b/gi, 'K');
        
        // Remove spaces
        notation = notation.replace(/\s+/g, '');
        
        // Try common patterns
        const patterns = [
            /^([a-h][1-8])$/,  // e4, d5
            /^([NBRQK]?[a-h]?[1-8]?x?[a-h][1-8])$/,  // Nf3, exd5, Qe2
            /^([a-h]x[a-h][1-8])$/,  // exd5
        ];
        
        // Try the cleaned notation
        move = notation;
    }
    
    if (move) {
        try {
            // Try to make the move
            const result = game.move(move);
            if (result) {
                // Play sound
                playMoveSound({ isCapture: result.captured !== undefined });
                
                if (board) {
                    // Use requestAnimationFrame for smoother updates
                    requestAnimationFrame(() => {
                        board.position(game.fen());
                    });
                }
                updateStatus();
                analyzePosition();
                document.getElementById('voiceStatus').textContent = `Move made: ${result.san}`;
            } else {
                // Try alternative parsing
                tryAlternativeParsing(text);
            }
        } catch (error) {
            console.error('Error making move:', error);
            tryAlternativeParsing(text);
        }
    } else {
        document.getElementById('voiceStatus').textContent = 
            `Could not parse: "${voiceText}". Try saying moves like "e4", "knight f3", or "castle kingside"`;
    }
}

function tryAlternativeParsing(text) {
    // Try to extract square names
    const squarePattern = /([a-h][1-8])/gi;
    const squares = text.match(squarePattern);
    
    if (squares && squares.length >= 2) {
        // Try as from-to move
        const from = squares[0];
        const to = squares[1];
        try {
            const moveObj = { from, to, promotion: 'q' };
            const result = game.move(moveObj);
            if (result) {
                // Play sound
                playMoveSound({ isCapture: result.captured !== undefined });
                
                if (board) {
                    // Use requestAnimationFrame for smoother updates
                    requestAnimationFrame(() => {
                        board.position(game.fen());
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

// ===========================
// API Calls
// ===========================

async function analyzePosition() {
    if (!game) {
        console.error('Game not initialized');
        return;
    }
    
    const fen = game.fen();
    
    // Update FEN display
    document.getElementById('fen').textContent = fen;
    
    // Show loading
    document.getElementById('engineMoves').innerHTML = '<p class="loading">Analyzing...</p>';
    document.getElementById('masterMoves').innerHTML = '<p class="loading">Loading master games...</p>';
    
    // Fetch engine moves and master moves in parallel
    try {
        const [engineResponse, masterResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/top-moves/?fen=${encodeURIComponent(fen)}&depth=15&num_moves=5`),
            fetch(`${API_BASE_URL}/master-moves/?fen=${encodeURIComponent(fen)}`)
        ]);
        
        if (!engineResponse.ok) {
            throw new Error(`Engine API error: ${engineResponse.status}`);
        }
        if (!masterResponse.ok) {
            throw new Error(`Master games API error: ${masterResponse.status}`);
        }
        
        const engineData = await engineResponse.json();
        const masterData = await masterResponse.json();
        
        displayEngineMoves(engineData.moves || []);
        displayMasterMoves(masterData);
    } catch (error) {
        console.error('Error fetching analysis:', error);
        document.getElementById('engineMoves').innerHTML = 
            `<p class="placeholder">Error loading analysis: ${error.message}<br>Make sure the backend is running on http://127.0.0.1:8000</p>`;
        document.getElementById('masterMoves').innerHTML = 
            `<p class="placeholder">Error loading master games: ${error.message}</p>`;
    }
}

function displayEngineMoves(moves) {
    const container = document.getElementById('engineMoves');
    
    if (!moves || moves.length === 0) {
        container.innerHTML = '<p class="placeholder">No moves found</p>';
        return;
    }
    
    container.innerHTML = moves.map((move, index) => {
        const evalText = move.type === 'mate' 
            ? `Mate in ${Math.abs(move.evaluation)}`
            : move.evaluation > 0 
                ? `+${move.evaluation.toFixed(2)}`
                : move.evaluation.toFixed(2);
        
        const evalClass = move.type === 'mate' ? 'mate' : '';
        
        return `
            <div class="move-item">
                <span class="move-name">${index + 1}. ${move.move}</span>
                <span class="move-eval ${evalClass}">${evalText}</span>
            </div>
        `;
    }).join('');
}

function displayMasterMoves(data) {
    const container = document.getElementById('masterMoves');
    
    if (data.error) {
        container.innerHTML = `<p class="placeholder">Error: ${data.error}</p>`;
        return;
    }
    
    if (!data.found || !data.moves || data.moves.length === 0) {
        container.innerHTML = '<p class="placeholder">Position not found in Lichess master games database</p>';
        return;
    }
    
    const moves = data.moves || [];
    const totalGames = data.total_games || 0;
    
    let html = '';
    
    if (totalGames > 0) {
        html += `<p style="margin-bottom: 10px; color: #666; font-size: 0.9em;">
            <strong>${totalGames.toLocaleString()}</strong> master games from this position
        </p>`;
    }
    
    html += '<h3 style="color: #667eea; margin-top: 10px; margin-bottom: 10px;">Top Master Moves:</h3>';
    
    moves.forEach((moveData, index) => {
        const move = moveData.move;
        const total = moveData.total || 0;
        const white = moveData.white || 0;
        const draws = moveData.draws || 0;
        const black = moveData.black || 0;
        const avgRating = moveData.average_rating || 0;
        
        // Calculate percentages
        const whitePct = total > 0 ? ((white / total) * 100).toFixed(1) : 0;
        const drawPct = total > 0 ? ((draws / total) * 100).toFixed(1) : 0;
        const blackPct = total > 0 ? ((black / total) * 100).toFixed(1) : 0;
        
        html += `
            <div class="move-item master-move">
                <div style="flex: 1;">
                    <span class="move-name">${index + 1}. ${move}</span>
                    <div style="font-size: 0.85em; color: #666; margin-top: 4px;">
                        <span style="color: #27ae60;">W: ${whitePct}%</span> | 
                        <span style="color: #f39c12;">D: ${drawPct}%</span> | 
                        <span style="color: #e74c3c;">B: ${blackPct}%</span>
                        ${avgRating > 0 ? ` | Avg: ${Math.round(avgRating)}` : ''}
                    </div>
                </div>
                <span class="move-eval" style="font-size: 0.9em; color: #666;">
                    ${total.toLocaleString()} games
                </span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}


// ===========================
// Event Listeners
// ===========================

function setupEventListeners() {
    document.getElementById('voiceBtn').addEventListener('click', toggleVoiceRecognition);
    document.getElementById('resetBtn').addEventListener('click', resetGame);
    document.getElementById('undoBtn').addEventListener('click', undoMove);
    document.getElementById('flipBtn').addEventListener('click', flipBoard);
    document.getElementById('soundBtn').addEventListener('click', toggleSound);
}

function resetGame() {
    if (!game || !board) return;
    
    game.reset();
    
    // Use requestAnimationFrame for smoother updates
    requestAnimationFrame(() => {
        board.position('start');
        board.orientation('white');
    });
    
    updateStatus();
    document.getElementById('engineMoves').innerHTML = 
        '<p class="placeholder">Make a move to see engine analysis</p>';
    document.getElementById('masterMoves').innerHTML = 
        '<p class="placeholder">Make a move to see master games</p>';
}

function undoMove() {
    if (!game || !board) return;
    
    const move = game.undo();
    if (move) {
        // Use requestAnimationFrame for smoother updates
        requestAnimationFrame(() => {
            board.position(game.fen());
        });
        updateStatus();
        analyzePosition();
    }
}

function flipBoard() {
    if (!board) return;
    
    const currentOrientation = board.orientation();
    // Use requestAnimationFrame for smoother updates
    requestAnimationFrame(() => {
        board.orientation(currentOrientation === 'white' ? 'black' : 'white');
    });
}

// ===========================
// Status Updates
// ===========================

function updateStatus() {
    if (!game) {
        console.error('Game not initialized');
        return;
    }
    
    let status = '';
    const moveColor = game.turn() === 'w' ? 'White' : 'Black';
    
    try {
        if (game.isCheckmate && game.isCheckmate()) {
            status = `Game over, ${moveColor} is in checkmate.`;
        } else if (game.isDraw && game.isDraw()) {
            status = 'Game over, drawn position.';
        } else if (game.isStalemate && game.isStalemate()) {
            status = 'Game over, stalemate.';
        } else {
            status = `${moveColor} to move`;
            if (game.isCheck && game.isCheck()) {
                status += `, ${moveColor} is in check.`;
            }
        }
        
        document.getElementById('status').textContent = status;
        document.getElementById('fen').textContent = game.fen();
        
        // Update move history
        const history = game.history();
        document.getElementById('moveHistory').textContent = 
            history.length > 0 ? history.join(' ') : 'No moves yet';
    } catch (error) {
        console.error('Error updating status:', error);
        document.getElementById('status').textContent = 'Error: ' + error.message;
    }
}

