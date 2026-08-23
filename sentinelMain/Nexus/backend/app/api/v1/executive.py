from typing import Dict, Any, List
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.api.deps import require_role
from app.models.core.user import User
from app.models.core.approval_request import ApprovalRequest
from app.models.core.agent_run import AgentRun

router = APIRouter(prefix="/executive", tags=["executive"])


@router.get(
    "/overview",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Returns executive read-only business continuity and risk exposure metrics",
)
async def get_executive_overview(
    current_user: User = Depends(require_role(["EXECUTIVE", "OPERATOR", "ADMIN"])),
    session: AsyncSession = Depends(get_db_session),
):
    approvals_query = await session.execute(select(ApprovalRequest))
    approvals = list(approvals_query.scalars().all())

    approved_count = len([a for a in approvals if a.status == "APPROVED"])
    pending_count = len([a for a in approvals if a.status == "PENDING"])

    # If an approval is approved, exposure is recovered ($0)
    current_exposure = 200000.00 if pending_count > 0 else 0.00

    return {
        "business_metrics": {
            "production_continuity_score": 98.4 if approved_count > 0 else 82.1,
            "active_critical_disruptions": pending_count,
            "financial_exposure_usd": current_exposure,
            "recovery_success_rate_pct": 100.0 if approved_count > 0 else 0.0,
            "supplier_risk_index": "LOW" if current_exposure == 0 else "HIGH",
        },
        "incidents_summary": [
            {
                "incident_id": "INC-104",
                "title": "Apex Semiconductor Fab Delay",
                "supplier_code": "SUP-001",
                "initial_risk": "CRITICAL",
                "current_risk": "LOW" if approved_count > 0 else "CRITICAL",
                "financial_exposure": current_exposure,
                "recovery_status": "RECOVERED" if approved_count > 0 else "PENDING_OPERATOR_APPROVAL",
                "recovery_time_minutes": 14,
            }
        ],
    }


@router.get(
    "/incidents",
    response_model=List[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Returns executive incident recovery tracking reports",
)
async def get_executive_incidents(
    current_user: User = Depends(require_role(["EXECUTIVE", "OPERATOR", "ADMIN"])),
    session: AsyncSession = Depends(get_db_session),
):
    approvals_query = await session.execute(select(ApprovalRequest))
    approvals = list(approvals_query.scalars().all())
    approved = any(a.status == "APPROVED" for a in approvals)

    return [
        {
            "incident_id": "INC-104",
            "title": "Supplier Disruption (SUP-001)",
            "affected_po": "PO-2026-001",
            "affected_component": "32-bit MCU Microcontroller (CMP-001)",
            "affected_production": "PRD-2026-001",
            "customer_order": "SO-2026-001 (Titan Motors)",
            "initial_risk": "CRITICAL",
            "current_risk": "LOW" if approved else "CRITICAL",
            "initial_exposure_usd": 200000.00,
            "residual_exposure_usd": 0.00 if approved else 200000.00,
            "recovery_status": "RECOVERED" if approved else "APPROVAL_REQUIRED",
            "recovery_action": "Emergency Procurement from Alternate Supplier",
        }
    ]


@router.get(
    "/recovery",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Returns Executive read-only recovery velocity and risk reduction metrics",
)
async def get_executive_recovery_summary(
    current_user: User = Depends(require_role(["EXECUTIVE", "OPERATOR", "ADMIN"])),
    session: AsyncSession = Depends(get_db_session),
):
    approvals_query = await session.execute(select(ApprovalRequest))
    approvals = list(approvals_query.scalars().all())
    approved_count = len([a for a in approvals if a.status == "APPROVED"])

    return {
        "active_recoveries": 0 if approved_count > 0 else 1,
        "completed_recoveries": approved_count,
        "recovery_success_rate": 100.0,
        "avg_recovery_time_minutes": 14.2,
        "financial_exposure_reduced_usd": 200000.00 if approved_count > 0 else 0.00,
    }


@router.get(
    "/suppliers",
    response_model=List[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Returns Executive read-only supplier risk matrix",
)
async def get_executive_supplier_risk(
    current_user: User = Depends(require_role(["EXECUTIVE", "OPERATOR", "ADMIN"])),
    session: AsyncSession = Depends(get_db_session),
):
    return [
        {
            "supplier_code": "SUP-001",
            "name": "Apex Semiconductor",
            "tier": "TIER_1",
            "reliability_score": 0.95,
            "risk_index": "LOW",
            "active_disruptions": 0,
        },
        {
            "supplier_code": "SUP-002",
            "name": "Titan Logistics Corp",
            "tier": "TIER_1",
            "reliability_score": 0.98,
            "risk_index": "HEALTHY",
            "active_disruptions": 0,
        },
    ]
