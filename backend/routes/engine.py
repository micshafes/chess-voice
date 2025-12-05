from fastapi import APIRouter, HTTPException, Query
from services.engine_service import get_top_moves, get_position_evaluation
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/top-moves/")
async def top_moves(
    fen: str = Query(..., description="FEN string of the position"),
    depth: int = Query(15, ge=1, le=30, description="Analysis depth"),
    num_moves: int = Query(5, ge=1, le=10, description="Number of top moves to return")
):
    """Get top N moves from Stockfish engine."""
    try:
        logger.info(f"Getting top {num_moves} moves for FEN: {fen[:50]}...")
        moves = get_top_moves(fen, depth, num_moves)
        return {"moves": moves}
    except ValueError as e:
        logger.error(f"Value error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/evaluation/")
async def evaluation(fen: str = Query(..., description="FEN string of the position")):
    """Get position evaluation from Stockfish."""
    try:
        logger.info(f"Evaluating position: {fen[:50]}...")
        eval_result = get_position_evaluation(fen)
        return eval_result
    except ValueError as e:
        logger.error(f"Value error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


