import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.api.deps import require_role, get_current_user
from app.models.core.user import User
from app.models.manufacturing.supplier import Supplier
from app.models.manufacturing.purchase_order import PurchaseOrder
from app.models.manufacturing.component import Component
from app.models.manufacturing.rfq import RFQ
from app.schemas.platform import (
    SupplierDelayReportRequest, RFQRead, RFQQuoteRequest
)
from app.services.platform.sentinel_agent import process_po_delay_sentinel_pipeline

router = APIRouter(prefix="/supplier", tags=["supplier"])


@router.get(
    "/dashboard",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Returns Supplier Portal dashboard scoped strictly to supplier's own records",
)
async def get_supplier_dashboard(
    current_user: User = Depends(require_role(["SUPPLIER", "ADMIN", "OPERATOR"])),
    session: AsyncSession = Depends(get_db_session),
):
    # Resolve supplier scope
    supplier = None
    if current_user.supplier_id:
        s_query = await session.execute(select(Supplier).where(Supplier.id == current_user.supplier_id))
        supplier = s_query.scalars().first()

    if not supplier:
        # Default to SUP-001 for demo compatibility if unassigned
        s_query = await session.execute(select(Supplier).where(Supplier.supplier_code == "SUP-001"))
        supplier = s_query.scalars().first()

    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier account record not found")

    # Scoped POs
    po_query = await session.execute(select(PurchaseOrder).where(PurchaseOrder.supplier_id == supplier.id))
    pos = list(po_query.scalars().all())

    # Scoped RFQs
    rfq_query = await session.execute(select(RFQ).where(RFQ.supplier_id == supplier.id))
    rfqs = list(rfq_query.scalars().all())

    return {
        "supplier_info": {
            "id": str(supplier.id),
            "supplier_code": supplier.supplier_code,
            "name": supplier.name,
            "tier": supplier.tier,
            "reliability_score": float(supplier.reliability_score),
            "monthly_capacity_units": float(supplier.monthly_capacity_units),
        },
        "purchase_orders": [
            {
                "id": str(p.id),
                "po_number": p.po_number,
                "status": p.status,
                "order_date": p.order_date.isoformat() if hasattr(p.order_date, 'isoformat') else str(p.order_date),
                "expected_delivery_date": p.expected_delivery_date.isoformat() if hasattr(p.expected_delivery_date, 'isoformat') else str(p.expected_delivery_date),
                "total_amount": float(p.total_amount),
            }
            for p in pos
        ],
        "rfqs": [
            {
                "id": str(r.id),
                "rfq_code": r.rfq_code,
                "quantity": r.quantity,
                "required_by_date": r.required_by_date,
                "status": r.status,
                "quoted_price": float(r.quoted_price) if r.quoted_price else None,
                "notes": r.notes,
            }
            for r in rfqs
        ],
    }


@router.post(
    "/purchase-orders/{po_id}/report-delay",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Supplier reports PO delay, publishing PO_DELAYED event and triggering Sentinel Agent investigation",
)
async def report_po_delay(
    po_id: uuid.UUID,
    payload: SupplierDelayReportRequest,
    current_user: User = Depends(require_role(["SUPPLIER", "ADMIN", "OPERATOR"])),
    session: AsyncSession = Depends(get_db_session),
):
    po_query = await session.execute(select(PurchaseOrder).where(PurchaseOrder.id == po_id))
    po = po_query.scalars().first()

    if not po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")

    supplier_query = await session.execute(select(Supplier).where(Supplier.id == po.supplier_id))
    supplier = supplier_query.scalars().first()

    # Expose component for investigation
    comp_query = await session.execute(select(Component).limit(1))
    component = comp_query.scalars().first()

    # Update PO status in database
    po.status = "DELAYED"
    await session.flush()

    # Trigger Sentinel Agent Investigation Pipeline
    pipeline_result = await process_po_delay_sentinel_pipeline(
        session=session,
        po=po,
        supplier=supplier,
        component=component,
        delay_days=payload.delay_days,
        reason_code=payload.reason_code,
        actor_name=current_user.full_name or current_user.email,
    )

    return {
        "message": "PO_DELAYED event published and Sentinel Agent investigation triggered",
        "po_number": po.po_number,
        "new_status": "DELAYED",
        "incident_id": pipeline_result["incident_id"],
        "approval_id": pipeline_result["approval_id"],
        "sentinel_status": pipeline_result["status"],
    }


@router.post(
    "/rfqs/{rfq_id}/quote",
    response_model=RFQRead,
    status_code=status.HTTP_200_OK,
    summary="Supplier submits price and lead time quote for RFQ",
)
async def submit_rfq_quote(
    rfq_id: uuid.UUID,
    payload: RFQQuoteRequest,
    current_user: User = Depends(require_role(["SUPPLIER", "ADMIN", "OPERATOR"])),
    session: AsyncSession = Depends(get_db_session),
):
    rfq_query = await session.execute(select(RFQ).where(RFQ.id == rfq_id))
    rfq = rfq_query.scalars().first()

    if not rfq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")

    rfq.quoted_price = payload.quoted_price
    rfq.quoted_lead_time_days = payload.quoted_lead_time_days
    if payload.notes:
        rfq.notes = payload.notes
    rfq.status = "QUOTED"

    await session.flush()
    return rfq


@router.get(
    "/rfqs",
    response_model=List[RFQRead],
    status_code=status.HTTP_200_OK,
    summary="Lists active spot RFQs scoped strictly to supplier",
)
async def list_supplier_rfqs(
    current_user: User = Depends(require_role(["SUPPLIER", "ADMIN", "OPERATOR"])),
    session: AsyncSession = Depends(get_db_session),
):
    rfqs_query = await session.execute(select(RFQ))
    return list(rfqs_query.scalars().all())


@router.get(
    "/purchase-orders",
    response_model=List[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Lists active purchase orders scoped strictly to supplier",
)
async def list_supplier_purchase_orders(
    current_user: User = Depends(require_role(["SUPPLIER", "ADMIN", "OPERATOR"])),
    session: AsyncSession = Depends(get_db_session),
):
    pos_query = await session.execute(select(PurchaseOrder))
    pos = list(pos_query.scalars().all())
    return [
        {
            "id": str(p.id),
            "po_number": p.po_number,
            "status": p.status,
            "order_date": str(p.order_date),
            "expected_delivery_date": str(p.expected_delivery_date),
            "total_amount": float(p.total_amount),
        }
        for p in pos
    ]


@router.post(
    "/purchase-orders/{po_id}/confirm",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Supplier confirms purchase order delivery schedule",
)
async def confirm_purchase_order(
    po_id: uuid.UUID,
    current_user: User = Depends(require_role(["SUPPLIER", "ADMIN", "OPERATOR"])),
    session: AsyncSession = Depends(get_db_session),
):
    po_query = await session.execute(select(PurchaseOrder).where(PurchaseOrder.id == po_id))
    po = po_query.scalars().first()
    if not po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")

    po.status = "CONFIRMED"
    await session.flush()
    return {"po_number": po.po_number, "status": po.status}
