from fastapi import APIRouter, HTTPException, Query
from services.master_games_service import get_master_moves
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/master-moves/")
async def master_moves(fen: str = Query(..., description="FEN string of the position")):
    """Get moves played by masters from a given position."""
    try:
        logger.info(f"Looking up master moves for position: {fen[:50]}...")
        result = get_master_moves(fen)
        return result
    except Exception as e:
        logger.error(f"Error looking up master moves: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


