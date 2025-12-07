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
let outOfBookSound = null;

// Store last engine analysis for "takes" command
let lastEngineMoves = [];

// Pause mode - ignores all commands except "resume"
let isPaused = false;

// Flag to prevent recognition.onend from updating UI while processing a command
let isProcessingVoiceCommand = false;

// Engine play mode: null = analysis mode, 'w' = engine plays white, 'b' = engine plays black
let enginePlaysColor = null;

// Grandmaster mode: if true, randomly select from top master games instead of weighted by distribution
let grandmasterMode = false;

// Store last master moves for engine play
let lastMasterMoves = [];
let lastTopGames = []; // Store top games for grandmaster mode
let lastGrandmasterInfo = null; // Store info about the grandmaster who played the last move

// Track if we were previously in book (for out-of-book notification)
let wasInBook = true;

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
    
    // Set default color selection (white) - only if elements exist
    try {
        const whiteBtn = document.getElementById('engineWhiteBtn');
        if (whiteBtn) {
            whiteBtn.classList.add('active');
        }
        updateEngineModeUI(); // Initialize engine mode UI
    } catch (error) {
        console.error('Error initializing engine mode UI:', error);
        // Don't block initialization if engine controls fail
    }
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
        
        console.log('Chessboard initialized successfully');
        
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

// Track recognition state to prevent rapid restarts
let recognitionRestarting = false;
let lastRecognitionStart = 0;

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
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
        isListening = true;
        recognitionRestarting = false;
        lastRecognitionStart = Date.now();
        updateVoiceUI();
        document.getElementById('voiceStatus').textContent = 'Listening... Say a move!';
    };
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim();
        document.getElementById('voiceTranscript').textContent = `Heard: "${transcript}"`;
        
        // Mark that we're processing a command (prevents onend from updating UI)
        isProcessingVoiceCommand = true;
        
        // Stop recognition immediately to prevent appending new speech
        try {
            recognition.stop();
        } catch (e) {
            console.log('Could not stop recognition after result:', e);
        }
        
        // Parse and make move
        setTimeout(() => {
            parseAndMakeMove(transcript);
            // Clear the flag after a delay to allow speakMove to set isSpeaking
            setTimeout(() => {
                isProcessingVoiceCommand = false;
                
                // If not speaking, we need to restart recognition ourselves
                // (since onend returned early and didn't restart)
                if (!isSpeaking) {
                    const btn = document.getElementById('voiceBtn');
                    if (btn.classList.contains('listening')) {
                        // Mark that recognition has stopped (onend returned early so didn't set this)
                        isListening = false;
                        
                        setTimeout(() => {
                            // Double-check we're still not speaking and button still shows listening
                            if (!isSpeaking && btn.classList.contains('listening')) {
                                try {
                                    recognition.start();
                                    isListening = true;
                                    console.log('Restarted recognition after command processing');
                                } catch (e) {
                                    console.log('Could not restart recognition after command:', e);
                                    // Try again after a longer delay
                                    setTimeout(() => {
                                        if (!isSpeaking && btn.classList.contains('listening')) {
                                            try {
                                                recognition.start();
                                                isListening = true;
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
            }, 100);
        }, 50);
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        // Don't update UI if we're speaking or processing - these errors are expected
        if (isSpeaking || isProcessingVoiceCommand) {
            console.log('Recognition error while speaking/processing - ignoring:', event.error);
            return;
        }
        
        // Handle different error types
        switch (event.error) {
            case 'aborted':
                // Aborted is often caused by rapid restarts or system issues
                // Don't show error to user, just try to restart gracefully
                console.log('Recognition aborted, will restart...');
                return; // Don't update UI for aborted
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
                // Stop trying to listen
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
        
        isListening = false;
        updateVoiceUI();
    };
    
    recognition.onend = () => {
        const btn = document.getElementById('voiceBtn');
        
        // Don't update UI or restart if engine is speaking or processing a voice command
        if (isSpeaking || isProcessingVoiceCommand) {
            console.log('Recognition ended while speaking/processing - will resume after');
            return;
        }
        
        isListening = false;
        updateVoiceUI();
        
        if (btn.classList.contains('listening') && !recognitionRestarting) {
            // Restart quickly for short commands - reduced delay for faster response
            const timeSinceStart = Date.now() - lastRecognitionStart;
            // Reduced delay: minimum 100ms, maximum 200ms (was 300-500ms)
            const delay = Math.max(100, 200 - timeSinceStart);
            
            recognitionRestarting = true;
            
            setTimeout(() => {
                // Double-check we're not speaking before restarting
                if (btn.classList.contains('listening') && !isSpeaking) {
                    try {
                        recognition.start();
                    } catch (e) {
                        console.log('Could not restart recognition:', e);
                        // Wait a bit longer and try again
                        setTimeout(() => {
                            if (btn.classList.contains('listening') && !isSpeaking) {
                                try {
                                    recognition.start();
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
                recognitionRestarting = false;
            }, delay);
        } else if (!btn.classList.contains('listening')) {
            document.getElementById('voiceStatus').textContent = 'Click to start voice recognition';
        }
    };
    
    // Check microphone permission on init
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                // Permission granted, stop the test stream
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

function toggleVoiceRecognition() {
    if (!recognition) {
        alert('Voice recognition not available');
        return;
    }
    
    const btn = document.getElementById('voiceBtn');
    
    if (isListening || btn.classList.contains('listening')) {
        try {
            recognition.stop();
        } catch (e) {
            console.log('Error stopping recognition:', e);
        }
        btn.classList.remove('listening');
        recognitionRestarting = false;
        document.getElementById('voiceStatus').textContent = 'Voice recognition stopped';
    } else {
        try {
            recognition.start();
            btn.classList.add('listening');
        } catch (e) {
            console.error('Error starting recognition:', e);
            // Recognition might already be running, try stopping first
            try {
                recognition.stop();
                setTimeout(() => {
                    try {
                        recognition.start();
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

function updateVoiceUI() {
    const btn = document.getElementById('voiceBtn');
    const btnText = document.getElementById('voiceBtnText');
    
    if (isPaused) {
        btnText.textContent = '⏸️ Paused';
        btn.classList.add('paused');
    } else if (isListening) {
        btnText.textContent = '🎤 Listening...';
        btn.classList.remove('paused');
    } else {
        btnText.textContent = '🎤 Start Voice';
        btn.classList.remove('paused');
    }
}

function updatePauseUI() {
    const btn = document.getElementById('voiceBtn');
    const btnText = document.getElementById('voiceBtnText');
    
    if (isPaused) {
        btnText.textContent = '⏸️ Paused (say "resume")';
        btn.classList.add('paused');
        // Keep 'listening' class so recognition continues!
        // This allows us to hear "resume"
    } else {
        btn.classList.remove('paused');
        if (isListening || btn.classList.contains('listening')) {
            btnText.textContent = '🎤 Listening...';
            btn.classList.add('listening');
        }
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
        outOfBookSound = new Audio('https://lichess1.org/assets/sound/standard/GenericNotify.mp3');

        [moveSound, captureSound, outOfBookSound].forEach(audio => {
            audio.crossOrigin = 'anonymous';
            audio.preload = 'auto';
        });
        
        // Preload sounds
        moveSound.load();
        captureSound.load();
        outOfBookSound.load();
        
        // Set volume
        moveSound.volume = 0.5;
        captureSound.volume = 0.5;
        outOfBookSound.volume = 0.6;
        
        console.log('Sounds initialized');
    } catch (error) {
        console.log('Could not initialize sounds:', error);
        soundEnabled = false;
    }
}

function playOutOfBookSound() {
    if (!soundEnabled || !outOfBookSound) return;
    
    try {
        outOfBookSound.currentTime = 0;
        outOfBookSound.play().catch(e => {
            console.log('Could not play out of book sound:', e);
        });
    } catch (error) {
        console.log('Error playing out of book sound:', error);
    }
}

function playMoveSound({ isCapture = false } = {}) {
    if (!soundEnabled) return;
    
    try {
        let sound = moveSound;
        if (isCapture && captureSound) {
            sound = captureSound;
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
        btn.classList.remove('muted');
        btn.title = 'Sound on (click to mute)';
    } else {
        btn.classList.add('muted');
        btn.title = 'Sound off (click to unmute)';
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
    'before': 'b4',
    // Common misrecognitions for "e" column
    'e-cigs': 'e6',
    'e cigs': 'e6',
    'e-cig': 'e6',
    'e cig': 'e6',
    'e cigs': 'e6',
    'essex': 'e6',
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
    // Common misrecognitions for "f" column - "f" often heard as "off"
    'off 1': 'f1',
    'off 2': 'f2',
    'off 3': 'f3',
    'off 4': 'f4',
    'off 5': 'f5',
    'off 6': 'f6',
    'off 7': 'f7',
    'off 8': 'f8',
    'off one': 'f1',
    'off two': 'f2',
    'off three': 'f3',
    'off four': 'f4',
    'off five': 'f5',
    'off six': 'f6',
    'off seven': 'f7',
    'off eight': 'f8',
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
    'age for': 'h4',
    'age one': 'h1',
    'age 1': 'h1',
    'age two': 'h2',
    'age 2': 'h2',
    'age three': 'h3',
    'age 3': 'h3',
    'age five': 'h5',
    'age 5': 'h5',
    'age six': 'h6',
    'age 6': 'h6',
    'age seven': 'h7',
    'age 7': 'h7',
    'age eight': 'h8',
    'age 8': 'h8',
    'ache four': 'h4',
    'ache 4': 'h4',
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
    // "Knight e" sounds like numbers
    '90': 'ne',
    'ninety': 'ne',
    '90s': 'ne',
    '9e': 'ne',
    '9x': 'nex',
    '90 x': 'nex',
    'ninety x': 'nex',
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
    // "queenie" patterns - common voice misrecognition
    'queenie': 'queen e',
    'queeny': 'queen e',
    'queeni': 'queen e',
    'greeny': 'queen e',
    'queenie 1': 'qe1',
    'queenie 2': 'qe2',
    'queenie 3': 'qe3',
    'queenie 4': 'qe4',
    'queenie 5': 'qe5',
    'queenie 6': 'qe6',
    'queenie 7': 'qe7',
    'queenie 8': 'qe8',
    // Similar patterns for other columns
    'queena': 'queen a',
    'queenb': 'queen b',
    'queenc': 'queen c',
    'queend': 'queen d',
    'queenf': 'queen f',
    'queeng': 'queen g',
    'queenh': 'queen h',
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
    
    // Handle "off" as "f" column (very common misrecognition)
    corrected = corrected.replace(/\boff[- ]?([1-8])\b/gi, 'f$1');
    corrected = corrected.replace(/\boff[- ]?(one)\b/gi, 'f1');
    corrected = corrected.replace(/\boff[- ]?(two)\b/gi, 'f2');
    corrected = corrected.replace(/\boff[- ]?(three)\b/gi, 'f3');
    corrected = corrected.replace(/\boff[- ]?(four|for)\b/gi, 'f4');
    corrected = corrected.replace(/\boff[- ]?(five)\b/gi, 'f5');
    corrected = corrected.replace(/\boff[- ]?(six)\b/gi, 'f6');
    corrected = corrected.replace(/\boff[- ]?(seven)\b/gi, 'f7');
    corrected = corrected.replace(/\boff[- ]?(eight)\b/gi, 'f8');
    
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
    
    // Handle "age" as "h" column (very common misrecognition)
    corrected = corrected.replace(/\bage[- ]?([1-8])\b/gi, 'h$1');
    corrected = corrected.replace(/\bage[- ]?(one)\b/gi, 'h1');
    corrected = corrected.replace(/\bage[- ]?(two)\b/gi, 'h2');
    corrected = corrected.replace(/\bage[- ]?(three)\b/gi, 'h3');
    corrected = corrected.replace(/\bage[- ]?(four|for)\b/gi, 'h4');
    corrected = corrected.replace(/\bage[- ]?(five)\b/gi, 'h5');
    corrected = corrected.replace(/\bage[- ]?(six)\b/gi, 'h6');
    corrected = corrected.replace(/\bage[- ]?(seven)\b/gi, 'h7');
    corrected = corrected.replace(/\bage[- ]?(eight)\b/gi, 'h8');
    
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
    
    // Handle "age" after piece names (e.g., "knight age 4" -> "knight h4")
    corrected = corrected.replace(/\b(knight|bishop|rook|queen|king)\s+age[- ]?([1-8])\b/gi, '$1 h$2');
    corrected = corrected.replace(/\b(knight|bishop|rook|queen|king)\s+age[- ]?(one)\b/gi, '$1 h1');
    corrected = corrected.replace(/\b(knight|bishop|rook|queen|king)\s+age[- ]?(two)\b/gi, '$1 h2');
    corrected = corrected.replace(/\b(knight|bishop|rook|queen|king)\s+age[- ]?(three)\b/gi, '$1 h3');
    corrected = corrected.replace(/\b(knight|bishop|rook|queen|king)\s+age[- ]?(four|for)\b/gi, '$1 h4');
    corrected = corrected.replace(/\b(knight|bishop|rook|queen|king)\s+age[- ]?(five)\b/gi, '$1 h5');
    corrected = corrected.replace(/\b(knight|bishop|rook|queen|king)\s+age[- ]?(six)\b/gi, '$1 h6');
    corrected = corrected.replace(/\b(knight|bishop|rook|queen|king)\s+age[- ]?(seven)\b/gi, '$1 h7');
    corrected = corrected.replace(/\b(knight|bishop|rook|queen|king)\s+age[- ]?(eight)\b/gi, '$1 h8');
    
    // Handle piece + column patterns (e.g., "brook to e4" -> "rook to e4")
    corrected = corrected.replace(/\b(night|nite)[- ]?([a-h])/gi, 'knight $2');
    corrected = corrected.replace(/\b(brook|brooke|rock)[- ]?([a-h])/gi, 'rook $2');
    
    // Handle "queenie" patterns (queen + e merged)
    corrected = corrected.replace(/\bqueenie\s*([1-8])\b/gi, 'qe$1');
    corrected = corrected.replace(/\bqueeny\s*([1-8])\b/gi, 'qe$1');
    corrected = corrected.replace(/\bqueenie\b/gi, 'queen e');
    corrected = corrected.replace(/\bqueeny\b/gi, 'queen e');
    
    // Handle "piece + column + to + square" patterns (e.g., "knight g to e2" -> "knight g e2")
    // Remove "to" between disambiguation and target square
    // Also handle "two" being heard as "to" (e.g., "knight b two d2")
    corrected = corrected.replace(/\b(knight|bishop|rook|queen|king)\s+([a-h])\s+(?:to|two)\s+([a-h][1-8])\b/gi, '$1 $2$3');
    corrected = corrected.replace(/\b([nbrqk])\s*([a-h])\s+(?:to|two)\s+([a-h][1-8])\b/gi, '$1$2$3');
    
    // Handle "piece + column + square" without "to" (e.g., "knight b d2" -> "knight bd2")
    corrected = corrected.replace(/\b(knight|bishop|rook|queen|king)\s+([a-h])\s+([a-h][1-8])\b/gi, '$1 $2$3');
    corrected = corrected.replace(/\b([nbrqk])\s*([a-h])\s+([a-h][1-8])\b/gi, '$1$2$3');
    
    // Also handle "piece to square" (e.g., "knight to f3")
    corrected = corrected.replace(/\b(knight|bishop|rook|queen|king)\s+to\s+([a-h][1-8])\b/gi, '$1 $2');
    
    return corrected;
}

// ===========================
// Speech Synthesis
// ===========================

// Track if engine is currently speaking (to mute microphone)
let isSpeaking = false;

function speakMove(moveText) {
    return new Promise((resolve) => {
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech and ensure not paused (Chrome bug workaround)
            window.speechSynthesis.cancel();
            window.speechSynthesis.resume();
            
            // Set isSpeaking BEFORE stopping recognition to prevent onend handler from updating UI
            const wasListening = isListening;
            isSpeaking = true;
            
            // Pause voice recognition while speaking
            if (recognition && wasListening) {
                try {
                    recognition.stop();
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
            utterance.rate = 0.9;
            utterance.pitch = 1;
            
            utterance.onend = () => {
                isSpeaking = false;
                isProcessingVoiceCommand = false;
                // Resume voice recognition after a short delay
                setTimeout(() => {
                    const btn = document.getElementById('voiceBtn');
                    // Restart if we were listening before OR if button still shows listening state
                    if (wasListening || btn.classList.contains('listening')) {
                        try {
                            recognition.start();
                            btn.classList.add('listening');
                            isListening = true;
                            console.log('Restarted recognition after speech');
                        } catch (e) {
                            console.log('Could not restart recognition after speech:', e);
                            // Retry after a longer delay
                            setTimeout(() => {
                                if (btn.classList.contains('listening')) {
                                    try {
                                        recognition.start();
                                        isListening = true;
                                        console.log('Restarted recognition on retry after speech');
                                    } catch (e2) {
                                        console.error('Failed to restart recognition after speech:', e2);
                                    }
                                }
                            }, 300);
                        }
                    }
                    resolve();
                }, 300);
            };
            
            utterance.onerror = () => {
                isSpeaking = false;
                isProcessingVoiceCommand = false;
                setTimeout(() => {
                    const btn = document.getElementById('voiceBtn');
                    // Restart if we were listening before OR if button still shows listening state
                    if (wasListening || btn.classList.contains('listening')) {
                        try {
                            recognition.start();
                            btn.classList.add('listening');
                            isListening = true;
                            console.log('Restarted recognition after speech error');
                        } catch (e) {
                            console.log('Could not restart recognition after speech error:', e);
                            // Retry after a longer delay
                            setTimeout(() => {
                                if (btn.classList.contains('listening')) {
                                    try {
                                        recognition.start();
                                        isListening = true;
                                        console.log('Restarted recognition on retry after speech error');
                                    } catch (e2) {
                                        console.error('Failed to restart recognition after speech error:', e2);
                                    }
                                }
                            }, 300);
                        }
                    }
                    resolve();
                }, 300);
            };
            
            window.speechSynthesis.speak(utterance);
        } else {
            resolve();
        }
    });
}

// ===========================
// Engine Play Mode
// ===========================

function weightedRandomSelect(items, weights) {
    // Normalize weights to sum to 1
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) return items[0];
    
    const normalizedWeights = weights.map(w => w / totalWeight);
    
    // Random selection based on weights
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

function selectEnginePlayMove() {
    // Priority 1: Use master games if available
    if (lastMasterMoves && lastMasterMoves.length > 0) {
        const moves = lastMasterMoves.map(m => m.move);
        
        let selectedMove;
        let grandmasterInfo = null;
        
        if (grandmasterMode) {
            // Grandmaster mode: select from moves that are in the top games
            // This ensures we can always find a grandmaster who played the move
            let availableMoves = moves;
            let gamesWithMoves = [];
            
            if (lastTopGames && lastTopGames.length > 0) {
                // Get moves that are actually in the top games
                const movesInTopGames = [...new Set(lastTopGames.map(g => g.move).filter(Boolean))];
                if (movesInTopGames.length > 0) {
                    // Prefer moves that are in top games, but fall back to all moves if needed
                    availableMoves = movesInTopGames.filter(m => moves.includes(m));
                    if (availableMoves.length === 0) {
                        availableMoves = moves; // Fall back to all moves
                    }
                }
            }
            
            // Randomly select from available moves
            const moveIndex = Math.floor(Math.random() * availableMoves.length);
            selectedMove = availableMoves[moveIndex];
            
            // Find a game that played this move
            if (lastTopGames && lastTopGames.length > 0 && game && enginePlaysColor) {
                const gamesWithMove = lastTopGames.filter(g => g.move === selectedMove);
                
                if (gamesWithMove.length > 0) {
                    const selectedGame = gamesWithMove[Math.floor(Math.random() * gamesWithMove.length)];
                    // Determine which player played this move based on engine's color
                    // If engine is playing white, then white is making the move
                    const isWhiteMove = enginePlaysColor === 'w';
                    grandmasterInfo = {
                        name: isWhiteMove ? selectedGame.white_name : selectedGame.black_name,
                        rating: isWhiteMove ? selectedGame.white_rating : selectedGame.black_rating,
                        color: isWhiteMove ? 'white' : 'black',
                        move: selectedMove
                    };
                    console.log('Grandmaster mode: selected', selectedMove, 'played by', grandmasterInfo.name, grandmasterInfo.rating);
                } else {
                    console.log('Warning: No games found with move', selectedMove, 'in lastTopGames');
                }
            } else {
                console.log('Cannot find grandmaster info - lastTopGames:', lastTopGames?.length, 'game:', !!game, 'enginePlaysColor:', enginePlaysColor);
            }
        } else {
            // Normal mode: weighted by game count
            const weights = lastMasterMoves.map(m => m.total || 1);
            selectedMove = weightedRandomSelect(moves, weights);
            console.log('Selecting from master moves (weighted):', moves, weights);
        }
        
        // Store grandmaster info for display (only if we found one)
        lastGrandmasterInfo = grandmasterInfo;
        
        // If in grandmaster mode but couldn't find a game, clear the display
        if (grandmasterMode && !grandmasterInfo) {
            clearGrandmasterDisplay();
        }
        
        wasInBook = true;
        return { move: selectedMove, fromBook: true };
    }
    
    // Priority 2: Use engine moves (weighted by evaluation - better = higher weight)
    if (lastEngineMoves && lastEngineMoves.length > 0) {
        // Check if we just left the book
        const justLeftBook = wasInBook && enginePlaysColor;
        wasInBook = false;
        
        // Clear grandmaster info since this is an engine move, not a book move
        lastGrandmasterInfo = null;
        
        const moves = lastEngineMoves.map(m => m.move);
        
        // Convert evaluations to weights (higher eval = higher weight)
        // Use exponential weighting so best moves are much more likely
        const weights = lastEngineMoves.map((m, index) => {
            // First move gets weight 8, second 4, third 2, etc.
            return Math.pow(2, lastEngineMoves.length - index);
        });
        
        console.log('Selecting from engine moves:', moves, weights);
        return { move: weightedRandomSelect(moves, weights), fromBook: false, justLeftBook };
    }
    
    return null;
}

async function makeEngineMoveIfNeeded() {
    if (!enginePlaysColor || !game) return;
    
    // Check if it's the engine's turn
    if (game.turn() !== enginePlaysColor) return;
    
    // Pause voice recognition while engine is "thinking" and speaking
    const wasListeningBefore = isListening || document.getElementById('voiceBtn').classList.contains('listening');
    if (recognition && wasListeningBefore) {
        try {
            recognition.stop();
        } catch (e) {
            console.log('Could not pause recognition for engine move:', e);
        }
    }
    isSpeaking = true; // Prevent recognition restart
    
    // Wait a moment for analysis to complete
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const selection = selectEnginePlayMove();
    
    if (selection && selection.move) {
        console.log('Engine playing:', selection.move, selection.fromBook ? '(from book)' : '(engine)');
        
        // If we just left the book, announce it
        if (selection.justLeftBook) {
            console.log('Left opening book - playing notification');
            playOutOfBookSound();
            
            // Speak "out of book" notification
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                window.speechSynthesis.resume();
                const utterance = new SpeechSynthesisUtterance('Out of book');
                utterance.rate = 1;
                utterance.volume = 0.7;
                await new Promise(resolve => {
                    utterance.onend = resolve;
                    utterance.onerror = resolve;
                    window.speechSynthesis.speak(utterance);
                });
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        try {
            const result = game.move(selection.move);
            if (result) {
                // Play sound
                playMoveSound({ isCapture: result.captured !== undefined });
                
                if (board) {
                    requestAnimationFrame(() => {
                        board.position(game.fen());
                    });
                }
                
                updateStatus();
                const source = selection.fromBook ? '(book)' : '(engine)';
                let statusText = `Engine played: ${result.san} ${source}`;
                
                // Show grandmaster info if in grandmaster mode and move is from book
                if (grandmasterMode && selection.fromBook && lastGrandmasterInfo) {
                    statusText += ` (${lastGrandmasterInfo.name} ${lastGrandmasterInfo.rating})`;
                    updateGrandmasterDisplay(lastGrandmasterInfo);
                } else {
                    clearGrandmasterDisplay();
                }
                
                document.getElementById('voiceStatus').textContent = statusText;
                
                // Wait for move sound to finish before speaking
                await new Promise(resolve => setTimeout(resolve, 400));
                
                // Speak the move and wait for it to complete
                await speakMove(result.san);
                
                // Resume voice recognition after speech is done
                isSpeaking = false;
                await new Promise(resolve => setTimeout(resolve, 500));
                
                if (wasListeningBefore && document.getElementById('voiceBtn').classList.contains('listening')) {
                    try {
                        recognition.start();
                    } catch (e) {
                        console.log('Could not resume recognition after engine move:', e);
                    }
                }
                
                // Analyze new position (for next engine move if game continues)
                analyzePosition();
            }
        } catch (error) {
            console.error('Error making engine move:', error);
            isSpeaking = false;
        }
    } else {
        document.getElementById('voiceStatus').textContent = 'Engine has no moves available.';
        isSpeaking = false;
        
        // Resume listening
        if (wasListeningBefore && document.getElementById('voiceBtn').classList.contains('listening')) {
            try {
                recognition.start();
            } catch (e) {
                console.log('Could not resume recognition:', e);
            }
        }
    }
}

function setEngineMode(color) {
    enginePlaysColor = color;
    updateEngineModeUI();
    
    if (color) {
        // Reset book tracking when entering engine mode
        wasInBook = true;
        
        document.getElementById('voiceStatus').textContent = 
            `Engine plays ${color === 'w' ? 'White' : 'Black'}. You play ${color === 'w' ? 'Black' : 'White'}.`;
        
        // If it's engine's turn, make a move
        if (game && game.turn() === color) {
            // Need to analyze first, then move
            analyzePosition().then(() => {
                setTimeout(makeEngineMoveIfNeeded, 500);
            });
        }
    } else {
        document.getElementById('voiceStatus').textContent = 'Analysis mode. Both sides shown.';
    }
}

function toggleEngineMode() {
    if (enginePlaysColor) {
        // Switch to analysis mode
        setEngineMode(null);
    } else {
        // Switch to engine mode - use current selection or default to white
        const whiteBtn = document.getElementById('engineWhiteBtn');
        const blackBtn = document.getElementById('engineBlackBtn');
        let color = 'w'; // default
        if (blackBtn && blackBtn.classList.contains('active')) {
            color = 'b';
        } else if (whiteBtn && !whiteBtn.classList.contains('active')) {
            // Neither is active, set white as default
            whiteBtn.classList.add('active');
        }
        setEngineMode(color);
    }
}

function setEngineColor(color) {
    if (enginePlaysColor !== color) {
        setEngineMode(color);
    }
}

function toggleGrandmasterMode() {
    grandmasterMode = document.getElementById('grandmasterModeCheckbox').checked;
    document.getElementById('voiceStatus').textContent = 
        grandmasterMode ? 'Grandmaster mode enabled' : 'Grandmaster mode disabled';
    
    // Update UI to show/hide grandmaster info display
    updateEngineModeUI();
    
    // Clear grandmaster info if disabling
    if (!grandmasterMode) {
        clearGrandmasterDisplay();
        lastGrandmasterInfo = null;
    }
    
    // Workaround for Chrome speech synthesis bug - resume if paused
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();
    }
}

function updateEngineModeUI() {
    try {
        const analysisSection = document.querySelector('.analysis-section');
        if (!analysisSection) return; // Exit early if element doesn't exist
        
        const engineControls = document.getElementById('engineControls');
        const engineColorGroup = document.getElementById('engineColorGroup');
        const grandmasterGroup = document.getElementById('grandmasterGroup');
        const grandmasterInfoGroup = document.getElementById('grandmasterInfoGroup');
        const engineModeBtn = document.getElementById('engineModeBtn');
        const engineModeText = document.getElementById('engineModeText');
        const engineWhiteBtn = document.getElementById('engineWhiteBtn');
        const engineBlackBtn = document.getElementById('engineBlackBtn');
        
        // Only proceed if all required elements exist
        if (!engineControls || !engineColorGroup || !grandmasterGroup || 
            !engineModeBtn || !engineModeText || !engineWhiteBtn || !engineBlackBtn) {
            return; // Exit if any required elements are missing
        }
        
        if (enginePlaysColor) {
            // Engine mode - blur the analysis panels
            analysisSection.classList.add('engine-mode');
            engineColorGroup.style.display = 'flex';
            grandmasterGroup.style.display = 'flex';
            if (grandmasterInfoGroup) {
                grandmasterInfoGroup.style.display = grandmasterMode ? 'flex' : 'none';
            }
            engineModeText.textContent = 'Analysis Mode'; // Button shows what you'll switch TO
            engineModeBtn.classList.add('active');
            
            // Update color buttons
            if (enginePlaysColor === 'w') {
                engineWhiteBtn.classList.add('active');
                engineBlackBtn.classList.remove('active');
            } else {
                engineBlackBtn.classList.add('active');
                engineWhiteBtn.classList.remove('active');
            }
        } else {
            // Analysis mode - show panels normally
            analysisSection.classList.remove('engine-mode');
            engineColorGroup.style.display = 'none';
            grandmasterGroup.style.display = 'none';
            if (grandmasterInfoGroup) {
                grandmasterInfoGroup.style.display = 'none';
            }
            engineModeText.textContent = 'Engine Mode'; // Button shows what you'll switch TO
            engineModeBtn.classList.remove('active');
        }
    } catch (error) {
        console.error('Error updating engine mode UI:', error);
        // Don't throw - just log the error
    }
}

function updateGrandmasterDisplay(info) {
    if (!info) return;
    
    const grandmasterInfoGroup = document.getElementById('grandmasterInfoGroup');
    const grandmasterInfo = document.getElementById('grandmasterInfo');
    
    if (grandmasterInfoGroup && grandmasterInfo && grandmasterMode && enginePlaysColor) {
        grandmasterInfoGroup.style.display = 'flex';
        grandmasterInfo.textContent = `Last move by: ${info.name} (${info.rating})`;
        grandmasterInfo.title = `${info.name} (${info.rating}) played ${info.move}`;
    }
}

function clearGrandmasterDisplay() {
    const grandmasterInfoGroup = document.getElementById('grandmasterInfoGroup');
    if (grandmasterInfoGroup) {
        grandmasterInfoGroup.style.display = 'none';
    }
}

// ===========================
// Move Parsing Helpers
// ===========================

// Find all pawns that can capture on a given square
function findPawnCaptures(targetSquare) {
    if (!game) return [];
    
    const legalMoves = game.moves({ verbose: true });
    const pawnCaptures = legalMoves.filter(move => 
        move.piece === 'p' && 
        move.to === targetSquare.toLowerCase() && 
        move.captured
    );
    
    return pawnCaptures;
}

// Find all legal captures in the current position
function findAllCaptures() {
    if (!game) return [];
    
    const legalMoves = game.moves({ verbose: true });
    return legalMoves.filter(move => move.captured);
}

// Get the top engine capture move (if the top move is a capture)
function getTopEngineCapture() {
    if (!lastEngineMoves || lastEngineMoves.length === 0) return null;
    
    const topMove = lastEngineMoves[0];
    if (!topMove || !topMove.move) return null;
    
    // Check if the top engine move is a capture
    const moveStr = topMove.move;
    if (moveStr.includes('x')) {
        return moveStr;
    }
    
    return null;
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
    
    // Handle resume command first (works even when paused)
    const resumeCommands = ['resume', 'unpause', 'continue', 'start listening', 'listen'];
    if (resumeCommands.some(cmd => text.includes(cmd))) {
        if (isPaused) {
            isPaused = false;
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
        isPaused = true;
        updatePauseUI();
        document.getElementById('voiceStatus').textContent = 'Paused. Say "resume" to continue.';
        return;
    }
    
    // If paused, ignore all other commands
    if (isPaused) {
        document.getElementById('voiceStatus').textContent = 'Paused. Say "resume" to continue.';
        return;
    }
    
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
    
    // Handle engine play mode commands
    if (text.includes('engine plays white') || text.includes('computer plays white') || 
        text.includes('play against white') || text.includes('engine white')) {
        setEngineMode('w');
        return;
    }
    
    if (text.includes('engine plays black') || text.includes('computer plays black') || 
        text.includes('play against black') || text.includes('engine black')) {
        setEngineMode('b');
        return;
    }
    
    if (text.includes('analysis mode') || text.includes('analyze mode') || 
        text.includes('analysis') || text.includes('stop engine') || 
        text.includes('two player') || text.includes('2 player')) {
        setEngineMode(null);
        return;
    }
    
    // Handle grandmaster plays commands (enables engine mode + grandmaster mode in one command)
    if (text.includes('grandmaster plays white') || text.includes('gm plays white') || 
        text.includes('grandmaster white')) {
        setEngineMode('w');
        // Wait a moment for UI to update, then enable grandmaster mode
        setTimeout(() => {
            const checkbox = document.getElementById('grandmasterModeCheckbox');
            if (checkbox && !checkbox.checked) {
                checkbox.checked = true;
                toggleGrandmasterMode();
            }
        }, 100);
        return;
    }
    
    if (text.includes('grandmaster plays black') || text.includes('gm plays black') || 
        text.includes('grandmaster black')) {
        setEngineMode('b');
        // Wait a moment for UI to update, then enable grandmaster mode
        setTimeout(() => {
            const checkbox = document.getElementById('grandmasterModeCheckbox');
            if (checkbox && !checkbox.checked) {
                checkbox.checked = true;
                toggleGrandmasterMode();
            }
        }, 100);
        return;
    }
    
    // Handle grandmaster mode commands (only works in engine mode)
    if (text.includes('grandmaster mode') || text.includes('grandmaster') || text.includes('gm mode')) {
        if (enginePlaysColor) {
            const checkbox = document.getElementById('grandmasterModeCheckbox');
            if (checkbox) {
                // Toggle grandmaster mode
                checkbox.checked = !checkbox.checked;
                toggleGrandmasterMode();
            }
        } else {
            document.getElementById('voiceStatus').textContent = 'Grandmaster mode only works in engine mode';
        }
        return;
    }
    
    if (text.includes('enable grandmaster') || text.includes('turn on grandmaster') || 
        text.includes('grandmaster on')) {
        if (enginePlaysColor) {
            const checkbox = document.getElementById('grandmasterModeCheckbox');
            if (checkbox && !checkbox.checked) {
                checkbox.checked = true;
                toggleGrandmasterMode();
            }
        } else {
            document.getElementById('voiceStatus').textContent = 'Grandmaster mode only works in engine mode';
        }
        return;
    }
    
    if (text.includes('disable grandmaster') || text.includes('turn off grandmaster') || 
        text.includes('grandmaster off')) {
        if (enginePlaysColor) {
            const checkbox = document.getElementById('grandmasterModeCheckbox');
            if (checkbox && checkbox.checked) {
                checkbox.checked = false;
                toggleGrandmasterMode();
            }
        } else {
            document.getElementById('voiceStatus').textContent = 'Grandmaster mode only works in engine mode';
        }
        return;
    }
    
    // Handle show commands/help
    if (text.includes('show commands') || text.includes('show command') || 
        text.includes('help') || text.includes('what can i say') || 
        text.includes('commands') || text.includes('voice commands')) {
        showCommandsModal();
        document.getElementById('voiceStatus').textContent = 'Showing voice commands';
        return;
    }
    
    // Handle hide commands/help
    if (text.includes('hide commands') || text.includes('hide command') || 
        text.includes('hide help') || text.includes('close commands') || 
        text.includes('close command') || text.includes('close help')) {
        hideCommandsModal();
        document.getElementById('voiceStatus').textContent = 'Commands hidden';
        return;
    }
    
    // Handle dark mode / light mode toggle
    if (text.includes('dark mode') || text.includes('dark theme')) {
        if (!document.body.classList.contains('dark-mode')) {
            toggleDarkMode();
        }
        document.getElementById('voiceStatus').textContent = 'Dark mode enabled';
        return;
    }
    
    if (text.includes('light mode') || text.includes('light theme')) {
        if (document.body.classList.contains('dark-mode')) {
            toggleDarkMode();
        }
        document.getElementById('voiceStatus').textContent = 'Light mode enabled';
        return;
    }
    
    // Handle "top move" - play the top engine move
    if (text.includes('top move') || text.includes('best move') || text.includes('engine move')) {
        if (lastEngineMoves && lastEngineMoves.length > 0) {
            const topMove = lastEngineMoves[0].move;
            try {
                const result = game.move(topMove);
                if (result) {
                    // Set isSpeaking early to prevent recognition.onend from updating UI
                    isSpeaking = true;
                    playMoveSound({ isCapture: result.captured !== undefined });
                    if (board) {
                        requestAnimationFrame(() => {
                            board.position(game.fen());
                        });
                    }
                    updateStatus();
                    analyzePosition();
                    document.getElementById('voiceStatus').textContent = `Top move: ${result.san}`;
                    speakMove(result.san);
                    return;
                }
            } catch (error) {
                console.error('Error making top move:', error);
            }
        }
        document.getElementById('voiceStatus').textContent = 'No engine analysis available yet';
        return;
    }
    
    // Handle "master move" - play the most common master move
    if (text.includes('master move') || text.includes('book move')) {
        if (lastMasterMoves && lastMasterMoves.length > 0) {
            // Find the move with highest total games (most common)
            const sortedMoves = [...lastMasterMoves].sort((a, b) => (b.total || 0) - (a.total || 0));
            const topMasterMove = sortedMoves[0].move;
            try {
                const result = game.move(topMasterMove);
                if (result) {
                    // Set isSpeaking early to prevent recognition.onend from updating UI
                    isSpeaking = true;
                    playMoveSound({ isCapture: result.captured !== undefined });
                    if (board) {
                        requestAnimationFrame(() => {
                            board.position(game.fen());
                        });
                    }
                    updateStatus();
                    analyzePosition();
                    const gameCount = sortedMoves[0].total || 0;
                    document.getElementById('voiceStatus').textContent = `Master move: ${result.san} (${gameCount} games)`;
                    speakMove(result.san);
                    return;
                }
            } catch (error) {
                console.error('Error making master move:', error);
            }
        }
        document.getElementById('voiceStatus').textContent = 'No master games found for this position';
        return;
    }
    
    // Remove common filler words (but keep chess notation)
    const cleaned = text.replace(/\b(move|play|to|the|square)\b/gi, ' ').trim();
    
    // Try to parse as standard algebraic notation
    let move = null;
    
    // Handle "just takes" - use top engine move if it's a capture, or only legal capture
    if (/^(takes|capture|captures|x)$/i.test(cleaned.trim())) {
        // First, check if there's only one legal capture
        const allCaptures = findAllCaptures();
        
        if (allCaptures.length === 1) {
            // Only one capture available, make it
            const captureMove = allCaptures[0];
            try {
                const result = game.move(captureMove);
                if (result) {
                    playMoveSound({ isCapture: true });
                    if (board) {
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
                console.error('Error making capture:', error);
            }
        } else if (allCaptures.length > 1) {
            // Multiple captures - try using top engine move
            const topCapture = getTopEngineCapture();
            if (topCapture) {
                try {
                    const result = game.move(topCapture);
                    if (result) {
                        playMoveSound({ isCapture: true });
                        if (board) {
                            requestAnimationFrame(() => {
                                board.position(game.fen());
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
            // If no top engine capture, inform user
            document.getElementById('voiceStatus').textContent = 
                `Multiple captures available (${allCaptures.length}). Please specify which piece takes where.`;
            return;
        } else {
            document.getElementById('voiceStatus').textContent = 'No captures available in this position.';
            return;
        }
    }
    
    // Handle "pawn takes [square]" - but ONLY if capture is mentioned
    const pieceNames = ['knight', 'bishop', 'rook', 'queen', 'king'];
    const hasPieceName = pieceNames.some(piece => text.includes(piece));
    
    // Check if there's a capture pattern (takes/x/captures)
    const hasCapturePattern = /\b(?:takes|x|captures?)\b/i.test(cleaned);
    
    // Only try pawn capture if there's a capture pattern:
    // 1. "pawn" is mentioned AND there's a capture pattern, OR
    // 2. No piece name is mentioned AND there's a capture pattern (assume pawn)
    const isPawnCapture = hasCapturePattern && 
        (text.includes('pawn') || !hasPieceName);
    
    if (isPawnCapture && !hasPieceName) {
        // Extract target square
        const squareMatch = cleaned.match(/([a-h][1-8])/i);
        if (squareMatch) {
            const targetSquare = squareMatch[1].toLowerCase();
            const pawnCaptures = findPawnCaptures(targetSquare);
            
            if (pawnCaptures.length === 1) {
                // Only one pawn can capture - make the move
                try {
                    const result = game.move(pawnCaptures[0]);
                    if (result) {
                        playMoveSound({ isCapture: true });
                        if (board) {
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
                    console.error('Error making pawn capture:', error);
                }
            } else if (pawnCaptures.length > 1) {
                // Multiple pawns can capture - need disambiguation
                const files = pawnCaptures.map(m => m.from[0]).join(' or ');
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
    
    // Handle "pawn to [square]" - normal pawn moves (not captures)
    if (text.includes('pawn') && !hasCapturePattern) {
        // Extract the target square
        const squareMatch = cleaned.match(/([a-h][1-8])/i);
        if (squareMatch) {
            const targetSquare = squareMatch[1].toLowerCase();
            // Try to make the pawn move directly
            try {
                const result = game.move(targetSquare);
                if (result) {
                    playMoveSound({ isCapture: result.captured !== undefined });
                    if (board) {
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
                // If direct move fails, continue to standard parsing
                console.log('Direct pawn move failed, trying standard parsing');
            }
        }
    }
    
    // Handle special cases
    if (text.includes('castle') || text.includes('castles')) {
        if (text.includes('king') || text.includes('short')) {
            move = 'O-O';
        } else if (text.includes('queen') || text.includes('long')) {
            move = 'O-O-O';
        } else {
            // Just "castle" - check what's legal
            const legalMoves = game.moves();
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
        // Try to parse standard notation
        // Examples: "e4", "knight f3", "nf3", "e takes d5", "exd5"
        
        // Remove "takes" or "captures" and replace with "x"
        let notation = cleaned.replace(/\b(takes|captures|capture)\b/gi, 'x');
        
        // Remove "pawn" - pawns don't need a prefix in notation
        notation = notation.replace(/\bpawn\b/gi, '');
        
        // Handle piece names
        notation = notation.replace(/\bknight\b/gi, 'N');
        notation = notation.replace(/\bbishop\b/gi, 'B');
        notation = notation.replace(/\brook\b/gi, 'R');
        notation = notation.replace(/\bqueen\b/gi, 'Q');
        notation = notation.replace(/\bking\b/gi, 'K');
        
        // Remove spaces
        notation = notation.replace(/\s+/g, '').trim();
        
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

// Track current analysis to cancel when position changes
let currentAnalysisFen = null;
let currentAnalysisDepth = 0;
let currentAnalysisController = null; // AbortController for cancelling fetch requests

async function analyzePosition() {
    if (!game) {
        console.error('Game not initialized');
        return;
    }
    
    const fen = game.fen();
    
    // Update FEN display
    document.getElementById('fen').textContent = fen;
    
    // Cancel any ongoing analysis
    if (currentAnalysisController) {
        currentAnalysisController.abort();
        console.log('Cancelled previous analysis');
    }
    
    // Create new abort controller for this analysis
    currentAnalysisController = new AbortController();
    const signal = currentAnalysisController.signal;
    
    currentAnalysisFen = fen;
    currentAnalysisDepth = 0;
    
    // Show loading
    document.getElementById('engineMoves').innerHTML = '<p class="loading">Analyzing...</p>';
    document.getElementById('masterMoves').innerHTML = '<p class="loading">Loading master games...</p>';
    
    // Fetch master moves first (quick)
    try {
        const masterResponse = await fetch(`${API_BASE_URL}/master-moves/?fen=${encodeURIComponent(fen)}`, { signal });
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
    if (enginePlaysColor) {
        try {
            const engineResponse = await fetch(`${API_BASE_URL}/top-moves/?fen=${encodeURIComponent(fen)}&depth=15&num_moves=5`, { signal });
            if (engineResponse.ok) {
                const engineData = await engineResponse.json();
                displayEngineMoves(engineData.moves || [], 15);
                
                // Make engine's move if it's engine's turn
                if (game.turn() === enginePlaysColor) {
                    setTimeout(makeEngineMoveIfNeeded, 600);
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

async function continuousDeepening(fen, signal) {
    // Depths to iterate through - keep it practical
    // Depth 20 is already very strong, beyond that takes too long
    const depths = [12, 16, 20];
    
    for (const depth of depths) {
        // Check if aborted
        if (signal.aborted) {
            console.log(`Analysis aborted at depth ${depth}`);
            return;
        }
        
        try {
            console.log(`Analyzing at depth ${depth}...`);
            const engineResponse = await fetch(
                `${API_BASE_URL}/top-moves/?fen=${encodeURIComponent(fen)}&depth=${depth}&num_moves=5`,
                { signal }
            );
            
            if (engineResponse.ok) {
                const engineData = await engineResponse.json();
                currentAnalysisDepth = depth;
                displayEngineMoves(engineData.moves || [], depth, depth === depths[depths.length - 1]);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log(`Analysis aborted during depth ${depth} fetch`);
                return;
            }
            console.error(`Error at depth ${depth}:`, error);
            // Continue to next depth on error
        }
        
        // Small delay between depths to not overwhelm the server
        if (!signal.aborted) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    console.log('Continuous deepening complete');
}

function displayEngineMoves(moves, depth = null, isComplete = false) {
    const container = document.getElementById('engineMoves');
    
    // Store for "takes" voice command
    lastEngineMoves = moves || [];
    
    // Update the header to show depth
    const header = document.querySelector('.analysis-panel h2');
    if (header && header.textContent.includes('Engine')) {
        if (depth && !enginePlaysColor) {
            // Show depth with indicator if still analyzing
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
    
    // Add click handlers for moves
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

function displayMasterMoves(data) {
    const container = document.getElementById('masterMoves');
    
    // Store for engine play mode
    lastMasterMoves = (data && data.moves) ? data.moves : [];
    lastTopGames = (data && data.top_games) ? data.top_games : [];
    
    if (data.error) {
        container.innerHTML = `<p class="placeholder">Error: ${data.error}</p>`;
        return;
    }
    
    if (!data.found || !data.moves || data.moves.length === 0) {
        lastMasterMoves = []; // Clear if no moves found
        lastTopGames = []; // Clear top games too
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
    
    // Top moves section
    html += '<h3 class="section-title">Popular Moves</h3>';
    
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
        
        topGames.forEach(game => {
            const result = game.winner === 'white' ? '1-0' : game.winner === 'black' ? '0-1' : '½-½';
            const resultClass = game.winner === 'white' ? 'white-win' : game.winner === 'black' ? 'black-win' : 'draw';
            const gameUrl = `https://lichess.org/${game.id}`;
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
                        <a href="${gameUrl}" target="_blank" class="game-link" title="View on Lichess">↗</a>
                    </div>
                </div>
            `;
        });
    }
    
    container.innerHTML = html;
    
    // Add click handlers for moves
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

// Play a move when clicking on it in the analysis panels
function playMoveFromClick(moveStr) {
    if (!game || !board) return;
    
    // Don't allow clicking moves in engine play mode (cheating!)
    if (enginePlaysColor) {
        document.getElementById('voiceStatus').textContent = 'Cannot click moves in engine mode';
        return;
    }
    
    try {
        const result = game.move(moveStr);
        if (result) {
            playMoveSound({ isCapture: result.captured !== undefined });
            
            requestAnimationFrame(() => {
                board.position(game.fen());
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


// ===========================
// Event Listeners
// ===========================

function setupEventListeners() {
    try {
        // Core controls
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) voiceBtn.addEventListener('click', toggleVoiceRecognition);
        
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) resetBtn.addEventListener('click', resetGame);
        
        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) undoBtn.addEventListener('click', undoMove);
        
        const flipBtn = document.getElementById('flipBtn');
        if (flipBtn) flipBtn.addEventListener('click', flipBoard);
        
        const soundBtn = document.getElementById('soundBtn');
        if (soundBtn) soundBtn.addEventListener('click', toggleSound);
        
        const themeBtn = document.getElementById('themeBtn');
        if (themeBtn) themeBtn.addEventListener('click', toggleDarkMode);
        
        const helpBtn = document.getElementById('helpBtn');
        if (helpBtn) helpBtn.addEventListener('click', showCommandsModal);
        
        // Engine mode controls - only if they exist
        const engineModeBtn = document.getElementById('engineModeBtn');
        if (engineModeBtn) {
            engineModeBtn.addEventListener('click', toggleEngineMode);
        }
        
        const engineWhiteBtn = document.getElementById('engineWhiteBtn');
        if (engineWhiteBtn) {
            engineWhiteBtn.addEventListener('click', () => setEngineColor('w'));
        }
        
        const engineBlackBtn = document.getElementById('engineBlackBtn');
        if (engineBlackBtn) {
            engineBlackBtn.addEventListener('click', () => setEngineColor('b'));
        }
        
        const grandmasterCheckbox = document.getElementById('grandmasterModeCheckbox');
        if (grandmasterCheckbox) {
            grandmasterCheckbox.addEventListener('change', toggleGrandmasterMode);
        }
        
        // Initialize theme from localStorage
        initializeTheme();
        
        // Modal close handlers
        const modal = document.getElementById('commandsModal');
        if (modal) {
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', hideCommandsModal);
            }
            
            // Close modal when clicking outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    hideCommandsModal();
                }
            });
            
            // Close modal with Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.classList.contains('show')) {
                    hideCommandsModal();
                }
            });
        }
    } catch (error) {
        console.error('Error setting up event listeners:', error);
        // Don't throw - allow initialization to continue
    }
}

function showCommandsModal() {
    const modal = document.getElementById('commandsModal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function hideCommandsModal() {
    const modal = document.getElementById('commandsModal');
    modal.classList.remove('show');
    document.body.style.overflow = ''; // Restore scrolling
}

// ===========================
// Dark Mode
// ===========================

function initializeTheme() {
    // Check localStorage first, then system preference
    const savedTheme = localStorage.getItem('chess-voice-theme');
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    } else if (savedTheme === 'light') {
        document.body.classList.remove('dark-mode');
    } else {
        // No saved preference - check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark-mode');
        }
    }
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    
    // Save preference to localStorage
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('chess-voice-theme', isDark ? 'dark' : 'light');
    
    // Re-initialize Lucide icons (they may need to update)
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function resetGame() {
    if (!game || !board) return;
    
    game.reset();
    
    // Reset book tracking
    wasInBook = true;
    lastMasterMoves = [];
    lastEngineMoves = [];
    
    // Cancel any ongoing analysis
    currentAnalysisFen = null;
    currentAnalysisDepth = 0;
    
    // Use requestAnimationFrame for smoother updates
    requestAnimationFrame(() => {
        board.position('start');
        board.orientation('white');
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

function undoMove() {
    if (!game || !board) return;
    
    // In engine mode, undo two moves so it's the player's turn again
    if (enginePlaysColor) {
        const playerColor = enginePlaysColor === 'w' ? 'b' : 'w';
        
        // Undo first move
        const move1 = game.undo();
        if (!move1) return;
        
        // If it's still not the player's turn, undo another move
        if (game.turn() !== playerColor) {
            const move2 = game.undo();
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
        
        // Use requestAnimationFrame for smoother updates
        requestAnimationFrame(() => {
            board.position(game.fen());
        });
        updateStatus();
        analyzePosition();
    } else {
        // Normal mode - just undo one move
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

