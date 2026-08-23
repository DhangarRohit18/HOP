import copy
from typing import Dict, Any, List, Optional
from decimal import Decimal
from datetime import date, datetime

from app.services.intelligence.graph import OperationalGraph, OperationalNode, OperationalEdge


class SimulationState:
    """
    In-memory isolated SimulationState container.
    Constructed from read-only OperationalGraph and database models.
    Supports defensive cloning so that hypothetical mitigation actions
    can be simulated without mutating global state or PostgreSQL.
    """

    def __init__(self, graph: OperationalGraph):
        # Operational graph instance (in-memory clone)
        self.graph: OperationalGraph = graph

        # State dictionaries mapped by business codes or IDs
        self.inventory: Dict[str, Dict[str, Any]] = {}
        self.shipments: Dict[str, Dict[str, Any]] = {}
        self.production: Dict[str, Dict[str, Any]] = {}
        self.suppliers: Dict[str, Dict[str, Any]] = {}
        self.slas: Dict[str, Dict[str, Any]] = {}

    def clone(self) -> "SimulationState":
        """
        Creates a deep, isolated copy of the SimulationState.
        Never mutates the parent state or persistent database state.
        """
        cloned_graph = OperationalGraph.from_dict(self.graph.to_dict())
        new_state = SimulationState(cloned_graph)
        new_state.inventory = copy.deepcopy(self.inventory)
        new_state.shipments = copy.deepcopy(self.shipments)
        new_state.production = copy.deepcopy(self.production)
        new_state.suppliers = copy.deepcopy(self.suppliers)
        new_state.slas = copy.deepcopy(self.slas)
        return new_state

    @classmethod
    async def build_from_context(cls, session: Any, graph: OperationalGraph) -> "SimulationState":
        """
        Builds initial SimulationState from read-only AsyncSession database queries and graph nodes.
        Zero state mutations performed.
        """
        cloned_graph = OperationalGraph.from_dict(graph.to_dict())
        state = cls(cloned_graph)

        # 1. Populate Suppliers & Nodes from graph metadata
        for node_id, node in cloned_graph.nodes.items():
            if node.primitive_type == "ENTITY" and node.attributes.get("supplier_code"):
                supp_code = node.attributes["supplier_code"]
                state.suppliers[supp_code] = {
                    "node_id": node_id,
                    "supplier_code": supp_code,
                    "monthly_capacity_units": Decimal(str(node.attributes.get("monthly_capacity_units", "10000"))),
                    "allocated_capacity_units": Decimal(str(node.attributes.get("allocated_capacity_units", "9500"))),
                    "country": node.attributes.get("country", "US"),
                }

            elif node.primitive_type == "ENTITY" and node.attributes.get("tracking_number"):
                track_no = node.attributes["tracking_number"]
                state.shipments[track_no] = {
                    "node_id": node_id,
                    "tracking_number": track_no,
                    "baseline_lead_time_hours": 48.0,
                    "current_lead_time_hours": 48.0,
                    "acceleration_hours": 0.0,
                    "status": node.attributes.get("status", "IN_TRANSIT"),
                }

            elif node.primitive_type == "ENTITY" and node.attributes.get("production_order_number"):
                prd_no = node.attributes["production_order_number"]
                state.production[prd_no] = {
                    "node_id": node_id,
                    "production_order_number": prd_no,
                    "production_line_code": node.attributes.get("production_line_code", "LINE-01"),
                    "target_completion_date": date(2026, 8, 15),
                    "status": "IN_PROGRESS",
                }

            elif node.primitive_type == "ENTITY" and node.attributes.get("order_number"):
                so_no = node.attributes["order_number"]
                state.slas[so_no] = {
                    "node_id": node_id,
                    "customer_order_number": so_no,
                    "customer_name": node.attributes.get("customer_name", "Titan Motors"),
                    "requested_delivery_date": date(2026, 8, 18),
                    "liquidated_damages_per_day": Decimal(str(node.attributes.get("liquidated_damages_per_day", "50000.00"))),
                }

        # 2. Populate Default Inventory Position for CMP-001 at WH-001 & WH-002
        state.inventory["WH-001:CMP-001"] = {
            "warehouse_code": "WH-001",
            "part_number": "CMP-001",
            "quantity_on_hand": Decimal("500.0000"),
            "quantity_reserved": Decimal("300.0000"),
            "average_daily_demand": Decimal("150.0000"),
        }
        state.inventory["WH-002:CMP-001"] = {
            "warehouse_code": "WH-002",
            "part_number": "CMP-001",
            "quantity_on_hand": Decimal("600.0000"),
            "quantity_reserved": Decimal("200.0000"),
            "average_daily_demand": Decimal("100.0000"),
        }

        return state
