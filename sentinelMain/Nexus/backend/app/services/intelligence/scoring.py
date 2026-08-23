from decimal import Decimal
from typing import Tuple, Dict
from app.services.intelligence.graph import OperationalNode, OperationalGraph


def calculate_composite_risk_score(
    node: OperationalNode,
    graph: OperationalGraph,
    coverage_days: float = float("inf"),
    financial_exposure: Decimal = Decimal("0.00"),
) -> Tuple[float, Dict[str, float]]:
    """
    Computes an explainable composite risk score S(v) in [0, 100] using weighted
    ground-truth parameters and derived operational metrics. Zero black-box ML.
    """
    # 1. Single-source status (weight = 0.25)
    c_single = 100.0 if node.attributes.get("is_single_sourced") else 0.0

    # 2. Supplier utilization (weight = 0.20)
    c_util = 0.0
    if "monthly_capacity_units" in node.attributes:
        monthly = Decimal(node.attributes.get("monthly_capacity_units", "1"))
        allocated = Decimal(node.attributes.get("allocated_capacity_units", "0"))
        if monthly > 0:
            c_util = min(100.0, float((allocated / monthly) * 100))

    # 3. Stock coverage risk (weight = 0.25)
    c_cov = 0.0
    if coverage_days != float("inf"):
        c_cov = max(0.0, 100.0 - (coverage_days * 10.0))

    # 4. SLA financial rate (weight = 0.15)
    c_sla = 0.0
    ld_rate = Decimal(str(node.attributes.get("liquidated_damages_per_day", "0")))
    if ld_rate > 0:
        c_sla = min(100.0, float(ld_rate / Decimal("1000.0")))

    # 5. Graph centrality (weight = 0.15)
    out_deg = len(graph.get_outgoing_neighbors(node.node_id))
    c_centrality = min(100.0, float(out_deg * 15.0))

    score_breakdown = {
        "single_source_factor": round(c_single * 0.25, 2),
        "supplier_utilization_factor": round(c_util * 0.20, 2),
        "stock_coverage_factor": round(c_cov * 0.25, 2),
        "sla_rate_factor": round(c_sla * 0.15, 2),
        "graph_centrality_factor": round(c_centrality * 0.15, 2),
    }

    composite_score = sum(score_breakdown.values())
    return round(composite_score, 2), score_breakdown
