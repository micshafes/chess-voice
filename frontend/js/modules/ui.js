// ===========================
// UI Module
// ===========================

import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { toggleVoiceRecognition } from './voice.js';
import { resetGame, undoMove, flipBoard } from './board.js';
import { toggleSound, updateSoundButton } from './sound.js';
import { toggleEngineMode, setEngineColor, toggleGrandmasterMode, updateEngineModeUI, setEngineStrength, toggleAnnounceMute } from './engine.js';

/**
 * Set up all event listeners
 */
export function setupEventListeners() {
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
        
        // Engine mode controls
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
        
        // Engine strength buttons
        const strengthButtons = document.querySelectorAll('.strength-btn');
        strengthButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const strength = parseInt(btn.getAttribute('data-strength'));
                setEngineStrength(strength);
            });
        });
        
        const announceMuteBtn = document.getElementById('announceMuteBtn');
        if (announceMuteBtn) {
            announceMuteBtn.addEventListener('click', toggleAnnounceMute);
        }
        
        // Initialize theme
        initializeTheme();
        
        // Modal handlers
        setupModalHandlers();
        
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

/**
 * Set up modal event handlers
 */
function setupModalHandlers() {
    const modal = document.getElementById('commandsModal');
    if (modal) {
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', hideCommandsModal);
        }
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideCommandsModal();
            }
        });
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                hideCommandsModal();
            }
        });
    }
}

/**
 * Show the commands help modal
 */
export function showCommandsModal() {
    const modal = document.getElementById('commandsModal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

/**
 * Hide the commands help modal
 */
export function hideCommandsModal() {
    const modal = document.getElementById('commandsModal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

/**
 * Initialize theme from localStorage or system preference
 */
export function initializeTheme() {
    const savedTheme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME);
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    } else if (savedTheme === 'light') {
        document.body.classList.remove('dark-mode');
    } else {
        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark-mode');
        }
    }
}

/**
 * Toggle dark mode
 */
export function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
    
    // Re-initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * Initialize all UI components
 */
export function initializeUI() {
    updateSoundButton();
    updateEngineModeUI();
    
    // Set default color selection (white)
    try {
        const whiteBtn = document.getElementById('engineWhiteBtn');
        if (whiteBtn) {
            whiteBtn.classList.add('active');
        }
        
        // Set default strength button (2000)
        const strengthButtons = document.querySelectorAll('.strength-btn');
        strengthButtons.forEach(btn => {
            const strength = parseInt(btn.getAttribute('data-strength'));
            if (strength === state.engineStrength) {
                btn.classList.add('active');
            }
        });
    } catch (error) {
        console.error('Error initializing engine mode UI:', error);
    }
}

