// ===========================
// Voice Commands & Corrections Module
// ===========================

/**
 * Dictionary of voice recognition corrections
 * Maps commonly misheard words/phrases to correct chess notation
 */
export const VOICE_CORRECTIONS = {
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
    // "queenie" patterns
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

/**
 * Apply voice recognition corrections to input text
 * @param {string} text - The raw voice input text
 * @returns {string} The corrected text
 */
export function correctVoiceInput(text) {
    let corrected = text.toLowerCase().trim();
    
    // Remove "check" from the end of moves
    corrected = corrected.replace(/\s*check\s*$/gi, '');
    corrected = corrected.replace(/\s*\+\s*$/gi, '');
    
    // Apply corrections from the dictionary
    for (const [wrong, correct] of Object.entries(VOICE_CORRECTIONS)) {
        const regex = new RegExp(`\\b${wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        corrected = corrected.replace(regex, correct);
    }
    
    // Handle "see/sea" as "c" column
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
    
    // Handle "a" column misrecognitions
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
    
    // Handle e-cigs pattern
    corrected = corrected.replace(/\be[- ]?cigs?\b/gi, 'e6');
    corrected = corrected.replace(/\be[- ]?six\b/gi, 'e6');
    corrected = corrected.replace(/\be[- ]?for\b/gi, 'e4');
    corrected = corrected.replace(/\bd[- ]?for\b/gi, 'd4');
    corrected = corrected.replace(/\bc[- ]?for\b/gi, 'c4');
    corrected = corrected.replace(/\bf[- ]?for\b/gi, 'f4');
    corrected = corrected.replace(/\bg[- ]?for\b/gi, 'g4');
    corrected = corrected.replace(/\ba[- ]?for\b/gi, 'a4');
    corrected = corrected.replace(/\bb[- ]?for\b/gi, 'b4');
    
    // Handle "off" as "f" column
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
    
    // Handle "age" as "h" column
    corrected = corrected.replace(/\bage[- ]?([1-8])\b/gi, 'h$1');
    corrected = corrected.replace(/\bage[- ]?(one)\b/gi, 'h1');
    corrected = corrected.replace(/\bage[- ]?(two)\b/gi, 'h2');
    corrected = corrected.replace(/\bage[- ]?(three)\b/gi, 'h3');
    corrected = corrected.replace(/\bage[- ]?(four|for)\b/gi, 'h4');
    corrected = corrected.replace(/\bage[- ]?(five)\b/gi, 'h5');
    corrected = corrected.replace(/\bage[- ]?(six)\b/gi, 'h6');
    corrected = corrected.replace(/\bage[- ]?(seven)\b/gi, 'h7');
    corrected = corrected.replace(/\bage[- ]?(eight)\b/gi, 'h8');
    
    // Handle piece name misrecognitions
    corrected = corrected.replace(/\b(night|nite|knit|neat|knife)\b/gi, 'knight');
    corrected = corrected.replace(/\b(brook|brooke|rock|rookie|ruck|roof|route|root)\b/gi, 'rook');
    corrected = corrected.replace(/\b(dish ?up|bish ?up|bishup|fish ?up)\b/gi, 'bishop');
    corrected = corrected.replace(/\b(quean|ween)\b/gi, 'queen');
    
    // Handle "age" after piece names
    corrected = corrected.replace(/\b(knight|bishop|rook|queen|king)\s+age[- ]?([1-8])\b/gi, '$1 h$2');
    corrected = corrected.replace(/\b(knight|bishop|rook|queen|king)\s+age[- ]?(one)\b/gi, '$1 h1');
    corrected = corrected.replace(/\b(knight|bishop|rook|queen|king)\s+age[- ]?(two)\b/gi, '$1 h2');
    corrected = corrected.replace(/\b(knight|bishop|rook|queen|king)\s+age[- ]?(three)\b/gi, '$1 h3');
    corrected = corrected.replace(/\b(knight|bishop|rook|queen|king)\s+age[- ]?(four|for)\b/gi, '$1 h4');
    corrected = corrected.replace(/\b(knight|bishop|rook|queen|king)\s+age[- ]?(five)\b/gi, '$1 h5');
    corrected = corrected.replace(/\b(knight|bishop|rook|queen|king)\s+age[- ]?(six)\b/gi, '$1 h6');
    corrected = corrected.replace(/\b(knight|bishop|rook|queen|king)\s+age[- ]?(seven)\b/gi, '$1 h7');
    corrected = corrected.replace(/\b(knight|bishop|rook|queen|king)\s+age[- ]?(eight)\b/gi, '$1 h8');
    
    // Handle piece + column patterns
    corrected = corrected.replace(/\b(night|nite)[- ]?([a-h])/gi, 'knight $2');
    corrected = corrected.replace(/\b(brook|brooke|rock)[- ]?([a-h])/gi, 'rook $2');
    
    // Handle "queenie" patterns
    corrected = corrected.replace(/\bqueenie\s*([1-8])\b/gi, 'qe$1');
    corrected = corrected.replace(/\bqueeny\s*([1-8])\b/gi, 'qe$1');
    corrected = corrected.replace(/\bqueenie\b/gi, 'queen e');
    corrected = corrected.replace(/\bqueeny\b/gi, 'queen e');
    
    // Handle disambiguation patterns
    corrected = corrected.replace(/\b(knight|bishop|rook|queen|king)\s+([a-h])\s+(?:to|two)\s+([a-h][1-8])\b/gi, '$1 $2$3');
    corrected = corrected.replace(/\b([nbrqk])\s*([a-h])\s+(?:to|two)\s+([a-h][1-8])\b/gi, '$1$2$3');
    corrected = corrected.replace(/\b(knight|bishop|rook|queen|king)\s+([a-h])\s+([a-h][1-8])\b/gi, '$1 $2$3');
    corrected = corrected.replace(/\b([nbrqk])\s*([a-h])\s+([a-h][1-8])\b/gi, '$1$2$3');
    corrected = corrected.replace(/\b(knight|bishop|rook|queen|king)\s+to\s+([a-h][1-8])\b/gi, '$1 $2');
    
    return corrected;
}

