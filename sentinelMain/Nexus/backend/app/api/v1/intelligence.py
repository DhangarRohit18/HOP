import uuid
from typing import List, Dict, Any, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.intelligence.disruption import DisruptionInput
from app.schemas.intelligence.impact import (
    ImpactAnalysisResult, InventoryRiskResponse, BottleneckItem, CriticalPathItem
)
from app.schemas.intelligence.mitigation import (
    MitigationSimulationRequest, MitigationSimulationResponse
)
from app.services.intelligence.analyzer import OperationalIntelligenceEngine
from app.services.intelligence.mitigation_engine import MitigationIntelligenceEngine
from app.services.intelligence.builder import get_or_build_operational_graph
from app.services.intelligence.traversal import find_critical_paths, find_shortest_causal_path
from app.services.intelligence.bottlenecks import detect_bottlenecks

router = APIRouter(prefix="/intelligence", tags=["intelligence"])
engine = OperationalIntelligenceEngine()


@router.post(
    "/impact-analysis",
    response_model=ImpactAnalysisResult,
    status_code=status.HTTP_200_OK,
    summary="Evaluates operational disruption impact across downstream dependency graph",
)
async def analyze_disruption_impact(
    disruption: DisruptionInput,
    session: AsyncSession = Depends(get_db_session),
):
    try:
        result = await engine.analyze_impact(session, disruption)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Intelligence engine analysis error: {str(e)}",
        )


@router.get(
    "/graph/{node_type}/{node_id}",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Returns localized graph node details and immediate neighbors",
)
async def get_node_subgraph(
    node_type: str,
    node_id: str,
    session: AsyncSession = Depends(get_db_session),
):
    graph = await get_or_build_operational_graph(session)
    full_key = f"{node_type.upper()}:{node_id}" if ":" not in node_id else node_id
    node = graph.get_node(full_key)

    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Operational graph node '{full_key}' not found",
        )

    outgoing = graph.get_outgoing_neighbors(full_key)
    incoming = graph.get_incoming_neighbors(full_key)

    return {
        "node": {
            "node_id": node.node_id,
            "business_code": node.business_code,
            "primitive_type": node.primitive_type,
            "domain": node.domain,
            "status": node.status,
            "attributes": node.attributes,
        },
        "outgoing_neighbors": outgoing,
        "incoming_neighbors": incoming,
    }


@router.get(
    "/dependencies/{node_type}/{node_id}",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Returns directional outgoing and incoming dependency edges for a node",
)
async def get_node_dependencies(
    node_type: str,
    node_id: str,
    session: AsyncSession = Depends(get_db_session),
):
    graph = await get_or_build_operational_graph(session)
    full_key = f"{node_type.upper()}:{node_id}" if ":" not in node_id else node_id
    node = graph.get_node(full_key)

    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Operational graph node '{full_key}' not found",
        )

    outgoing_edges = []
    for target in graph.get_outgoing_neighbors(full_key):
        edge = graph.get_edge(full_key, target)
        if edge:
            outgoing_edges.append({
                "edge_id": str(edge.edge_id),
                "target_node_id": edge.target_node_id,
                "dependency_type": edge.dependency_type,
                "criticality": edge.criticality,
                "lead_time_hours": str(edge.lead_time_hours),
            })

    return {
        "node_id": full_key,
        "business_code": node.business_code,
        "outgoing_dependencies": outgoing_edges,
    }


@router.get(
    "/bottlenecks",
    response_model=List[BottleneckItem],
    status_code=status.HTTP_200_OK,
    summary="Returns active structural network bottlenecks",
)
async def get_network_bottlenecks(
    session: AsyncSession = Depends(get_db_session),
):
    graph = await get_or_build_operational_graph(session)
    items = detect_bottlenecks(graph)
    return [
        BottleneckItem(
            bottleneck_id=b["bottleneck_id"],
            node_id=b["node_id"],
            business_code=b["business_code"],
            bottleneck_type=b["bottleneck_type"],
            severity=b["severity"],
            description=b["description"],
        )
        for b in items
    ]


@router.get(
    "/critical-paths",
    response_model=List[CriticalPathItem],
    status_code=status.HTTP_200_OK,
    summary="Returns critical paths terminating at SLA customer orders",
)
async def get_critical_paths(
    source_node_id: Optional[str] = None,
    session: AsyncSession = Depends(get_db_session),
):
    graph = await get_or_build_operational_graph(session)
    src_key: Optional[str] = None
    if source_node_id:
        if source_node_id in graph.nodes:
            src_key = source_node_id
        else:
            clean_code = source_node_id.split(":")[-1] if ":" in source_node_id else source_node_id
            for node in graph.nodes.values():
                if node.business_code == clean_code or node.node_id == source_node_id:
                    src_key = node.node_id
                    break

    if not src_key:
        src_key = next((n.node_id for n in graph.nodes.values() if n.business_code == "SUP-001"), "")

    if not src_key or src_key not in graph.nodes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source node '{source_node_id or src_key}' not found in operational graph",
        )

    paths = find_critical_paths(graph, src_key, max_depth=15, max_paths=100)

    items: List[CriticalPathItem] = []
    for path in paths:
        if len(path) > 1:
            total_lead = Decimal("0.00")
            for idx in range(len(path) - 1):
                edge = graph.get_edge(path[idx], path[idx + 1])
                if edge:
                    total_lead += edge.lead_time_hours

            items.append(
                CriticalPathItem(
                    source_node_id=path[0],
                    target_node_id=path[-1],
                    path=path,
                    total_lead_time_hours=total_lead,
                )
            )

    return items


@router.get(
    "/inventory-risk",
    response_model=InventoryRiskResponse,
    status_code=status.HTTP_200_OK,
    summary="Returns deterministic inventory stockout risk classifications",
)
async def get_inventory_risk(
    session: AsyncSession = Depends(get_db_session),
):
    return await engine.get_inventory_risk(session)


@router.post(
    "/mitigations",
    response_model=MitigationSimulationResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluates hypothetical mitigation strategies against operational disruption",
)
async def evaluate_mitigation_strategies(
    request: MitigationSimulationRequest,
    session: AsyncSession = Depends(get_db_session),
):
    try:
        graph = await get_or_build_operational_graph(session)

        disruption = DisruptionInput(
            disruption_id=request.disruption_id,
            target_type=request.target_type,
            target_id=request.target_id,
            event_type=request.event_type,
            severity=request.severity,
            effective_at=request.effective_at,
            duration_hours=request.duration_hours,
        )

        baseline_impact = await engine.analyze_impact(session, disruption)

        mitigation_engine = MitigationIntelligenceEngine()
        result = await mitigation_engine.evaluate_mitigations(
            session, disruption, baseline_impact, graph
        )

        if request.selected_action_id:
            action_ids = [c.action_id for c in result.candidate_options]
            if request.selected_action_id not in action_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Selected action_id '{request.selected_action_id}' is not a valid candidate for this disruption.",
                )

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Mitigation intelligence engine evaluation error: {str(e)}",
        )

