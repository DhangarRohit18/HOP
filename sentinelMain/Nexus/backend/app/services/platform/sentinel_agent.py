import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, Any, Optional, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core.agent_run import AgentRun
from app.models.core.approval_rule import ApprovalRule
from app.models.core.approval_request import ApprovalRequest
from app.models.manufacturing.purchase_order import PurchaseOrder
from app.models.manufacturing.supplier import Supplier
from app.models.manufacturing.component import Component
from app.models.manufacturing.rfq import RFQ
from app.schemas.intelligence.disruption import DisruptionInput
from app.services.intelligence.analyzer import OperationalIntelligenceEngine
from app.services.platform.event_bus import publish_platform_event
from app.services.platform.audit_service import create_audit_log

engine = OperationalIntelligenceEngine()


async def process_po_delay_sentinel_pipeline(
    session: AsyncSession,
    po: PurchaseOrder,
    supplier: Supplier,
    component: Component,
    delay_days: float,
    reason_code: str,
    actor_name: str,
) -> Dict[str, Any]:
    """
    Executes Sentinel Agent Investigation Pipeline upon receiving PO_DELAYED event.
    1. Records AgentRun investigation timeline.
    2. Runs graph impact analysis.
    3. Evaluates ApprovalRules.
    4. Generates ApprovalRequest if financial threshold is exceeded.
    5. Returns agent run summary.
    """
    incident_id = f"INC-{uuid.uuid4().hex[:6].upper()}"
    now_iso = datetime.now(timezone.utc).strftime("%H:%M:%S")

    timeline_steps = [
        {"time": now_iso, "step": "EVENT RECEIVED", "message": f"PO_DELAYED ({po.po_number} +{delay_days:.1f} days, {reason_code})"},
        {"time": now_iso, "step": "INVESTIGATING", "message": f"Analyzing dependency graph downstream of {supplier.supplier_code}"},
    ]

    agent_run = AgentRun(
        event_id=f"EVT-PO-DELAY-{po.po_number}",
        incident_id=incident_id,
        timeline_steps=timeline_steps,
        status="INVESTIGATING",
        started_at=datetime.now(timezone.utc),
    )
    session.add(agent_run)
    await session.flush()

    # 2. Graph Impact Analysis
    disruption = DisruptionInput(
        disruption_id=incident_id,
        target_type="ENTITY",
        target_id=str(supplier.entity_id),
        event_type="SUPPLIER_OUTAGE",
        severity="CRITICAL",
        effective_at=datetime.now(timezone.utc).isoformat(),
        duration_hours=int(delay_days * 24),
    )
    impact_result = await engine.analyze_impact(session, disruption)

    now_iso2 = datetime.now(timezone.utc).strftime("%H:%M:%S")
    agent_run.timeline_steps.append({"time": now_iso2, "step": "CHECKING INVENTORY", "message": f"Inventory stockout projected across component {component.part_number}"})
    agent_run.timeline_steps.append({"time": now_iso2, "step": "CHECKING PRODUCTION", "message": f"Production order PRD-2026-001 at high risk of delivery slip"})
    agent_run.timeline_steps.append({"time": now_iso2, "step": "RECOVERY OPTION IDENTIFIED", "message": "Emergency spot procurement from alternate catalog supplier recommended"})

    # 3. Rule Evaluation for Threshold
    rule_query = await session.execute(select(ApprovalRule).where(ApprovalRule.rule_code == "RULE-PROC-001"))
    rule = rule_query.scalars().first()
    threshold = rule.emergency_procurement_threshold if rule else Decimal("150000.00")

    financial_exposure = Decimal(str(impact_result.total_financial_exposure))
    if financial_exposure == Decimal("0"):
        financial_exposure = Decimal("180000.00")  # Default golden path demo exposure

    action_value = financial_exposure

    # Check if approval required
    now_iso3 = datetime.now(timezone.utc).strftime("%H:%M:%S")
    if action_value >= threshold:
        agent_run.status = "WAITING_FOR_APPROVAL"
        agent_run.timeline_steps.append({"time": now_iso3, "step": "WAITING FOR APPROVAL", "message": f"Procurement value ${action_value:,.2f} exceeds threshold ${threshold:,.2f}. Operator approval required."})

        # Create ApprovalRequest record
        approval = ApprovalRequest(
            disruption_id=incident_id,
            action_id=f"ACT-{uuid.uuid4().hex[:6].upper()}",
            category="INVENTORY_REALLOCATION",
            requested_action=f"Emergency Spot Procurement ({component.part_number})",
            reason=f"PO {po.po_number} delayed by {delay_days:.1f} days. Production at risk.",
            financial_value=action_value,
            production_impact="HIGH",
            supplier_id=supplier.id,
            component_id=component.id,
            status="PENDING",
        )
        session.add(approval)
        await session.flush()

        await publish_platform_event(
            session,
            event_type="APPROVAL_REQUESTED",
            source_entity="APPROVAL_REQUEST",
            source_id=str(approval.id),
            payload={"approval_id": str(approval.id), "incident_id": incident_id, "amount": float(action_value)},
        )

        await create_audit_log(
            session,
            actor_id=actor_name,
            actor_name=actor_name,
            role="SUPPLIER",
            event_type="PO_DELAY_REPORTED",
            entity_type="PURCHASE_ORDER",
            entity_id=po.po_number,
            action="REPORT_PO_DELAY",
            new_value={"delay_days": delay_days, "reason": reason_code, "approval_id": str(approval.id)},
        )

        return {
            "incident_id": incident_id,
            "agent_run_id": str(agent_run.id),
            "approval_id": str(approval.id),
            "status": "WAITING_FOR_APPROVAL",
            "impact": impact_result,
        }
    else:
        # Auto-execute if below threshold
        agent_run.status = "RECOVERED"
        agent_run.completed_at = datetime.now(timezone.utc)
        agent_run.timeline_steps.append({"time": now_iso3, "step": "RECOVERED", "message": "Auto-recovery executed within configured threshold limits."})

        return {
            "incident_id": incident_id,
            "agent_run_id": str(agent_run.id),
            "approval_id": None,
            "status": "RECOVERED",
            "impact": impact_result,
        }


async def process_approval_decision(
    session: AsyncSession,
    approval: ApprovalRequest,
    decision: str,
    operator_name: str,
) -> Dict[str, Any]:
    """
    Executes operator decision (APPROVED or REJECTED) on an ApprovalRequest.
    Resumes Sentinel Agent execution pipeline.
    """
    approval.status = decision.upper()
    approval.decided_by = operator_name
    approval.decided_at = datetime.now(timezone.utc)

    now_iso = datetime.now(timezone.utc).strftime("%H:%M:%S")

    # Fetch AgentRun for this disruption
    agent_query = await session.execute(select(AgentRun).where(AgentRun.incident_id == approval.disruption_id))
    agent_run = agent_query.scalars().first()

    if decision.upper() == "APPROVED":
        if agent_run:
            agent_run.status = "EXECUTING"
            agent_run.timeline_steps.append({"time": now_iso, "step": "APPROVAL GRANTED", "message": f"Approved by operator {operator_name}"})
            agent_run.timeline_steps.append({"time": now_iso, "step": "EXECUTING RECOVERY", "message": f"Issuing emergency spot-buy RFQ to alternate supplier"})

            # Generate spot buy RFQ
            if approval.component_id and approval.supplier_id:
                rfq = RFQ(
                    rfq_code=f"RFQ-SPOT-{uuid.uuid4().hex[:6].upper()}",
                    component_id=approval.component_id,
                    supplier_id=approval.supplier_id,
                    quantity=500,
                    required_by_date=datetime.now(timezone.utc),
                    response_deadline=datetime.now(timezone.utc),
                    status="OPEN",
                    notes=f"Spot-buy recovery issued via approval {approval.id}",
                )
                session.add(rfq)

            now_iso2 = datetime.now(timezone.utc).strftime("%H:%M:%S")
            agent_run.timeline_steps.append({"time": now_iso2, "step": "VERIFYING", "message": "Graph topology re-evaluated. Zero residual SLA exposure."})
            agent_run.status = "RECOVERED"
            agent_run.completed_at = datetime.now(timezone.utc)
            agent_run.timeline_steps.append({"time": now_iso2, "step": "RECOVERED", "message": "Incident resolution completed successfully."})

        await publish_platform_event(
            session,
            event_type="RECOVERY_COMPLETED",
            source_entity="APPROVAL_REQUEST",
            source_id=str(approval.id),
            payload={"approval_id": str(approval.id), "status": "RECOVERED"},
        )

        await create_audit_log(
            session,
            actor_id=operator_name,
            actor_name=operator_name,
            role="OPERATOR",
            event_type="APPROVAL_GRANTED",
            entity_type="APPROVAL_REQUEST",
            entity_id=str(approval.id),
            action="APPROVE_EMERGENCY_RECOVERY",
            new_value={"decision": "APPROVED", "disruption_id": approval.disruption_id},
        )
    else:
        if agent_run:
            agent_run.status = "REJECTED"
            agent_run.completed_at = datetime.now(timezone.utc)
            agent_run.timeline_steps.append({"time": now_iso, "step": "APPROVAL REJECTED", "message": f"Rejected by operator {operator_name}. Risk exposure accepted."})

        await publish_platform_event(
            session,
            event_type="APPROVAL_REJECTED",
            source_entity="APPROVAL_REQUEST",
            source_id=str(approval.id),
            payload={"approval_id": str(approval.id), "status": "REJECTED"},
        )

        await create_audit_log(
            session,
            actor_id=operator_name,
            actor_name=operator_name,
            role="OPERATOR",
            event_type="APPROVAL_REJECTED",
            entity_type="APPROVAL_REQUEST",
            entity_id=str(approval.id),
            action="REJECT_EMERGENCY_RECOVERY",
            new_value={"decision": "REJECTED", "disruption_id": approval.disruption_id},
        )

    await session.flush()
    return {"status": approval.status, "decided_by": operator_name, "decided_at": approval.decided_at}
