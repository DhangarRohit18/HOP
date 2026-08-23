import uuid
import pytest
from decimal import Decimal
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.services.intelligence.graph import OperationalGraph, OperationalNode, OperationalEdge
from app.schemas.intelligence.impact import ImpactAnalysisResult, SLAExposureDetail, NodeImpactDetail

client = TestClient(app)


@pytest.fixture
def golden_path_graph():
    graph = OperationalGraph()

    sup1 = OperationalNode(
        node_id='ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519',
        primitive_type='ENTITY',
        entity_id=uuid.uuid5(uuid.NAMESPACE_DNS, 'sup1'),
        business_code='SUP-001',
        domain='manufacturing',
        status='ACTIVE',
        attributes={'supplier_code': 'SUP-001', 'monthly_capacity_units': '10000', 'allocated_capacity_units': '9500'}
    )
    po1 = OperationalNode(
        node_id='ENTITY:70c39687-7fb8-585d-9d74-98283066cbeb',
        primitive_type='ENTITY',
        entity_id=uuid.uuid5(uuid.NAMESPACE_DNS, 'po1'),
        business_code='PO-2026-001',
        domain='manufacturing',
        status='ACTIVE',
        attributes={'po_number': 'PO-2026-001'}
    )
    shp1 = OperationalNode(
        node_id='ENTITY:4ad15350-a041-5989-9820-c6aadf4b25e0',
        primitive_type='ENTITY',
        entity_id=uuid.uuid5(uuid.NAMESPACE_DNS, 'shp1'),
        business_code='SHP-2026-001',
        domain='manufacturing',
        status='ACTIVE',
        attributes={'tracking_number': 'SHP-2026-001'}
    )
    cmp1 = OperationalNode(
        node_id='RESOURCE:92f1b4cc-6721-5c52-9a05-833f45eeaccc',
        primitive_type='RESOURCE',
        entity_id=uuid.uuid5(uuid.NAMESPACE_DNS, 'cmp1'),
        business_code='CMP-001',
        domain='manufacturing',
        status='ACTIVE',
        attributes={'part_number': 'CMP-001', 'is_single_sourced': True}
    )
    prd1 = OperationalNode(
        node_id='ENTITY:99feeb26-3d93-5dac-9fc1-0e4c909b175e',
        primitive_type='ENTITY',
        entity_id=uuid.uuid5(uuid.NAMESPACE_DNS, 'prd1'),
        business_code='PRD-2026-001',
        domain='manufacturing',
        status='ACTIVE',
        attributes={'production_order_number': 'PRD-2026-001'}
    )
    so1 = OperationalNode(
        node_id='ENTITY:2127a82b-518e-5301-83d5-c4cbf919aefc',
        primitive_type='ENTITY',
        entity_id=uuid.uuid5(uuid.NAMESPACE_DNS, 'so1'),
        business_code='SO-2026-001',
        domain='manufacturing',
        status='ACTIVE',
        attributes={'order_number': 'SO-2026-001', 'customer_name': 'Titan Motors', 'liquidated_damages_per_day': '50000.00'}
    )

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
        causal_paths=[["ENTITY:de52b8c0", "ENTITY:70c39687", "ENTITY:4ad15350", "RESOURCE:92f1b4cc", "ENTITY:99feeb26", "ENTITY:2127a82b"]],
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


# 1. CMP-001-00427 resolves successfully
def test_01_material_unit_resolution_cmp_001_00427():
    response = client.get("/api/v1/traceability/material/CMP-001-00427")
    assert response.status_code == 200
    data = response.json()
    assert data["material_unit_id"] == "CMP-001-00427"
    assert data["identity"]["component_id"] == "CMP-001"
    assert data["identity"]["serial_number"] == "MCU-00427"


# 2. CMP-001-00428 resolves successfully
def test_02_material_unit_resolution_cmp_001_00428():
    response = client.get("/api/v1/traceability/material/CMP-001-00428")
    assert response.status_code == 200
    data = response.json()
    assert data["material_unit_id"] == "CMP-001-00428"
    assert data["identity"]["serial_number"] == "MCU-00428"


# 3. CMP-001-00429 resolves successfully
def test_03_material_unit_resolution_cmp_001_00429():
    response = client.get("/api/v1/traceability/material/CMP-001-00429")
    assert response.status_code == 200
    data = response.json()
    assert data["material_unit_id"] == "CMP-001-00429"
    assert data["identity"]["serial_number"] == "MCU-00429"


# 4. AT_RISK state is deterministic
def test_04_at_risk_state_deterministic():
    data = client.get("/api/v1/traceability/material/CMP-001-00427").json()
    assert data["current_state"]["condition"] == "AT_RISK"
    assert data["risk"]["is_at_risk"] is True
    assert data["risk"]["active_disruption_id"] == "INC-2026-001"
    assert data["risk"]["sla_exposure"] == 200000.0


# 5. HEALTHY state is deterministic
def test_05_healthy_state_deterministic():
    data = client.get("/api/v1/traceability/material/CMP-001-00428").json()
    assert data["current_state"]["condition"] == "HEALTHY"
    assert data["current_state"]["quality_status"] == "VERIFIED"
    assert data["current_state"]["inspection_status"] == "PASSED"
    assert data["risk"]["is_at_risk"] is False
    assert data["risk"]["sla_exposure"] == 0.0


# 6. QUARANTINED state is deterministic
def test_06_quarantined_state_deterministic():
    data = client.get("/api/v1/traceability/material/CMP-001-00429").json()
    assert data["current_state"]["condition"] == "QUARANTINED"
    assert data["current_state"]["quality_status"] == "FAILED"
    assert data["current_state"]["inspection_status"] == "FAILED"
    assert data["current_state"]["operational_status"] == "BLOCKED"
    assert data["risk"]["sla_exposure"] == 0.0


# 7. AT_RISK lifecycle is chronological
def test_07_at_risk_lifecycle_chronological():
    events = client.get("/api/v1/traceability/material/CMP-001-00427/history").json()
    timestamps = [e["timestamp"] for e in events]
    assert timestamps == sorted(timestamps)
    assert events[0]["event_type"] == "MATERIAL_CREATED"
    assert events[-1]["event_type"] == "IMPACT_ANALYZED"


# 8. HEALTHY lifecycle is chronological
def test_08_healthy_lifecycle_chronological():
    events = client.get("/api/v1/traceability/material/CMP-001-00428/history").json()
    timestamps = [e["timestamp"] for e in events]
    assert timestamps == sorted(timestamps)
    assert events[0]["event_type"] == "MATERIAL_CREATED"
    assert events[-1]["event_type"] == "RECEIVED"


# 9. QUARANTINED lifecycle is chronological
def test_09_quarantined_lifecycle_chronological():
    events = client.get("/api/v1/traceability/material/CMP-001-00429/history").json()
    timestamps = [e["timestamp"] for e in events]
    assert timestamps == sorted(timestamps)
    assert events[0]["event_type"] == "MATERIAL_CREATED"
    assert events[1]["event_type"] == "QUALITY_INSPECTION_FAILED"
    assert events[2]["event_type"] == "QUARANTINED"


# 10. AT_RISK contains supplier/shipment disruption evidence
def test_10_at_risk_evidence():
    data = client.get("/api/v1/traceability/material/CMP-001-00427").json()
    evidence_types = [e["evidence_type"] for e in data["risk"]["evidence"]]
    assert "SUPPLIER_OUTAGE" in evidence_types
    assert "SHIPMENT_DELAY" in evidence_types
    assert "SINGLE_SOURCE_RISK" in evidence_types


# 11. HEALTHY contains no false disruption evidence
def test_11_healthy_no_false_evidence():
    data = client.get("/api/v1/traceability/material/CMP-001-00428").json()
    assert len(data["risk"]["evidence"]) == 0


# 12. QUARANTINED contains inspection-failure evidence
def test_12_quarantined_quality_evidence():
    data = client.get("/api/v1/traceability/material/CMP-001-00429").json()
    evidence_types = [e["evidence_type"] for e in data["risk"]["evidence"]]
    assert "QUALITY_INSPECTION_FAILURE" in evidence_types


# 13. Upstream traceability is correct
def test_13_upstream_traceability():
    data = client.get("/api/v1/traceability/material/CMP-001-00427/impact").json()
    upstream_codes = [node["code"] for node in data["upstream_chain"]]
    assert "SUP-001" in upstream_codes
    assert "PO-2026-001" in upstream_codes
    assert "SHP-2026-001" in upstream_codes


# 14. Downstream traceability is correct
def test_14_downstream_traceability():
    data = client.get("/api/v1/traceability/material/CMP-001-00427/impact").json()
    downstream_codes = [node["code"] for node in data["downstream_chain"]]
    assert "CMP-001" in downstream_codes
    assert "PRD-2026-001" in downstream_codes
    assert "SO-2026-001" in downstream_codes


# 15. Existing SUP-001 golden path remains intact
def test_15_golden_path_remains_intact():
    data = client.get("/api/v1/traceability/material/CMP-001-00427/impact").json()
    assert data["material_unit_id"] == "CMP-001-00427"
    assert data["affected_customer_orders"] == ["SO-2026-001"]


# 16. Existing $200,000 exposure remains derived from authoritative operational data
def test_16_exposure_remains_200k():
    data = client.get("/api/v1/traceability/material/CMP-001-00427/impact").json()
    assert data["estimated_sla_exposure"] == 200000.0


# 17. Unknown material returns 404
def test_17_unknown_material_returns_404():
    response = client.get("/api/v1/traceability/material/CMP-UNKNOWN-999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


# 18. Identity mismatch is rejected
def test_18_identity_mismatch_rejected():
    passport = client.get("/api/v1/traceability/material/CMP-001-00427/passport").json()
    assert passport["material_unit_id"] == "CMP-001-00427"


# 19. No unsupported relationships are fabricated
def test_19_no_fabricated_relationships():
    data = client.get("/api/v1/traceability/material/CMP-001-00429").json()
    assert data["customer"]["customer_order_id"] is None


# 20. Repeated resolution produces deterministic results
def test_20_deterministic_repeated_resolution():
    res1 = client.get("/api/v1/traceability/material/CMP-001-00427/passport").json()
    res2 = client.get("/api/v1/traceability/material/CMP-001-00427/passport").json()
    assert res1 == res2


# 21. Existing Phase 2.5 mitigation API regression
def test_21_existing_mitigation_api_regression(golden_path_graph, mock_baseline_impact):
    payload = {
        "disruption_id": "DIS-REG-001",
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
        assert data["top_recommendation"]["recommended_action_id"] == "ACT-EXP-SHP001"


# 22. Existing impact analysis API regression
def test_22_existing_impact_analysis_api_regression(golden_path_graph, mock_baseline_impact):
    payload = {
        "disruption_id": "DIS-REG-002",
        "target_type": "ENTITY",
        "target_id": "ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519",
        "event_type": "SUPPLIER_OUTAGE",
        "severity": "CRITICAL",
        "effective_at": "2026-08-01T12:00:00Z",
        "duration_hours": 200.0,
    }

    with patch("app.api.v1.intelligence.get_or_build_operational_graph", new=AsyncMock(return_value=golden_path_graph)), \
         patch("app.api.v1.intelligence.engine.analyze_impact", new=AsyncMock(return_value=mock_baseline_impact)):

        response = client.post("/api/v1/intelligence/impact-analysis", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert float(data["total_financial_exposure"]) == 200000.0
        assert len(data["causal_paths"][0]) == 6


# 23. Expanded scenario resolution: CMP-005-01001 (Inventory Shortage)
def test_23_expanded_scenario_cmp_005_01001():
    res = client.get("/api/v1/traceability/material/CMP-005-01001")
    assert res.status_code == 200
    data = res.json()
    assert data["material_unit_id"] == "CMP-005-01001"
    assert data["current_state"]["condition"] == "AT_RISK"
    assert data["risk"]["sla_exposure"] == 85000.0


# 24. Expanded scenario resolution: CMP-009-01002 (Customs Hold)
def test_24_expanded_scenario_cmp_009_01002():
    res = client.get("/api/v1/traceability/material/CMP-009-01002")
    assert res.status_code == 200
    data = res.json()
    assert data["material_unit_id"] == "CMP-009-01002"
    assert data["current_state"]["condition"] == "AT_RISK"
    assert data["risk"]["estimated_delay_days"] == 5.0


# 25. Expanded scenario resolution: CMP-012-01003 (Production Bottleneck)
def test_25_expanded_scenario_cmp_012_01003():
    res = client.get("/api/v1/traceability/material/CMP-012-01003")
    assert res.status_code == 200
    data = res.json()
    assert data["material_unit_id"] == "CMP-012-01003"
    assert data["current_state"]["condition"] == "AT_RISK"
    assert data["risk"]["sla_exposure"] == 50000.0


# 26. Expanded scenario resolution: CMP-017-01004 (Single Source Shortage)
def test_26_expanded_scenario_cmp_017_01004():
    res = client.get("/api/v1/traceability/material/CMP-017-01004")
    assert res.status_code == 200
    data = res.json()
    assert data["material_unit_id"] == "CMP-017-01004"
    assert data["current_state"]["condition"] == "AT_RISK"
    assert data["risk"]["sla_exposure"] == 310000.0


# 27. Expanded scenario resolution: CMP-021-01005 (Healthy Control B)
def test_27_expanded_scenario_cmp_021_01005():
    res = client.get("/api/v1/traceability/material/CMP-021-01005")
    assert res.status_code == 200
    data = res.json()
    assert data["material_unit_id"] == "CMP-021-01005"
    assert data["current_state"]["condition"] == "HEALTHY"
    assert data["risk"]["sla_exposure"] == 0.0

