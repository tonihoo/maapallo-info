from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from database import get_db
from schemas import FeatureResponse, FeatureCreate, FeatureUpdate
import crud

router = APIRouter()

@router.get("/", response_model=dict)
async def get_features(
    category: Optional[str] = Query(None, description="Filter by category"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    db: AsyncSession = Depends(get_db)
):
    """Get all features with optional filtering and pagination"""
    try:
        features = await crud.get_all_features(db)
        return {"features": features}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving features: {str(e)}")

@router.get("/{feature_id}", response_model=dict)
async def get_feature(feature_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific feature by ID"""
    feature = await crud.get_feature_by_id(db, feature_id=feature_id)
    if feature is None:
        raise HTTPException(status_code=404, detail="Feature not found")
    return {"feature": feature}

@router.post("/", response_model=dict)
async def create_feature(feature: FeatureCreate, db: AsyncSession = Depends(get_db)):
    """Create a new feature"""
    try:
        created_feature = await crud.create_feature(db=db, feature_data=feature)
        return {"feature": created_feature, "message": "Feature created successfully"}
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Database integrity error: {str(e)}")
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating feature: {str(e)}")

@router.put("/{feature_id}", response_model=FeatureResponse)
async def update_feature(
    feature_id: int,
    feature_update: FeatureUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an existing feature"""
    try:
        updated_feature = await crud.update_feature(db=db, feature_id=feature_id, feature_update=feature_update)
        if updated_feature is None:
            raise HTTPException(status_code=404, detail="Feature not found")
        return updated_feature
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Database integrity error: {str(e)}")
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating feature: {str(e)}")

@router.delete("/{feature_id}")
async def delete_feature(feature_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a feature"""
    try:
        success = await crud.delete_feature(db=db, feature_id=feature_id)
        if not success:
            raise HTTPException(status_code=404, detail="Feature not found")
        return {"message": "Feature deleted successfully"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting feature: {str(e)}")
