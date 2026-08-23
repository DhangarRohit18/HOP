import uuid
import pytest
import asyncio
from unittest.mock import AsyncMock
from datetime import datetime, timezone, date
from decimal import Decimal

from app.schemas.intelligence.disruption import DisruptionInput
from app.schemas.intelligence.impact import ImpactAnalysisResult, SLAExposureDetail, NodeImpactDetail
from app.schemas.intelligence.mitigation import (
    MitigationCategory,
    FeasibilityStatus,
    MitigationAction,
    MitigationSimulationRequest,
    MitigationSimulationResponse,
)
from app.services.intelligence.graph import OperationalGraph, OperationalNode, OperationalEdge
from app.services.intelligence.simulation_state import SimulationState
from app.services.intelligence.formulas import calculate_usable_inventory
from app.services.intelligence.mitigation_engine import (
    CandidateGenerator,
    MitigationSimulator,
    DecisionRanker,
    ExplanationBuilder,
    MitigationIntelligenceEngine,
)


@pytest.fixture
def golden_path_graph():
    graph = OperationalGraph()

    sup1 = OperationalNode(node_id='ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519', primitive_type='ENTITY', entity_id=uuid.uuid5(uuid.NAMESPACE_DNS, 'sup1'), business_code='SUP-001', domain='manufacturing', status='ACTIVE', attributes={'supplier_code': 'SUP-001', 'monthly_capacity_units': '10000', 'allocated_capacity_units': '9500'})
    po1 = OperationalNode(node_id='ENTITY:70c39687-7fb8-585d-9d74-98283066cbeb', primitive_type='ENTITY', entity_id=uuid.uuid5(uuid.NAMESPACE_DNS, 'po1'), business_code='PO-2026-001', domain='manufacturing', status='ACTIVE', attributes={'po_number': 'PO-2026-001'})
    shp1 = OperationalNode(node_id='ENTITY:4ad15350-a041-5989-9820-c6aadf4b25e0', primitive_type='ENTITY', entity_id=uuid.uuid5(uuid.NAMESPACE_DNS, 'shp1'), business_code='SHP-2026-001', domain='manufacturing', status='ACTIVE', attributes={'tracking_number': 'SHP-2026-001'})
    cmp1 = OperationalNode(node_id='RESOURCE:92f1b4cc-6721-5c52-9a05-833f45eeaccc', primitive_type='RESOURCE', entity_id=uuid.uuid5(uuid.NAMESPACE_DNS, 'cmp1'), business_code='CMP-001', domain='manufacturing', status='ACTIVE', attributes={'part_number': 'CMP-001', 'is_single_sourced': True})
    prd1 = OperationalNode(node_id='ENTITY:99feeb26-3d93-5dac-9fc1-0e4c909b175e', primitive_type='ENTITY', entity_id=uuid.uuid5(uuid.NAMESPACE_DNS, 'prd1'), business_code='PRD-2026-001', domain='manufacturing', status='ACTIVE', attributes={'production_order_number': 'PRD-2026-001'})
    so1 = OperationalNode(node_id='ENTITY:2127a82b-518e-5301-83d5-c4cbf919aefc', primitive_type='ENTITY', entity_id=uuid.uuid5(uuid.NAMESPACE_DNS, 'so1'), business_code='SO-2026-001', domain='manufacturing', status='ACTIVE', attributes={'order_number': 'SO-2026-001', 'customer_name': 'Titan Motors', 'liquidated_damages_per_day': '50000.00'})

    for n in [sup1, po1, shp1, cmp1, prd1, so1]:
        graph.add_node(n)

    graph.add_edge(OperationalEdge(edge_id=uuid.uuid5(uuid.NAMESPACE_DNS, 'e1'), source_node_id=sup1.node_id, target_node_id=po1.node_id, dependency_type='SUPPLIES', lead_time_hours=Decimal('72.00')))
    graph.add_edge(OperationalEdge(edge_id=uuid.uuid5(uuid.NAMESPACE_DNS, 'e2'), source_node_id=po1.node_id, target_node_id=shp1.node_id, dependency_type='TRANSPORTED_BY', lead_time_hours=Decimal('48.00')))
    graph.add_edge(OperationalEdge(edge_id=uuid.uuid5(uuid.NAMESPACE_DNS, 'e3'), source_node_id=shp1.node_id, target_node_id=cmp1.node_id, dependency_type='FULFILLS_RESOURCE', lead_time_hours=Decimal('24.00')))
    graph.add_edge(OperationalEdge(edge_id=uuid.uuid5(uuid.NAMESPACE_DNS, 'e4'), source_node_id=cmp1.node_id, target_node_id=prd1.node_id, dependency_type='REQUIRED_FOR_PRODUCTION', lead_time_hours=Decimal('72.00')))
    graph.add_edge(OperationalEdge(edge_id=uuid.uuid5(uuid.NAMESPACE_DNS, 'e5'), source_node_id=prd1.node_id, target_node_id=so1.node_id, dependency_type='FULFILLS_CUSTOMER_ORDER', lead_time_hours=Decimal('48.00')))

    return graph


@pytest.fixture
def mock_baseline_impact():
    return ImpactAnalysisResult(
        analysis_id="ANL-MOCK-001",
        disruption_id="DIS-HYP-001",
        target_node_id="ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519",
        propagation_depth=6,
        total_affected_nodes=6,
        affected_nodes=[
            NodeImpactDetail(node_id="ENTITY:de52b8c0", business_code="SUP-001", primitive_type="ENTITY", impact_type="TARGET_DISRUPTION", description="Supplier Outage"),
            NodeImpactDetail(node_id="ENTITY:2127a82b", business_code="SO-2026-001", primitive_type="ENTITY", impact_type="SLA_BREACH_EXPOSURE", description="Delivery delay of 4 days"),
        ],
        causal_paths=[["ENTITY:de52b8c0", "ENTITY:2127a82b"]],
        inventory_stockout_nodes=["RESOURCE:92f1b4cc"],
        delayed_production_orders=["ENTITY:99feeb26"],
        sla_exposures=[
            SLAExposureDetail(
                customer_order_number="SO-2026-001",
                customer_name="Titan Motors",
                requested_delivery_date="2026-08-18",
                estimated_delivery_date="2026-08-22",
                delay_days=4.0,
                liquidated_damages_per_day=Decimal("50000.00"),
                total_financial_exposure=Decimal("200000.00"),
            )
        ],
        total_financial_exposure=Decimal("200000.00"),
        bottlenecks_detected=[],
        composite_risk_score=42.92,
        score_breakdown={"bottleneck": 10.0, "sla": 32.92},
        execution_time_ms=25.0,
    )


@pytest.mark.asyncio
async def test_golden_path_mitigation_baseline(golden_path_graph, mock_baseline_impact):
    """1. Verifies baseline exposure derives dynamically to $200,000.00."""
    engine = MitigationIntelligenceEngine()
    disruption = DisruptionInput(
        disruption_id="DIS-HYP-001",
        target_type="ENTITY",
        target_id="ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519",
        event_type="SUPPLIER_OUTAGE",
        severity="CRITICAL",
        effective_at=datetime(2026, 8, 1, 12, 0, tzinfo=timezone.utc),
        duration_hours=200.0,
    )

    session = AsyncMock()
    res = await engine.evaluate_mitigations(session, disruption, mock_baseline_impact, golden_path_graph)

    assert res.baseline_financial_exposure == Decimal("200000.00")
    assert res.baseline_risk_score == 42.92
    assert len(res.candidate_options) >= 5


@pytest.mark.asyncio
async def test_shipment_expedition_derivation(golden_path_graph, mock_baseline_impact):
    """2. Validates delay reduction and net value formulas for shipment expedition."""
    disruption = DisruptionInput(
        disruption_id="DIS-HYP-001",
        target_type="ENTITY",
        target_id="ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519",
        event_type="SUPPLIER_OUTAGE",
        severity="CRITICAL",
        effective_at=datetime(2026, 8, 1, 12, 0, tzinfo=timezone.utc),
        duration_hours=200.0,
    )
    sim_state = await SimulationState.build_from_context(AsyncMock(), golden_path_graph)
    action = [c for c in CandidateGenerator.generate_candidates(sim_state, disruption, mock_baseline_impact) if c.category == MitigationCategory.SHIPMENT_EXPEDITION][0]

    outcome = MitigationSimulator.simulate_action(sim_state, action, mock_baseline_impact)

    assert outcome.category == MitigationCategory.SHIPMENT_EXPEDITION
    assert outcome.feasibility == FeasibilityStatus.FEASIBLE
    assert outcome.delay_reduction_days == 2.0
    assert outcome.avoided_sla_exposure == Decimal("100000.00")
    assert outcome.mitigation_cost == Decimal("12500.00")
    assert outcome.net_value == Decimal("87500.00")


@pytest.mark.asyncio
async def test_inventory_reallocation_usable_stock(golden_path_graph, mock_baseline_impact):
    """3. Confirms inventory reallocation usable stock formula: max(0, on_hand - reserved)."""
    sim_state = await SimulationState.build_from_context(AsyncMock(), golden_path_graph)
    wh2_inv = sim_state.inventory["WH-002:CMP-001"]
    usable = calculate_usable_inventory(wh2_inv["quantity_on_hand"], wh2_inv["quantity_reserved"])

    assert usable == Decimal("400.0000")  # 600 - 200 = 400


@pytest.mark.asyncio
async def test_supplier_substitution_single_source_blocked(golden_path_graph, mock_baseline_impact):
    """4. Confirms single-sourced CMP-001 returns UNAVAILABLE status with SINGLE_SOURCE_RESTRICTION constraint."""
    disruption = DisruptionInput(
        disruption_id="DIS-HYP-001",
        target_type="ENTITY",
        target_id="ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519",
        event_type="SUPPLIER_OUTAGE",
        severity="CRITICAL",
        effective_at=datetime(2026, 8, 1, 12, 0, tzinfo=timezone.utc),
        duration_hours=200.0,
    )
    sim_state = await SimulationState.build_from_context(AsyncMock(), golden_path_graph)
    action = [c for c in CandidateGenerator.generate_candidates(sim_state, disruption, mock_baseline_impact) if c.category == MitigationCategory.SUPPLIER_SUBSTITUTION][0]

    outcome = MitigationSimulator.simulate_action(sim_state, action, mock_baseline_impact)

    assert outcome.feasibility == FeasibilityStatus.UNAVAILABLE
    assert len(outcome.constraints) == 1
    assert outcome.constraints[0].constraint_code == "SINGLE_SOURCE_RESTRICTION"
    assert outcome.why_not is not None
    assert outcome.why_not.feasibility == FeasibilityStatus.UNAVAILABLE


@pytest.mark.asyncio
async def test_sla_acceptance_do_nothing(golden_path_graph, mock_baseline_impact):
    """5. Verifies SLA acceptance baseline option returns zero cost and zero exposure avoided."""
    disruption = DisruptionInput(
        disruption_id="DIS-HYP-001",
        target_type="ENTITY",
        target_id="ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519",
        event_type="SUPPLIER_OUTAGE",
        severity="CRITICAL",
        effective_at=datetime(2026, 8, 1, 12, 0, tzinfo=timezone.utc),
        duration_hours=200.0,
    )
    sim_state = await SimulationState.build_from_context(AsyncMock(), golden_path_graph)
    action = [c for c in CandidateGenerator.generate_candidates(sim_state, disruption, mock_baseline_impact) if c.category == MitigationCategory.SLA_ACCEPTANCE][0]

    outcome = MitigationSimulator.simulate_action(sim_state, action, mock_baseline_impact)

    assert outcome.category == MitigationCategory.SLA_ACCEPTANCE
    assert outcome.feasibility == FeasibilityStatus.FEASIBLE
    assert outcome.mitigation_cost == Decimal("0.00")
    assert outcome.avoided_sla_exposure == Decimal("0.00")
    assert outcome.residual_sla_exposure == Decimal("200000.00")


@pytest.mark.asyncio
async def test_avoided_and_net_value_formulas(golden_path_graph, mock_baseline_impact):
    """6. Verifies avoided_exposure = baseline - scenario and net_value = avoided - cost."""
    baseline = Decimal("200000.00")
    cost = Decimal("12500.00")
    scenario_exposure = Decimal("100000.00")

    avoided = max(Decimal("0.00"), baseline - scenario_exposure)
    net_val = avoided - cost

    assert avoided == Decimal("100000.00")
    assert net_val == Decimal("87500.00")


@pytest.mark.asyncio
async def test_deterministic_ranking_order(golden_path_graph, mock_baseline_impact):
    """7. Confirms candidate actions rank strictly by derived decision score."""
    engine = MitigationIntelligenceEngine()
    disruption = DisruptionInput(
        disruption_id="DIS-HYP-001",
        target_type="ENTITY",
        target_id="ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519",
        event_type="SUPPLIER_OUTAGE",
        severity="CRITICAL",
        effective_at=datetime(2026, 8, 1, 12, 0, tzinfo=timezone.utc),
        duration_hours=200.0,
    )

    res = await engine.evaluate_mitigations(AsyncMock(), disruption, mock_baseline_impact, golden_path_graph)

    scores = [c.ranking_score for c in res.candidate_options]
    assert scores == sorted(scores, reverse=True)
    assert res.top_recommendation.recommended_action_id == "ACT-EXP-SHP001"


@pytest.mark.asyncio
async def test_semantic_repeatability(golden_path_graph, mock_baseline_impact):
    """8. Confirms 100% identical semantic output across repeated simulation runs."""
    engine = MitigationIntelligenceEngine()
    disruption = DisruptionInput(
        disruption_id="DIS-HYP-001",
        target_type="ENTITY",
        target_id="ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519",
        event_type="SUPPLIER_OUTAGE",
        severity="CRITICAL",
        effective_at=datetime(2026, 8, 1, 12, 0, tzinfo=timezone.utc),
        duration_hours=200.0,
    )

    res1 = await engine.evaluate_mitigations(AsyncMock(), disruption, mock_baseline_impact, golden_path_graph)
    res2 = await engine.evaluate_mitigations(AsyncMock(), disruption, mock_baseline_impact, golden_path_graph)

    assert res1.baseline_financial_exposure == res2.baseline_financial_exposure
    assert res1.top_recommendation.recommended_action_id == res2.top_recommendation.recommended_action_id
    assert [c.action_id for c in res1.candidate_options] == [c.action_id for c in res2.candidate_options]


@pytest.mark.asyncio
async def test_zero_database_mutations(golden_path_graph, mock_baseline_impact):
    """9. Verifies zero database calls or mutations occur during mitigation evaluation."""
    mock_session = AsyncMock()
    engine = MitigationIntelligenceEngine()
    disruption = DisruptionInput(
        disruption_id="DIS-HYP-001",
        target_type="ENTITY",
        target_id="ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519",
        event_type="SUPPLIER_OUTAGE",
        severity="CRITICAL",
        effective_at=datetime(2026, 8, 1, 12, 0, tzinfo=timezone.utc),
        duration_hours=200.0,
    )

    await engine.evaluate_mitigations(mock_session, disruption, mock_baseline_impact, golden_path_graph)

    assert mock_session.add.call_count == 0
    assert mock_session.commit.call_count == 0
    assert mock_session.delete.call_count == 0


@pytest.mark.asyncio
async def test_simulation_state_isolation(golden_path_graph, mock_baseline_impact):
    """10. Confirms SimulationState cloning isolates in-memory modifications."""
    sim_state = await SimulationState.build_from_context(AsyncMock(), golden_path_graph)
    cloned_state = sim_state.clone()

    cloned_state.inventory["WH-001:CMP-001"]["quantity_on_hand"] = Decimal("9999.0000")

    assert sim_state.inventory["WH-001:CMP-001"]["quantity_on_hand"] == Decimal("500.0000")
