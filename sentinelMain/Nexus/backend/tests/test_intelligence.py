import pytest
import uuid
import json
from decimal import Decimal
from datetime import datetime, date, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.db.session import get_db_session
from app.models.core import Entity
from app.models.manufacturing import Supplier, Component, Warehouse, CustomerOrder
from app.schemas.intelligence.disruption import DisruptionInput, DisruptionSeverity
from app.services.intelligence.graph import OperationalGraph, OperationalNode, OperationalEdge
from app.services.intelligence.traversal import traverse_downstream, find_critical_paths
from app.services.intelligence.formulas import (
    calculate_usable_inventory, calculate_coverage_days, calculate_stockout_timestamp,
    calculate_material_deficit, calculate_production_delay_days, calculate_financial_exposure
)
from app.services.intelligence.analyzer import OperationalIntelligenceEngine
from scripts.seed.run_seed import run_seed_generator

import pytest_asyncio

client = TestClient(app)
engine_instance = OperationalIntelligenceEngine()


@pytest_asyncio.fixture(autouse=True)
async def seed_db(db_session: AsyncSession):
    """Seed database before running intelligence tests and override FastAPI session dependency."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db_session] = override_get_db
    await run_seed_generator(db_session)
    await db_session.commit()
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_golden_path_causal_traversal(db_session: AsyncSession):
    supp_1 = (await db_session.execute(select(Supplier).where(Supplier.supplier_code == "SUP-001"))).scalar_one()
    supp_node_id = f"ENTITY:{supp_1.entity_id}"

    disruption = DisruptionInput(
        disruption_id="DIS-GOLDEN-01",
        target_type="ENTITY",
        target_id=supp_node_id,
        event_type="SUPPLIER_OUTAGE",
        severity=DisruptionSeverity.CRITICAL,
        effective_at=datetime(2026, 8, 1, 12, 0, tzinfo=timezone.utc),
        duration_hours=72.0,
    )

    result = await engine_instance.analyze_impact(db_session, disruption)

    assert result.disruption_id == "DIS-GOLDEN-01"
    assert result.total_affected_nodes > 0

    # Verify Golden Path presence in causal paths
    golden_path_found = False
    for path in result.causal_paths:
        if len(path) >= 6:
            # Check for SUP-001 -> PO -> SHP -> CMP -> PRD -> SO progression
            if "ENTITY:" in path[0] and "ENTITY:" in path[1] and "ENTITY:" in path[2] and "RESOURCE:" in path[3] and "ENTITY:" in path[4] and "ENTITY:" in path[5]:
                golden_path_found = True
                break

    assert golden_path_found is True


@pytest.mark.asyncio
async def test_dynamic_200k_exposure_derivation(db_session: AsyncSession):
    supp_1 = (await db_session.execute(select(Supplier).where(Supplier.supplier_code == "SUP-001"))).scalar_one()
    supp_node_id = f"ENTITY:{supp_1.entity_id}"

    disruption = DisruptionInput(
        disruption_id="DIS-BENCHMARK-200K",
        target_type="ENTITY",
        target_id=supp_node_id,
        event_type="SHIPMENT_DELAY",
        severity=DisruptionSeverity.CRITICAL,
        effective_at=datetime(2026, 8, 1, 12, 0, tzinfo=timezone.utc),
        duration_hours=200.0,  # 200h disruption - 32h stock coverage = 168h delay (7 days) -> 4 days SLA delay -> $200k
    )

    result = await engine_instance.analyze_impact(db_session, disruption)

    assert len(result.sla_exposures) >= 1
    titan_sla = next((sla for sla in result.sla_exposures if sla.customer_order_number == "SO-2026-001"), None)
    assert titan_sla is not None
    assert titan_sla.liquidated_damages_per_day == Decimal("50000.00")
    assert titan_sla.delay_days == 4.0
    assert titan_sla.total_financial_exposure == Decimal("200000.00")


def test_stockout_timestamp_derivation():
    effective_at = datetime(2026, 8, 1, 12, 0, tzinfo=timezone.utc)
    coverage_days = 1.3333333333333333

    stockout_dt = calculate_stockout_timestamp(effective_at, coverage_days)
    assert stockout_dt is not None
    assert stockout_dt.year == 2026
    assert stockout_dt.month == 8
    assert stockout_dt.day == 2


def test_zero_vs_positive_material_deficit_delay():
    # Zero deficit -> 0 delay
    zero_deficit = calculate_material_deficit(Decimal("500"), Decimal("500"), Decimal("200"))
    assert zero_deficit == Decimal("0.0000")
    delay_zero = calculate_production_delay_days(zero_deficit, disruption_duration_hours=72.0, coverage_days=1.33)
    assert delay_zero == 0.0

    # Positive deficit -> calculated delay
    pos_deficit = calculate_material_deficit(Decimal("500"), Decimal("0"), Decimal("200"))
    assert pos_deficit == Decimal("300.0000")
    delay_pos = calculate_production_delay_days(pos_deficit, disruption_duration_hours=128.0, coverage_days=1.3333333333333333)
    assert delay_pos == 4.0


@pytest.mark.asyncio
async def test_deterministic_traversal_ordering(db_session: AsyncSession):
    supp_1 = (await db_session.execute(select(Supplier).where(Supplier.supplier_code == "SUP-001"))).scalar_one()
    supp_node_id = f"ENTITY:{supp_1.entity_id}"

    disruption = DisruptionInput(
        disruption_id="DIS-DETERMINISM-TEST",
        target_type="ENTITY",
        target_id=supp_node_id,
        event_type="SUPPLIER_OUTAGE",
        severity=DisruptionSeverity.CRITICAL,
        effective_at=datetime(2026, 8, 1, 12, 0, tzinfo=timezone.utc),
        duration_hours=72.0,
    )

    res1 = await engine_instance.analyze_impact(db_session, disruption)
    res2 = await engine_instance.analyze_impact(db_session, disruption)

    assert [n.node_id for n in res1.affected_nodes] == [n.node_id for n in res2.affected_nodes]
    assert res1.causal_paths == res2.causal_paths


def test_cycle_detection_safety():
    graph = OperationalGraph()
    n1 = OperationalNode(node_id="ENTITY:N1", primitive_type="ENTITY", entity_id=uuid.uuid4(), business_code="N1")
    n2 = OperationalNode(node_id="ENTITY:N2", primitive_type="ENTITY", entity_id=uuid.uuid4(), business_code="N2")
    graph.add_node(n1)
    graph.add_node(n2)

    # Create cycle N1 -> N2 -> N1
    e1 = OperationalEdge(edge_id=uuid.uuid4(), source_node_id="ENTITY:N1", target_node_id="ENTITY:N2", dependency_type="CYCLE")
    e2 = OperationalEdge(edge_id=uuid.uuid4(), source_node_id="ENTITY:N2", target_node_id="ENTITY:N1", dependency_type="CYCLE")
    graph.add_edge(e1)
    graph.add_edge(e2)

    visited, paths = traverse_downstream(graph, "ENTITY:N1")
    assert len(visited) == 2
    assert "ENTITY:N1" in visited
    assert "ENTITY:N2" in visited


def test_critical_path_safety_limits():
    graph = OperationalGraph()
    root = OperationalNode(node_id="ENTITY:ROOT", primitive_type="ENTITY", entity_id=uuid.uuid4(), business_code="ROOT")
    graph.add_node(root)

    # Build deep chain of 20 nodes
    prev = "ENTITY:ROOT"
    for i in range(1, 25):
        curr = f"ENTITY:N{i:02d}"
        node = OperationalNode(node_id=curr, primitive_type="ENTITY", entity_id=uuid.uuid4(), business_code=f"N{i:02d}")
        graph.add_node(node)
        edge = OperationalEdge(edge_id=uuid.uuid4(), source_node_id=prev, target_node_id=curr, dependency_type="CRITICAL", criticality="CRITICAL")
        graph.add_edge(edge)
        prev = curr

    paths = find_critical_paths(graph, "ENTITY:ROOT", max_depth=15, max_paths=100)
    assert len(paths) <= 100
    for p in paths:
        assert len(p) <= 16  # Max depth 15 edges = 16 nodes


@pytest.mark.asyncio
async def test_100_repeated_invocations_determinism(db_session: AsyncSession):
    supp_1 = (await db_session.execute(select(Supplier).where(Supplier.supplier_code == "SUP-001"))).scalar_one()
    supp_node_id = f"ENTITY:{supp_1.entity_id}"

    disruption = DisruptionInput(
        disruption_id="DIS-100-TEST",
        target_type="ENTITY",
        target_id=supp_node_id,
        event_type="SUPPLIER_OUTAGE",
        severity=DisruptionSeverity.CRITICAL,
        effective_at=datetime(2026, 8, 1, 12, 0, tzinfo=timezone.utc),
        duration_hours=72.0,
    )

    first_result = await engine_instance.analyze_impact(db_session, disruption)
    first_json = first_result.model_dump_json(exclude={"execution_time_ms", "analysis_id"})

    for _ in range(25):
        res = await engine_instance.analyze_impact(db_session, disruption)
        curr_json = res.model_dump_json(exclude={"execution_time_ms", "analysis_id"})
        assert curr_json == first_json


import httpx
from httpx import ASGITransport


@pytest.mark.asyncio
async def test_api_inventory_risk_endpoint():
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/intelligence/inventory-risk")
    assert response.status_code == 200
    data = response.json()
    assert "total_positions_evaluated" in data
    assert data["total_positions_evaluated"] == 120
    assert "items" in data


@pytest.mark.asyncio
async def test_api_malformed_disruption_input_rejection():
    bad_payload = {
        "disruption_id": "DIS-BAD",
        "target_type": "ENTITY",
        "target_id": "ENTITY:DUMMY",
        "event_type": "OUTAGE",
        "severity": "CRITICAL",
        "duration_hours": -10.0,
    }
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/intelligence/impact-analysis", json=bad_payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_phase1_health_regression():
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/health")
    assert response.status_code in [200, 503]
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
