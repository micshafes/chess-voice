import json
import logging
import urllib.request
import urllib.parse
import urllib.error

logger = logging.getLogger(__name__)

# Lichess Opening Explorer API endpoint for master games
LICHESS_MASTERS_API = "https://explorer.lichess.ovh/masters"

def _normalize_fen(fen: str) -> str:
    """Normalize FEN to first 4 parts (position, active color, castling, en passant)."""
    if not fen:
        return ""
    parts = fen.split(' ')
    return ' '.join(parts[:4])

def get_master_moves(fen: str):
    """
    Get moves played by masters from a given position using Lichess Opening Explorer.
    
    Args:
        fen: FEN string of the position (will be normalized)
    
    Returns:
        Dict with:
        - 'moves': List of moves with stats (move, white, draws, black, average_rating)
        - 'total_games': Total number of master games in this position
        - 'found': Whether position was found in database
    """
    logger.info(f"Looking up master moves from Lichess for position")
    
    try:
        # Normalize FEN (Lichess expects first 4 parts)
        normalized_fen = _normalize_fen(fen)
        
        # Encode FEN for URL
        encoded_fen = urllib.parse.quote(normalized_fen)
        
        # Query Lichess Opening Explorer API
        url = f"{LICHESS_MASTERS_API}?fen={encoded_fen}"
        
        logger.debug(f"Querying Lichess API: {url}")
        
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Chess-Voice/1.0')
        
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            if not data or 'moves' not in data:
                return {
                    'moves': [],
                    'total_games': 0,
                    'found': False
                }
            
            # Format moves for display
            moves = []
            for move_data in data.get('moves', [])[:10]:  # Top 10 moves
                moves.append({
                    'move': move_data.get('san', ''),
                    'white': move_data.get('white', 0),
                    'draws': move_data.get('draws', 0),
                    'black': move_data.get('black', 0),
                    'total': move_data.get('white', 0) + move_data.get('draws', 0) + move_data.get('black', 0),
                    'average_rating': move_data.get('averageRating', 0)
                })
            
            # Get total games from the position (sum of all moves or from topLevel)
            total_games = data.get('white', 0) + data.get('draws', 0) + data.get('black', 0)
            if total_games == 0 and moves:
                total_games = sum(m['total'] for m in moves)
            
            return {
                'moves': moves,
                'total_games': total_games,
                'found': len(moves) > 0
            }
            
    except urllib.error.URLError as e:
        logger.error(f"Error connecting to Lichess API: {e}")
        return {
            'moves': [],
            'total_games': 0,
            'found': False,
            'error': 'Failed to connect to Lichess API'
        }
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing Lichess API response: {e}")
        return {
            'moves': [],
            'total_games': 0,
            'found': False,
            'error': 'Invalid response from Lichess API'
        }
    except Exception as e:
        logger.error(f"Unexpected error querying Lichess: {e}")
        return {
            'moves': [],
            'total_games': 0,
            'found': False,
            'error': str(e)
        }
