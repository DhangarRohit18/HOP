import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.api.deps import require_role
from app.models.core.user import User
from app.models.core.approval_request import ApprovalRequest
from app.models.core.agent_run import AgentRun
from app.models.manufacturing.purchase_order import PurchaseOrder
from app.models.manufacturing.supplier import Supplier
from app.models.manufacturing.component import Component
from app.models.manufacturing.production_order import ProductionOrder
from app.schemas.platform import (
    ApprovalRequestRead, ApprovalDecisionRequest, AgentRunRead
)
from app.services.platform.sentinel_agent import process_approval_decision

router = APIRouter(prefix="/operator", tags=["operator"])


@router.get(
    "/control-tower",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Returns main NEXUS Control Tower operational metrics and active disruption signals",
)
async def get_control_tower_summary(
    current_user: User = Depends(require_role(["OPERATOR", "ADMIN"])),
    session: AsyncSession = Depends(get_db_session),
):
    pending_approvals = await session.execute(
        select(ApprovalRequest).where(ApprovalRequest.status == "PENDING")
    )
    pending_list = list(pending_approvals.scalars().all())

    active_runs = await session.execute(
        select(AgentRun).order_by(desc(AgentRun.started_at)).limit(10)
    )
    runs_list = list(active_runs.scalars().all())

    return {
        "kpis": {
            "active_disruptions": len(runs_list),
            "production_at_risk": 1,
            "delayed_purchase_orders": 1,
            "pending_approvals": len(pending_list),
            "active_recoveries": len([r for r in runs_list if r.status == "RECOVERED"]),
        },
        "incidents": [
            {
                "incident_id": "INC-104",
                "title": "SUPPLIER DISRUPTION (SUP-001)",
                "supplier_code": "SUP-001",
                "supplier_name": "Apex Semiconductor",
                "po_number": "PO-2026-001",
                "component_code": "CMP-001",
                "delay_days": 4.0,
                "financial_exposure": 200000.00,
                "production_impact": "HIGH RISK",
                "sentinel_state": "INVESTIGATING",
                "required_action": "OPERATOR APPROVAL REQUIRED" if len(pending_list) > 0 else "AUTOMATED MONITORING",
            }
        ],
        "pending_approvals_count": len(pending_list),
    }


@router.get(
    "/approvals",
    response_model=List[ApprovalRequestRead],
    status_code=status.HTTP_200_OK,
    summary="Lists human-in-the-loop approval requests requiring operator decision",
)
async def list_approvals(
    status_filter: Optional[str] = None,
    current_user: User = Depends(require_role(["OPERATOR", "ADMIN"])),
    session: AsyncSession = Depends(get_db_session),
):
    query = select(ApprovalRequest).order_by(desc(ApprovalRequest.created_at))
    if status_filter:
        query = query.where(ApprovalRequest.status == status_filter.upper())
    result = await session.execute(query)
    return list(result.scalars().all())


@router.post(
    "/approvals/{approval_id}/decide",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Operator approves or rejects emergency procurement action",
)
async def decide_approval(
    approval_id: uuid.UUID,
    payload: ApprovalDecisionRequest,
    current_user: User = Depends(require_role(["OPERATOR", "ADMIN"])),
    session: AsyncSession = Depends(get_db_session),
):
    query = await session.execute(select(ApprovalRequest).where(ApprovalRequest.id == approval_id))
    approval = query.scalars().first()

    if not approval:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval request not found")

    if approval.status != "PENDING":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Approval request already {approval.status}")

    return await process_approval_decision(
        session=session,
        approval=approval,
        decision=payload.decision,
        operator_name=current_user.full_name or current_user.email,
    )


@router.get(
    "/agent-timeline/{incident_id}",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Returns chronological Sentinel Agent investigation timeline steps",
)
async def get_agent_timeline(
    incident_id: str,
    current_user: User = Depends(require_role(["OPERATOR", "ADMIN"])),
    session: AsyncSession = Depends(get_db_session),
):
    query = await session.execute(select(AgentRun).where(AgentRun.incident_id == incident_id))
    agent_run = query.scalars().first()

    if not agent_run:
        # Return clean default timeline for initial state
        return {
            "incident_id": incident_id,
            "status": "INVESTIGATING",
            "timeline_steps": [
                {"time": "10:42:11", "step": "EVENT RECEIVED", "message": "PO_DELAYED (PO-2026-001 +4.0 days)"},
                {"time": "10:42:12", "step": "INVESTIGATING", "message": "Analyzing graph dependencies for SUP-001"},
                {"time": "10:42:13", "step": "CHECKING INVENTORY", "message": "Component CMP-001 coverage 4.0 days"},
                {"time": "10:42:14", "step": "CHECKING PRODUCTION", "message": "Assembly order PRD-2026-001 affected"},
                {"time": "10:42:15", "step": "RECOVERY IDENTIFIED", "message": "Emergency spot procurement ($180,000)"},
                {"time": "10:42:18", "step": "WAITING FOR APPROVAL", "message": "Threshold exceeded. Operator decision required."},
            ],
        }

    return {
        "incident_id": agent_run.incident_id,
        "status": agent_run.status,
        "timeline_steps": agent_run.timeline_steps,
        "started_at": agent_run.started_at,
        "completed_at": agent_run.completed_at,
    }


@router.get(
    "/suppliers",
    response_model=List[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Returns Operator Supplier 360 overview",
)
async def list_supplier_360(
    current_user: User = Depends(require_role(["OPERATOR", "ADMIN"])),
    session: AsyncSession = Depends(get_db_session),
):
    result = await session.execute(select(Supplier).order_by(Supplier.supplier_code))
    suppliers = result.scalars().all()

    return [
        {
            "id": str(s.id),
            "supplier_code": s.supplier_code,
            "name": s.name,
            "tier": s.tier,
            "status": s.status,
            "reliability_score": float(s.reliability_score),
            "monthly_capacity_units": float(s.monthly_capacity_units),
            "active_pos": 1 if s.supplier_code == "SUP-001" else 0,
            "risk_status": "AT_RISK" if s.supplier_code == "SUP-001" else "HEALTHY",
        }
        for s in suppliers
    ]


@router.get(
    "/disruptions",
    response_model=List[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Lists active and historical operational disruptions for Disruption Radar",
)
async def list_disruptions(
    current_user: User = Depends(require_role(["OPERATOR", "ADMIN"])),
    session: AsyncSession = Depends(get_db_session),
):
    runs_query = await session.execute(select(AgentRun).order_by(desc(AgentRun.started_at)))
    runs = list(runs_query.scalars().all())

    return [
        {
            "incident_id": r.incident_id,
            "title": f"SUPPLIER DISRUPTION ({r.incident_id})",
            "event_type": "SUPPLIER_OUTAGE",
            "severity": "CRITICAL",
            "supplier_code": "SUP-001",
            "po_number": "PO-2026-001",
            "component_code": "CMP-001",
            "delay_days": 4.0,
            "financial_exposure": 200000.00 if r.status != "RECOVERED" else 0.00,
            "sentinel_status": r.status,
            "started_at": r.started_at,
        }
        for r in runs
    ] or [
        {
            "incident_id": "INC-104",
            "title": "SUPPLIER DISRUPTION (SUP-001)",
            "event_type": "SUPPLIER_OUTAGE",
            "severity": "CRITICAL",
            "supplier_code": "SUP-001",
            "po_number": "PO-2026-001",
            "component_code": "CMP-001",
            "delay_days": 4.0,
            "financial_exposure": 200000.00,
            "sentinel_status": "INVESTIGATING",
            "started_at": "2026-08-22T10:42:11Z",
        }
    ]


@router.get(
    "/inventory",
    response_model=List[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Returns operational inventory position coverage table for Operator Inventory view",
)
async def list_operator_inventory(
    current_user: User = Depends(require_role(["OPERATOR", "ADMIN"])),
    session: AsyncSession = Depends(get_db_session),
):
    comps_query = await session.execute(select(Component).order_by(Component.part_number))
    components = comps_query.scalars().all()

    return [
        {
            "id": str(c.id),
            "part_number": c.part_number,
            "name": c.name,
            "current_stock": 50,
            "daily_usage": 12.5,
            "safety_stock": 100,
            "coverage_days": 4.0 if c.part_number == "CMP-001" else 12.0,
            "risk_level": "CRITICAL" if c.part_number == "CMP-001" else "HEALTHY",
            "warehouse_code": "WH-MAIN-01",
        }
        for c in components
    ]


@router.get(
    "/purchase-orders",
    response_model=List[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Returns purchase orders graph telemetry for Operator Purchase Orders view",
)
async def list_operator_purchase_orders(
    current_user: User = Depends(require_role(["OPERATOR", "ADMIN"])),
    session: AsyncSession = Depends(get_db_session),
):
    pos_query = await session.execute(select(PurchaseOrder).order_by(PurchaseOrder.po_number))
    pos = pos_query.scalars().all()

    return [
        {
            "id": str(p.id),
            "po_number": p.po_number,
            "supplier_code": "SUP-001" if p.po_number == "PO-2026-001" else "SUP-002",
            "status": p.status,
            "order_date": str(p.order_date),
            "expected_delivery_date": str(p.expected_delivery_date),
            "total_amount": float(p.total_amount),
            "delay_days": 4.0 if p.status == "DELAYED" else 0.0,
            "risk_level": "CRITICAL" if p.status == "DELAYED" else "LOW",
        }
        for p in pos
    ]


@router.get(
    "/production",
    response_model=List[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Returns production orders and dependency risks for Operator Production view",
)
async def list_operator_production(
    current_user: User = Depends(require_role(["OPERATOR", "ADMIN"])),
    session: AsyncSession = Depends(get_db_session),
):
    prds_query = await session.execute(select(ProductionOrder).order_by(ProductionOrder.order_number))
    prds = prds_query.scalars().all()

    return [
        {
            "id": str(p.id),
            "order_number": p.order_number,
            "status": p.status,
            "priority": "HIGH",
            "start_date": str(p.planned_start_date),
            "completion_date": str(p.planned_completion_date),
            "required_component": "CMP-001",
            "production_risk": "CRITICAL" if p.order_number == "PRD-2026-001" else "LOW",
        }
        for p in prds
    ]


@router.get(
    "/agent-runs",
    response_model=List[AgentRunRead],
    status_code=status.HTTP_200_OK,
    summary="Queries Sentinel Agent runs timeline for Agent Activity view",
)
async def list_agent_runs(
    current_user: User = Depends(require_role(["OPERATOR", "ADMIN"])),
    session: AsyncSession = Depends(get_db_session),
):
    result = await session.execute(select(AgentRun).order_by(desc(AgentRun.started_at)))
    return list(result.scalars().all())
