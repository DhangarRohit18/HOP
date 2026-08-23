from typing import List
from fastapi import APIRouter, HTTPException, status
from app.schemas.traceability.material import (
    MaterialPassport,
    MaterialHistoryEvent,
    MaterialImpactResponse,
)
from app.services.traceability.material_service import traceability_service

router = APIRouter()


@router.get(
    "/material/{material_id}",
    response_model=MaterialPassport,
    status_code=status.HTTP_200_OK,
    summary="Get Digital Material Passport",
    description="Returns the comprehensive Digital Material Passport for a physical unit including identity, provenance, state, relationships, and risk.",
)
def get_material_passport(material_id: str) -> MaterialPassport:
    passport = traceability_service.get_material_passport(material_id)
    if not passport:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Material unit '{material_id}' not found",
        )
    return passport


@router.get(
    "/material/{material_id}/passport",
    response_model=MaterialPassport,
    status_code=status.HTTP_200_OK,
    summary="Get Digital Material Passport (Alias)",
    description="Alias endpoint returning the Digital Material Passport for a physical unit.",
)
def get_material_passport_alias(material_id: str) -> MaterialPassport:
    return get_material_passport(material_id)


@router.get(
    "/material/{material_id}/history",
    response_model=List[MaterialHistoryEvent],
    status_code=status.HTTP_200_OK,
    summary="Get Material Lifecycle History Events",
    description="Returns the chronological, deterministic lifecycle event log for a material unit.",
)
def get_material_history(material_id: str) -> List[MaterialHistoryEvent]:
    history = traceability_service.get_material_history(material_id)
    if history is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Material unit '{material_id}' not found",
        )
    return history


@router.get(
    "/material/{material_id}/impact",
    response_model=MaterialImpactResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Material Unit Upstream and Downstream Impact",
    description="Traces upstream provenance dependencies and downstream fulfillment impact for a specific physical material unit.",
)
def get_material_impact(material_id: str) -> MaterialImpactResponse:
    impact = traceability_service.get_material_impact(material_id)
    if not impact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Material unit '{material_id}' not found",
        )
    return impact
