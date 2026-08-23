import uuid
import pytest
import asyncio
from unittest.mock import AsyncMock, patch
from datetime import datetime, timezone, date
from decimal import Decimal
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.intelligence.disruption import DisruptionInput
from app.schemas.intelligence.impact import ImpactAnalysisResult, SLAExposureDetail, NodeImpactDetail
from app.schemas.intelligence.mitigation import FeasibilityStatus, MitigationCategory, MitigationOutcome, MitigationConstraint
from app.services.intelligence.graph import OperationalGraph, OperationalNode, OperationalEdge
from app.services.intelligence.mitigation_engine import DecisionRanker

client = TestClient(app)


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


def test_mitigation_api_endpoint_exists(golden_path_graph, mock_baseline_impact):
    """1 & 2. Verifies POST /api/v1/intelligence/mitigations exists and returns HTTP 200 OK."""
    payload = {
        "disruption_id": "DIS-HYP-001",
        "target_type": "ENTITY",
        "target_id": "ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519",
        "event_type": "SUPPLIER_OUTAGE",
        "severity": "CRITICAL",
        "effective_at": "2026-08-01T12:00:00Z",
        "duration_hours": 200.0,
    }

    with patch("app.api.v1.intelligence.get_or_build_operational_graph", new=AsyncMock(return_value=golden_path_graph)), \
         patch("app.api.v1.intelligence.engine.analyze_impact", new=AsyncMock(return_value=mock_baseline_impact)):

        response = client.post("/api/v1/intelligence/mitigations", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "simulation_id" in data
        assert data["disruption_id"] == "DIS-HYP-001"
        assert float(data["baseline_financial_exposure"]) == 200000.0


def test_mitigation_api_golden_path_dynamic_exposure(golden_path_graph, mock_baseline_impact):
    """3 & 4. Verifies Golden Path request returns dynamically derived baseline exposure ($200,000.00)."""
    payload = {
        "disruption_id": "DIS-HYP-001",
        "target_type": "ENTITY",
        "target_id": "ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519",
        "event_type": "SUPPLIER_OUTAGE",
        "severity": "CRITICAL",
        "effective_at": "2026-08-01T12:00:00Z",
        "duration_hours": 200.0,
    }

    with patch("app.api.v1.intelligence.get_or_build_operational_graph", new=AsyncMock(return_value=golden_path_graph)), \
         patch("app.api.v1.intelligence.engine.analyze_impact", new=AsyncMock(return_value=mock_baseline_impact)):

        response = client.post("/api/v1/intelligence/mitigations", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert float(data["baseline_financial_exposure"]) == 200000.0
        assert data["baseline_risk_score"] == 42.92


def test_mitigation_api_candidate_categories(golden_path_graph, mock_baseline_impact):
    """5, 6, 7. Verifies candidate options contain all 5 categories and single-source CMP-001 is UNAVAILABLE."""
    payload = {
        "disruption_id": "DIS-HYP-001",
        "target_type": "ENTITY",
        "target_id": "ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519",
        "event_type": "SUPPLIER_OUTAGE",
        "severity": "CRITICAL",
        "effective_at": "2026-08-01T12:00:00Z",
        "duration_hours": 200.0,
    }

    with patch("app.api.v1.intelligence.get_or_build_operational_graph", new=AsyncMock(return_value=golden_path_graph)), \
         patch("app.api.v1.intelligence.engine.analyze_impact", new=AsyncMock(return_value=mock_baseline_impact)):

        response = client.post("/api/v1/intelligence/mitigations", json=payload)
        data = response.json()
        candidates = data["candidate_options"]

        categories = [c["category"] for c in candidates]
        assert "SHIPMENT_EXPEDITION" in categories
        assert "INVENTORY_REALLOCATION" in categories
        assert "PRODUCTION_PRIORITIZATION" in categories
        assert "SUPPLIER_SUBSTITUTION" in categories
        assert "SLA_ACCEPTANCE" in categories

        supp_sub = [c for c in candidates if c["category"] == "SUPPLIER_SUBSTITUTION"][0]
        assert supp_sub["feasibility"] == "UNAVAILABLE"
        assert supp_sub["constraints"][0]["constraint_code"] == "SINGLE_SOURCE_RESTRICTION"


def test_mitigation_api_invalid_duration_rejection():
    """8 & 9. Verifies invalid negative duration or missing fields are rejected with HTTP 422."""
    invalid_payload = {
        "disruption_id": "DIS-HYP-001",
        "target_type": "ENTITY",
        "target_id": "ENTITY:de52b8c0",
        "event_type": "SUPPLIER_OUTAGE",
        "severity": "CRITICAL",
        "effective_at": "2026-08-01T12:00:00Z",
        "duration_hours": -10.0,  # Negative duration invalid
    }

    response = client.post("/api/v1/intelligence/mitigations", json=invalid_payload)
    assert response.status_code == 422


def test_mitigation_api_invalid_selected_action_id(golden_path_graph, mock_baseline_impact):
    """10. Verifies invalid selected_action_id returns HTTP 400 validation error."""
    payload = {
        "disruption_id": "DIS-HYP-001",
        "target_type": "ENTITY",
        "target_id": "ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519",
        "event_type": "SUPPLIER_OUTAGE",
        "severity": "CRITICAL",
        "effective_at": "2026-08-01T12:00:00Z",
        "duration_hours": 200.0,
        "selected_action_id": "ACT-NONEXISTENT-999",
    }

    with patch("app.api.v1.intelligence.get_or_build_operational_graph", new=AsyncMock(return_value=golden_path_graph)), \
         patch("app.api.v1.intelligence.engine.analyze_impact", new=AsyncMock(return_value=mock_baseline_impact)):

        response = client.post("/api/v1/intelligence/mitigations", json=payload)
        assert response.status_code == 400
        assert "not a valid candidate" in response.json()["detail"]


def test_mitigation_api_semantic_repeatability(golden_path_graph, mock_baseline_impact):
    """11, 12, 13. Verifies repeated identical requests produce identical semantic intelligence."""
    payload = {
        "disruption_id": "DIS-HYP-001",
        "target_type": "ENTITY",
        "target_id": "ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519",
        "event_type": "SUPPLIER_OUTAGE",
        "severity": "CRITICAL",
        "effective_at": "2026-08-01T12:00:00Z",
        "duration_hours": 200.0,
    }

    with patch("app.api.v1.intelligence.get_or_build_operational_graph", new=AsyncMock(return_value=golden_path_graph)), \
         patch("app.api.v1.intelligence.engine.analyze_impact", new=AsyncMock(return_value=mock_baseline_impact)):

        res1 = client.post("/api/v1/intelligence/mitigations", json=payload).json()
        res2 = client.post("/api/v1/intelligence/mitigations", json=payload).json()

        assert res1["baseline_financial_exposure"] == res2["baseline_financial_exposure"]
        assert res1["top_recommendation"]["recommended_action_id"] == res2["top_recommendation"]["recommended_action_id"]
        assert [c["action_id"] for c in res1["candidate_options"]] == [c["action_id"] for c in res2["candidate_options"]]


def test_mitigation_api_constraint_penalty_positive_sign_semantics(golden_path_graph, mock_baseline_impact):
    """Verifies constraint_penalty is positive magnitude (1000.0) and final_decision_score is -1000.0 for UNAVAILABLE/BLOCKED."""
    payload = {
        "disruption_id": "DIS-HYP-001",
        "target_type": "ENTITY",
        "target_id": "ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519",
        "event_type": "SUPPLIER_OUTAGE",
        "severity": "CRITICAL",
        "effective_at": "2026-08-01T12:00:00Z",
        "duration_hours": 200.0,
    }

    with patch("app.api.v1.intelligence.get_or_build_operational_graph", new=AsyncMock(return_value=golden_path_graph)), \
         patch("app.api.v1.intelligence.engine.analyze_impact", new=AsyncMock(return_value=mock_baseline_impact)):

        response = client.post("/api/v1/intelligence/mitigations", json=payload)
        data = response.json()
        candidates = data["candidate_options"]

        for cand in candidates:
            breakdown = cand["score_breakdown"]
            assert breakdown["constraint_penalty"] >= 0.0

            if cand["feasibility"] == "FEASIBLE":
                assert breakdown["constraint_penalty"] == 0.0
            elif cand["feasibility"] in ("UNAVAILABLE", "BLOCKED"):
                assert breakdown["constraint_penalty"] == 1000.0
                assert cand["ranking_score"] == -1000.0
                assert breakdown["final_decision_score"] == -1000.0

        blocked_outcome = MitigationOutcome(
            action_id="ACT-BLK-TEST",
            category=MitigationCategory.SUPPLIER_SUBSTITUTION,
            feasibility=FeasibilityStatus.BLOCKED,
            constraints=[MitigationConstraint(constraint_code="REQUIRED_CAPACITY_DATA_UNAVAILABLE", is_violated=True, reason="Blocked")],
            baseline_sla_exposure=Decimal("200000.00"),
            mitigation_cost=Decimal("0.00"),
            delay_reduction_days=0.0,
            resulting_delivery_date="2026-08-22",
            avoided_sla_exposure=Decimal("0.00"),
            residual_sla_exposure=Decimal("200000.00"),
            net_value=Decimal("0.00"),
            residual_risk_score=42.92,
            ranking_score=0.0,
        )

        ranked = DecisionRanker.score_and_rank_outcomes([blocked_outcome], 42.92)
        assert ranked[0].score_breakdown["constraint_penalty"] == 1000.0
        assert ranked[0].score_breakdown["final_decision_score"] == -1000.0
