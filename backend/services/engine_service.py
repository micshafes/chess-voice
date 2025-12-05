import chess
from stockfish_config import stockfish, stockfish_path
import logging

logger = logging.getLogger(__name__)

def _check_stockfish():
    """Check if Stockfish is available."""
    if stockfish is None:
        raise RuntimeError(
            f"Stockfish executable not found. Please ensure stockfish.exe is available.\n"
            f"Expected locations:\n"
            f"  - {__file__}/../stockfish/stockfish.exe\n"
            f"  - {__file__}/../../restock-chess/backend/stockfish/stockfish.exe\n"
            f"Or download from https://stockfishchess.org/download/"
        )

def get_top_moves(fen: str, depth: int = 15, num_moves: int = 5):
    """
    Get top N moves from Stockfish for a given position.
    
    Args:
        fen: FEN string of the position
        depth: Analysis depth (default 15)
        num_moves: Number of top moves to return (default 5)
    
    Returns:
        List of dicts with keys: 'move' (SAN), 'evaluation', 'type' ('cp' or 'mate')
    """
    _check_stockfish()
    
    logger.info(f"Getting top {num_moves} moves for position at depth {depth}")
    
    if not fen:
        raise ValueError("No FEN provided")
    
    board = chess.Board(fen)
    stockfish.set_fen_position(fen)
    stockfish.set_depth(depth)
    
    result = []
    
    # Try to use get_top_moves if available (newer versions of stockfish package)
    try:
        if hasattr(stockfish, 'get_top_moves'):
            top_moves_uci = stockfish.get_top_moves(num_moves)
            
            if top_moves_uci:
                for move_data in top_moves_uci:
                    # Handle different response formats
                    uci_move = None
                    if isinstance(move_data, dict):
                        uci_move = move_data.get('Move', move_data.get('move', ''))
                        evaluation = move_data.get('Centipawn', move_data.get('centipawn', None))
                        mate = move_data.get('Mate', move_data.get('mate', None))
                    elif isinstance(move_data, str):
                        uci_move = move_data
                        evaluation = None
                        mate = None
                    
                    if not uci_move:
                        continue
                    
                    # Convert UCI to SAN
                    try:
                        move_obj = chess.Move.from_uci(uci_move)
                        san_move = board.san(move_obj)
                    except Exception as e:
                        logger.debug(f"Failed to convert move {uci_move}: {e}")
                        continue
                    
                    move_info = {
                        'move': san_move,
                        'uci': uci_move
                    }
                    
                    if mate is not None:
                        move_info['evaluation'] = mate
                        move_info['type'] = 'mate'
                    elif evaluation is not None:
                        move_info['evaluation'] = evaluation / 100.0  # Convert centipawns to pawns
                        move_info['type'] = 'cp'
                    else:
                        # Get evaluation for this move
                        test_board = board.copy()
                        test_board.push(move_obj)
                        stockfish.set_fen_position(test_board.fen())
                        eval_result = stockfish.get_evaluation()
                        move_info['evaluation'] = eval_result.get('value', 0) / 100.0 if eval_result.get('type') == 'cp' else eval_result.get('value', 0)
                        move_info['type'] = eval_result.get('type', 'cp')
                        # Restore position
                        stockfish.set_fen_position(fen)
                    
                    result.append(move_info)
                    
                    if len(result) >= num_moves:
                        break
    except Exception as e:
        logger.warning(f"get_top_moves not available or failed: {e}, using fallback method")
    
    # Fallback: Get best move and try to get alternatives by analyzing legal moves
    if not result or len(result) < num_moves:
        try:
            # Get all legal moves
            legal_moves = list(board.legal_moves)
            
            # Get best move first
            best_move_uci = stockfish.get_best_move()
            if best_move_uci:
                move_obj = chess.Move.from_uci(best_move_uci)
                san_move = board.san(move_obj)
                
                # Get evaluation for best move
                test_board = board.copy()
                test_board.push(move_obj)
                stockfish.set_fen_position(test_board.fen())
                eval_result = stockfish.get_evaluation()
                stockfish.set_fen_position(fen)  # Restore
                
                move_info = {
                    'move': san_move,
                    'uci': best_move_uci,
                    'evaluation': eval_result.get('value', 0) / 100.0 if eval_result.get('type') == 'cp' else eval_result.get('value', 0),
                    'type': eval_result.get('type', 'cp')
                }
                
                # Add to result if not already there
                if not any(m['uci'] == best_move_uci for m in result):
                    result.append(move_info)
            
            # Try to get more moves by analyzing other legal moves
            moves_analyzed = {best_move_uci} if best_move_uci else set()
            
            for move in legal_moves:
                if len(result) >= num_moves:
                    break
                
                move_uci = move.uci()
                if move_uci in moves_analyzed:
                    continue
                
                moves_analyzed.add(move_uci)
                
                try:
                    # Analyze this move
                    test_board = board.copy()
                    test_board.push(move)
                    stockfish.set_fen_position(test_board.fen())
                    eval_result = stockfish.get_evaluation()
                    stockfish.set_fen_position(fen)  # Restore
                    
                    san_move = board.san(move)
                    move_info = {
                        'move': san_move,
                        'uci': move_uci,
                        'evaluation': eval_result.get('value', 0) / 100.0 if eval_result.get('type') == 'cp' else eval_result.get('value', 0),
                        'type': eval_result.get('type', 'cp')
                    }
                    result.append(move_info)
                except Exception as e:
                    logger.debug(f"Error analyzing move {move_uci}: {e}")
                    continue
            
            # Sort by evaluation (best first)
            result.sort(key=lambda x: (
                -float('inf') if x['type'] == 'mate' and x['evaluation'] < 0 else float('inf') if x['type'] == 'mate' else x['evaluation']
            ), reverse=True)
            
        except Exception as e:
            logger.error(f"Error getting moves: {e}")
            if not result:
                raise ValueError("Unable to find moves")
    
    if not result:
        raise ValueError("Unable to find moves")
    
    logger.info(f"Found {len(result)} top moves")
    return result[:num_moves]  # Return only requested number

def get_position_evaluation(fen: str):
    """
    Get the evaluation of the current position.
    
    Args:
        fen: FEN string of the position
    
    Returns:
        Dict with 'value' and 'type' ('cp' or 'mate')
    """
    _check_stockfish()
    
    logger.info(f"Evaluating position")
    
    if not fen:
        raise ValueError("No FEN provided")
    
    stockfish.set_fen_position(fen)
    evaluation = stockfish.get_evaluation()
    
    return evaluation

