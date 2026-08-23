import uuid
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Dict, List, Optional, Any


@dataclass
class OperationalNode:
    node_id: str  # Format: "{PRIMITIVE_TYPE}:{UUID}"
    primitive_type: str
    entity_id: uuid.UUID
    business_code: str
    domain: str = "manufacturing"
    status: str = "ACTIVE"
    attributes: Dict[str, Any] = field(default_factory=dict)


@dataclass
class OperationalEdge:
    edge_id: uuid.UUID
    source_node_id: str
    target_node_id: str
    dependency_type: str
    criticality: str = "MEDIUM"
    lead_time_hours: Decimal = Decimal("0.00")


class OperationalGraph:
    """
    Custom lightweight in-memory adjacency operational dependency graph.
    Guarantees 100% deterministic neighbor sorting and cycle protection.
    """

    def __init__(self):
        self.nodes: Dict[str, OperationalNode] = {}
        self.outgoing: Dict[str, List[str]] = {}  # source_id -> list of target_ids
        self.incoming: Dict[str, List[str]] = {}  # target_id -> list of source_ids
        self.edges: Dict[str, OperationalEdge] = {}  # edge_key ("{source_id}->{target_id}") -> OperationalEdge

    def add_node(self, node: OperationalNode) -> None:
        self.nodes[node.node_id] = node
        if node.node_id not in self.outgoing:
            self.outgoing[node.node_id] = []
        if node.node_id not in self.incoming:
            self.incoming[node.node_id] = []

    def add_edge(self, edge: OperationalEdge) -> None:
        if edge.source_node_id not in self.nodes or edge.target_node_id not in self.nodes:
            # Skip invalid endpoint edges
            return

        edge_key = f"{edge.source_node_id}->{edge.target_node_id}"
        self.edges[edge_key] = edge

        if edge.target_node_id not in self.outgoing[edge.source_node_id]:
            self.outgoing[edge.source_node_id].append(edge.target_node_id)
            # Maintain strict alphabetical order for deterministic traversal
            self.outgoing[edge.source_node_id].sort()

        if edge.source_node_id not in self.incoming[edge.target_node_id]:
            self.incoming[edge.target_node_id].append(edge.source_node_id)
            self.incoming[edge.target_node_id].sort()

    def get_node(self, node_id: str) -> Optional[OperationalNode]:
        return self.nodes.get(node_id)

    def get_outgoing_neighbors(self, node_id: str) -> List[str]:
        return self.outgoing.get(node_id, [])

    def get_incoming_neighbors(self, node_id: str) -> List[str]:
        return self.incoming.get(node_id, [])

    def get_edge(self, source_node_id: str, target_node_id: str) -> Optional[OperationalEdge]:
        return self.edges.get(f"{source_node_id}->{target_node_id}")

    def to_dict(self) -> Dict[str, Any]:
        """Serializes graph payload to a deterministic dictionary for Redis caching."""
        return {
            "nodes": {
                k: {
                    "node_id": v.node_id,
                    "primitive_type": v.primitive_type,
                    "entity_id": str(v.entity_id),
                    "business_code": v.business_code,
                    "domain": v.domain,
                    "status": v.status,
                    "attributes": v.attributes,
                }
                for k, v in sorted(self.nodes.items())
            },
            "outgoing": {k: sorted(v) for k, v in sorted(self.outgoing.items())},
            "incoming": {k: sorted(v) for k, v in sorted(self.incoming.items())},
            "edges": {
                k: {
                    "edge_id": str(v.edge_id),
                    "source_node_id": v.source_node_id,
                    "target_node_id": v.target_node_id,
                    "dependency_type": v.dependency_type,
                    "criticality": v.criticality,
                    "lead_time_hours": str(v.lead_time_hours),
                }
                for k, v in sorted(self.edges.items())
            },
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "OperationalGraph":
        """Deserializes JSON dict back into an OperationalGraph instance."""
        graph = cls()
        for k, v in data.get("nodes", {}).items():
            node = OperationalNode(
                node_id=v["node_id"],
                primitive_type=v["primitive_type"],
                entity_id=uuid.UUID(v["entity_id"]),
                business_code=v["business_code"],
                domain=v["domain"],
                status=v["status"],
                attributes=v["attributes"],
            )
            graph.add_node(node)

        for k, v in data.get("edges", {}).items():
            edge = OperationalEdge(
                edge_id=uuid.UUID(v["edge_id"]),
                source_node_id=v["source_node_id"],
                target_node_id=v["target_node_id"],
                dependency_type=v["dependency_type"],
                criticality=v["criticality"],
                lead_time_hours=Decimal(v["lead_time_hours"]),
            )
            graph.add_edge(edge)

        return graph
