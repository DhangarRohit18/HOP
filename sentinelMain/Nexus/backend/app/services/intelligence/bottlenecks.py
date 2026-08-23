from decimal import Decimal
from typing import List, Dict, Any
from app.services.intelligence.graph import OperationalGraph
from app.services.intelligence.formulas import calculate_usable_inventory, calculate_coverage_days


def detect_bottlenecks(graph: OperationalGraph) -> List[Dict[str, Any]]:
    """
    Evaluates deterministic bottleneck threshold rules across the OperationalGraph.
    No ML or heuristic guessing.
    """
    bottlenecks: List[Dict[str, Any]] = []

    # Sort nodes alphabetically for deterministic result order
    sorted_nodes = sorted(graph.nodes.values(), key=lambda n: n.node_id)

    for node in sorted_nodes:
        # Rule 1: Single-Source Components
        if node.primitive_type == "RESOURCE" and node.attributes.get("is_single_sourced"):
            bottlenecks.append({
                "bottleneck_id": f"BOT-SINGLE-{node.business_code}",
                "node_id": node.node_id,
                "business_code": node.business_code,
                "bottleneck_type": "SINGLE_SOURCE_COMPONENT",
                "severity": "HIGH",
                "description": f"Component {node.business_code} is single-sourced with no catalog substitute.",
            })

        # Rule 2: Near-Capacity Suppliers (>= 90% utilization)
        if node.primitive_type == "ENTITY" and "monthly_capacity_units" in node.attributes:
            monthly = Decimal(node.attributes.get("monthly_capacity_units", "1"))
            allocated = Decimal(node.attributes.get("allocated_capacity_units", "0"))
            if monthly > 0:
                utilization = allocated / monthly
                if utilization >= Decimal("0.90"):
                    bottlenecks.append({
                        "bottleneck_id": f"BOT-CAP-{node.business_code}",
                        "node_id": node.node_id,
                        "business_code": node.business_code,
                        "bottleneck_type": "NEAR_CAPACITY_SUPPLIER",
                        "severity": "HIGH",
                        "description": f"Supplier {node.business_code} operating at {float(utilization*100):.1f}% capacity utilization.",
                    })

        # Rule 3: High Degree Centrality (Out-degree >= 5)
        out_deg = len(graph.get_outgoing_neighbors(node.node_id))
        if out_deg >= 5:
            bottlenecks.append({
                "bottleneck_id": f"BOT-CENTRALITY-{node.business_code}",
                "node_id": node.node_id,
                "business_code": node.business_code,
                "bottleneck_type": "HIGH_GRAPH_CENTRALITY",
                "severity": "MEDIUM",
                "description": f"Primitive {node.business_code} has {out_deg} outgoing operational dependency edges.",
            })

    return bottlenecks
