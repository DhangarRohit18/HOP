# Phase 2.3 Specification — Operational Dependency Intelligence Design (Revision 2)

## 1. Executive Summary & Core Architectural Principles

Phase 2.3 defines the architectural blueprint for the **Operational Dependency Intelligence Engine** of the NEXUS Platform. This layer ingests physical ground-truth records from PostgreSQL (Core primitives and Manufacturing Adapter tables) and constructs a high-performance custom in-memory operational dependency graph.

The engine enables deterministic graph traversal, impact propagation analysis, inventory stockout forecasting, production delay evaluation, SLA penalty derivation, and bottleneck detection.

```
┌────────────────────────────────────────────────────────┐
│               PostgreSQL Ground Truth DB               │
│   (Entities, Resources, Events, Constraints, Actions)  │
└───────────────────────────┬────────────────────────────┘
                            │ (Async Query)
                            ▼
┌────────────────────────────────────────────────────────┐
│      Custom In-Memory Adjacency Operational Graph      │
│   (Deterministic Python Dict Nodes, In/Out Edges)      │
└───────────────────────────┬────────────────────────────┘
                            │ (Disruption Vector)
                            ▼
┌────────────────────────────────────────────────────────┐
│            Deterministic Impact Analyzer               │
│  (Upstream/Downstream Traversal, SLA & Cost Exposure)  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             Structured Impact Analysis Report          │
│   (Explainable Causal Paths, Risk Scores, Exposure)   │
└────────────────────────────────────────────────────────┘
```

### Core Architectural Principles
1. **100% Deterministic Reasoning**: Graph construction, path traversal, inventory forecasting, delay calculation, and financial exposure derivations MUST NOT use LLMs, ML models, or stochastic algorithms. Given the same database state and disruption vector, the engine must produce **identical outputs**.
2. **Domain-Agnostic Core Graph**: The engine graph operates strictly on universal NEXUS primitives (`ENTITY`, `RESOURCE`, `EVENT`, `CONSTRAINT`, `ACTION`, `METRIC`). Domain-specific entity structures belong exclusively in the adapter mapping layer. `DEPENDENCY` records serve as graph edges and are **never** valid endpoint nodes.
3. **Strict Ground-Truth vs. Derived Boundary**: Ground-truth inputs (commitments, inventory balances, daily demand rates, PO dates, SLA contract penalty rates) are read from PostgreSQL. Derived operational metrics (available inventory, coverage days, stockout timestamps, SLA financial exposure) are calculated dynamically on-the-fly without mutating persistent database records.
4. **Read-Only Operations**: The intelligence layer is strictly read-only. It performs zero database mutations and triggers no automated recovery actions.

---

## 2. Operational Graph Architecture & Primitive Node Mapping

### 2.1 Graph Node & Edge Data Model
The operational graph is represented as a directed graph $G = (V, E)$, where $V$ represents primitive nodes and $E$ represents directional dependency edges.

#### Graph Node Structure ($v \in V$)
Each node encapsulates identity and universal primitive metadata:
- `node_id`: String (`"{primitive_type}:{uuid}"`) — Unique graph key.
- `primitive_type`: Enum (`ENTITY`, `RESOURCE`, `EVENT`, `CONSTRAINT`, `ACTION`, `METRIC`).
- `entity_id`: UUID — Primary key of the underlying primitive table.
- `business_code`: String — Domain identifier (e.g. `SUP-001`, `CMP-001`, `SO-2026-001`).
- `domain`: String — Domain scope (e.g. `"manufacturing"`).
- `status`: String — Operational state (e.g. `"ACTIVE"`, `"IN_TRANSIT"`, `"PLANNED"`).
- `attributes`: Dict[str, Any] — Domain payload (e.g. `{"liquidated_damages_per_day": 50000.00}`).

#### Graph Edge Structure ($e \in E$)
Each directed edge represents a causal or operational dependency $e = (u, v)$:
- `edge_id`: UUID — Dependency record primary key.
- `source_node_id`: String — Source endpoint node key ($u$).
- `target_node_id`: String — Target endpoint node key ($v$).
- `dependency_type`: String — Specific relationship classification (e.g. `"SUPPLIES_PO"`, `"TRANSPORTS_COMPONENT"`).
- `criticality`: Enum (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- `lead_time_hours`: Decimal — Transport, processing, or buffer lead time in hours.

### 2.2 Manufacturing Adapter $\to$ Core Primitive Mapping Matrix

| Manufacturing Adapter Entity | Core Primitive Node Type | Node Key Format | Ground-Truth Attributes Extracted |
| :--- | :--- | :--- | :--- |
| **Supplier** (`suppliers`) | `ENTITY` | `ENTITY:{entity_id}` | `supplier_code`, `tier`, `country`, `reliability_score`, `monthly_capacity_units`, `allocated_capacity_units` |
| **Component** (`components`) | `RESOURCE` | `RESOURCE:{resource_id}` | `part_number`, `unit_cost`, `lead_time_days`, `is_single_sourced` |
| **Warehouse** (`warehouses`) | `ENTITY` | `ENTITY:{entity_id}` | `warehouse_code`, `location`, `total_capacity_sqm` |
| **Inventory Position** (`inventory_positions`) | Attributed Edge / Metric | N/A (Node Property) | `quantity_on_hand`, `quantity_reserved`, `safety_stock_level`, `reorder_point`, `average_daily_demand` |
| **Purchase Order** (`purchase_orders`) | `ENTITY` | `ENTITY:{entity_id}` | `po_number`, `supplier_id`, `status`, `order_date`, `expected_delivery_date`, `total_amount` |
| **Shipment** (`shipments`) | `ENTITY` | `ENTITY:{entity_id}` | `tracking_number`, `purchase_order_id`, `destination_warehouse_id`, `carrier`, `estimated_arrival` |
| **Production Order** (`production_orders`) | `ENTITY` | `ENTITY:{entity_id}` | `production_order_number`, `warehouse_id`, `line_code`, `product_code`, `start_date`, `target_completion_date` |
| **Customer Order** (`customer_orders`) | `ENTITY` | `ENTITY:{entity_id}` | `order_number`, `customer_name`, `order_date`, `requested_delivery_date`, `liquidated_damages_per_day` |

---

## 3. Graph Construction & Checksum-Based Cache Strategy

### 3.1 Custom Lightweight In-Memory Adjacency Graph Architecture
For Phase 2.3, NEXUS formally implements a **custom lightweight in-memory adjacency graph** structure (`OperationalGraph`):

```python
class OperationalGraph:

    def __init__(self):
        self.nodes: dict[str, OperationalNode] = {}
        self.outgoing: dict[str, list[str]] = {}  # Source node_id -> Target node_ids
        self.incoming: dict[str, list[str]] = {}  # Target node_id -> Source node_ids
        self.edges: dict[str, OperationalEdge] = {}  # edge_id -> OperationalEdge
```

#### Architectural Rationale for Custom Adjacency Structure
1. **Deterministic Traversal Ordering**: Guarantees neighbors are sorted deterministically (e.g. alphabetically by `node_id`) at every level.
2. **Minimal Memory Overhead**: Uses standard Python dictionaries with zero unnecessary third-party package dependencies.
3. **Easy Serialization**: Direct 1-to-1 JSON conversion for Redis caching.
4. **Unbounded Path Protection**: Provides explicit, fine-grained control over recursion depth, path limits, and cycle detection.

### 3.2 Deterministic Checksum-Based Cache Strategy
To avoid implementation assumptions regarding PostgreSQL triggers or pub/sub mechanisms, caching uses a **deterministic checksum-based keying strategy**:

```
Cache Key: graph:v1:manufacturing:{dataset_checksum}
```

1. **Authoritative Source**: PostgreSQL remains the sole authoritative source of truth.
2. **Checksum-Derived Cache Key**: The engine queries the current dataset checksum from PostgreSQL or manifest. If database state updates, `dataset_checksum` changes, automatically producing a new Redis key.
3. **On Cache Miss**:
   - Load Core primitives and Manufacturing Adapter records synchronously from PostgreSQL.
   - Construct the in-memory `OperationalGraph`.
   - Store the serialized JSON graph in Redis under `graph:v1:manufacturing:{dataset_checksum}`.
4. **Zero Infrastructure Overhead**: Requires no PostgreSQL triggers, CDC, or pub/sub daemons.

---

## 4. Dependency Traversal Algorithms & Safety Limits

All traversal algorithms are strictly deterministic. When multiple adjacent nodes are discovered at a breadth level, they are sorted alphabetically by `node_id` before processing.

### 4.1 Traversal Algorithm Specifications & Safety Limits

| Algorithm | Direction | Purpose | Safety Limits & Deterministic Rules |
| :--- | :--- | :--- | :--- |
| **Downstream Impact Search** | Forward ($u \to v$) | Finds all operational entities, production runs, and customer orders affected by a disrupted node. | BFS with visited set `visited: Set[str]`. `MAX_DEPTH = 15`. Neighbors sorted alphabetically. Complexity: $\mathcal{O}(V + E)$. |
| **Upstream Root-Cause Search** | Reverse ($v \to u$) | Traces backwards from a delayed customer order to identify root-cause suppliers or components. | Reverse BFS with visited set. `MAX_DEPTH = 15`. Neighbors sorted alphabetically. Complexity: $\mathcal{O}(V + E)$. |
| **Shortest Causal Path** | Bidirectional | Computes shortest dependency chain linking disruption source to SLA customer order. | Dijkstra's Algorithm weighted by `lead_time_hours`. Deterministic tie-breaking by `node_id`. |
| **All Critical Paths** | Forward | Discovers high-criticality paths connecting disruption to customer delivery points. | DFS with backtracking. **`MAX_CRITICAL_PATH_DEPTH = 15`**, **`MAX_CRITICAL_PATHS = 100`**. Enforces `visited_path` set. |

### 4.2 Critical-Path Safety & Path Explosion Prevention Rules
To prevent unbounded execution or memory exhaustion during path enumeration:
1. **Depth Limit**: DFS recursion immediately halts when path length reaches `MAX_CRITICAL_PATH_DEPTH = 15`.
2. **Path Count Limit**: Path enumeration stops immediately once `MAX_CRITICAL_PATHS = 100` paths are collected.
3. **Cycle Protection**: Nodes in current recursion stack are tracked in `current_path_nodes: Set[str]` to prevent cyclic recursion loops.
4. **Deterministic Path Sorting**: Returned critical paths are sorted deterministically by cumulative lead time (descending), then alphabetically by path node keys.

---

## 5. Structured Disruption Input & Impact Analysis Pipeline

### 5.1 Disruption Input Contract (`DisruptionInput`)
Disruptions are represented as structured Pydantic v2 schemas passed into the intelligence engine:

```python
from enum import Enum
from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class DisruptionSeverity(str, Enum):
    MINOR = "MINOR"
    MODERATE = "MODERATE"
    SEVERE = "SEVERE"
    CRITICAL = "CRITICAL"

class DisruptionInput(BaseModel):
    disruption_id: str = Field(..., json_schema_extra={"example": "DIS-2026-001"})
    target_type: str = Field(..., json_schema_extra={"example": "ENTITY"})
    target_id: str = Field(..., json_schema_extra={"example": "ENTITY:SUP-001-UUID"})
    event_type: str = Field(..., json_schema_extra={"example": "SUPPLIER_OUTAGE"})
    severity: DisruptionSeverity
    effective_at: datetime = Field(..., description="Reference timestamp from which inventory consumption is evaluated")
    duration_hours: float = Field(..., ge=0, json_schema_extra={"example": 72.0})
    metadata: Dict[str, Any] = Field(default_factory=dict)
```

> [!IMPORTANT]
> `DisruptionInput.effective_at` serves as the authoritative reference timestamp from which future inventory depletion and stockout timestamps are evaluated. The input vector **does not mutate** database records or alter physical inventory balances in PostgreSQL.

---

## 6. Deterministic Intelligence Formulas

### 6.1 Inventory Intelligence Formulas
For any component $c$ at warehouse $w$, evaluated relative to `DisruptionInput.effective_at`:

1. **Usable Inventory**:
   $$\text{usable\_inventory} = \max(0, \text{quantity\_on\_hand} - \text{quantity\_reserved})$$
2. **Inventory Coverage Days**:
   $$\text{coverage\_days} = \begin{cases} \frac{\text{usable\_inventory}}{\text{average\_daily\_demand}}, & \text{if } \text{average\_daily\_demand} > 0 \\ \infty, & \text{if } \text{average\_daily\_demand} \le 0 \end{cases}$$
3. **Derived Stockout Timestamp**:
   $$\text{stockout\_timestamp} = \text{effective\_at} + \text{timedelta}(\text{days}=\text{coverage\_days})$$

*Clarification*: `stockout_timestamp` is a **derived analysis metric** and is **never** persisted into PostgreSQL.

### 6.2 Correct Production Material Shortage & Delay Model
For an affected production order $p$ requiring component $c$:

1. **Remaining Requirement**:
   $$\text{remaining\_requirement} = \max(0, \text{quantity\_required} - \text{quantity\_issued})$$
2. **Usable Inventory**:
   $$\text{usable\_inventory} = \max(0, \text{available\_inventory})$$
3. **Material Deficit**:
   $$\text{material\_deficit} = \max(0, \text{remaining\_requirement} - \text{usable\_inventory})$$

#### Production Interruption Semantics
- **Zero Material Deficit ($\text{material\_deficit} == 0$)**: The usable inventory is sufficient to fulfill the remaining production requirement. The disruption creates **zero** material-driven production stoppage.
- **Positive Material Deficit ($\text{material\_deficit} > 0$)**: Usable inventory is exhausted before production completes. Production becomes constrained once usable inventory is depleted (after $\text{coverage\_days}$).
- **Material-Driven Production Delay**:
  $$\text{production\_delay\_days} = \begin{cases} 0.0, & \text{if } \text{material\_deficit} == 0 \\ \max\left(0.0, \frac{\text{duration\_hours} - (\text{coverage\_days} \times 24.0)}{24.0}\right), & \text{if } \text{material\_deficit} > 0 \end{cases}$$
- **Revised Estimated Completion Date**:
  $$\text{estimated\_completion\_date} = \text{target\_completion\_date} + \text{timedelta}(\text{days}=\text{production\_delay\_days})$$

*Rule*: Production delay must never become negative. The engine cleanly distinguishes **inventory stockout time** ($\text{effective\_at} + \text{coverage\_days}$) from **production completion delay** ($\text{target\_completion\_date} + \text{production\_delay\_days}$).

### 6.3 Customer Order & SLA Financial Exposure Mechanics
For an affected customer order item allocated to production order $p$:
1. **Delivery Delay Days**:
   $$\text{sla\_delay\_days} = \max(0, \text{estimated\_completion\_date} - \text{requested\_delivery\_date})$$
2. **Derived SLA Financial Exposure**:
   $$\text{financial\_exposure} = \text{sla\_delay\_days} \times \text{liquidated\_damages\_per\_day}$$

*Note*: `liquidated_damages_per_day` (e.g. $50,000/day) is a seeded ground-truth contract term. `financial_exposure` is dynamically derived.

---

## 7. Bottleneck Detection Engine & Threshold Rules

The engine applies deterministic rule evaluation across the operational graph to identify vulnerabilities:

| Bottleneck Type | Trigger Condition / Formula | Configurable Threshold | Identified Vulnerability |
| :--- | :--- | :---: | :---: |
| **Single-Source Component** | `component.is_single_sourced == True` | Boolean True | V1, V7 |
| **Near-Capacity Supplier** | `(allocated_capacity_units / monthly_capacity_units) >= THRESHOLD` | `0.90` (90%) | V6 (`SUP-001`, `SUP-004`) |
| **Critical Stock Coverage** | `coverage_days <= THRESHOLD` | `3.0` Days | V3 (`WH-001` MCU stock) |
| **Deadline Shipment Pressure**| `status == 'IN_TRANSIT' AND (ETA - effective_at) <= Lead_Time` | `48.0` Hours | V4 (`SHP-2026-001`) |
| **High SLA Risk Order** | `liquidated_damages_per_day >= THRESHOLD` | `$10,000.00`/Day | V5 (`SO-2026-001`) |
| **High Graph Centrality** | `out_degree(node) >= THRESHOLD` | `5` Edges | Core Critical Primitive |

---

## 8. Explainable Composite Criticality Scoring

To eliminate opaque black-box AI scoring, the intelligence engine computes an explainable composite risk score $S(v) \in [0, 100]$ using weighted ground-truth parameters and derived operational metrics:

$$S(v) = w_1 \cdot C_{\text{single}} + w_2 \cdot C_{\text{supp\_util}} + w_3 \cdot C_{\text{cov}} + w_4 \cdot C_{\text{sla}} + w_5 \cdot C_{\text{centrality}}$$

### Weight Configuration & Value Scalers

| Factor | Parameter Symbol | Weight ($w_i$) | Value Scaling Function |
| :--- | :---: | :---: | :--- |
| **Single-Source Status** | $C_{\text{single}}$ | `0.25` | `100.0` if `is_single_sourced` else `0.0` |
| **Supplier Utilization** | $C_{\text{supp\_util}}$ | `0.20` | $\min\left(100.0, \frac{\text{allocated}}{\text{monthly}} \times 100\right)$ |
| **Stock Coverage Risk** | $C_{\text{cov}}$ | `0.25` | $\max\left(0.0, 100.0 - (\text{coverage\_days} \times 10.0)\right)$ |
| **SLA Financial Rate** | $C_{\text{sla}}$ | `0.15` | $\min\left(100.0, \frac{\text{liquidated\_damages\_per\_day}}{1000.0}\right)$ |
| **Graph Centrality** | $C_{\text{centrality}}$ | `0.15` | $\min\left(100.0, \text{out\_degree}(v) \times 15.0\right)$ |

---

## 9. Structured Impact Report Output Schema (`ImpactAnalysisResult`)

The engine produces a structured, strongly-typed Pydantic v2 result payload:

```python
from typing import List, Dict, Any
from decimal import Decimal
from pydantic import BaseModel, Field

class NodeImpactDetail(BaseModel):
    node_id: str
    business_code: str
    primitive_type: str
    impact_type: str  # e.g., "LINE_STOPPAGE", "SHIPMENT_DELAY", "SLA_BREACH"
    description: str

class SLAExposureDetail(BaseModel):
    customer_order_number: str
    customer_name: str
    requested_delivery_date: str
    estimated_delivery_date: str
    delay_days: float
    liquidated_damages_per_day: Decimal  # Ground Truth Rate
    total_financial_exposure: Decimal     # Derived Exposure

class ImpactAnalysisResult(BaseModel):
    analysis_id: str
    disruption_id: str
    target_node_id: str
    propagation_depth: int
    total_affected_nodes: int
    affected_nodes: List[NodeImpactDetail]
    causal_paths: List[List[str]]        # Explainable node path arrays
    inventory_stockout_nodes: List[str]
    delayed_production_orders: List[str]
    sla_exposures: List[SLAExposureDetail]
    total_financial_exposure: Decimal    # Total derived penalty across all orders
    bottlenecks_detected: List[Dict[str, Any]]
    composite_risk_score: float
    score_breakdown: Dict[str, float]
    execution_time_ms: float
```

---

## 10. Golden-Path Explainability & $200,000 Benchmark Test

### 10.1 Structural Causal Path
The engine explicitly records structural causal paths from disruption source to customer SLA exposure:

```
SUP-001 -> PO-2026-001 -> SHP-2026-001 -> CMP-001 -> PRD-2026-001 -> SO-2026-001
```

### 10.2 Golden-Path $200,000 Benchmark Test Contract
The expected exposure of **$200,000** ($50,000/day $\times$ 4 days delay) is a **deterministic validation target benchmark**, NOT a hardcoded value inside the intelligence engine.

> [!IMPORTANT]
> The intelligence engine MUST NOT contain special-case logic such as:
> `if disruption_id == "DIS-2026-001": return Decimal("200000.00")`

#### Test Execution Protocol
1. Test suite loads seeded ground-truth SLA rate ($50,000/day) from `SO-2026-001` entity attributes.
2. Test suite passes disruption vector (`SHP-2026-001` transit delay = 72 hours) to the engine.
3. Engine dynamically computes production delay (4 days) and derives total exposure ($50,000 $\times$ 4 = $200,000).
4. Test suite asserts that `result.total_financial_exposure == Decimal("200000.00")`.

---

## 11. Performance, Failure & Degraded Modes

### 11.1 Performance Targets & Memory Footprint
- **Graph Construction Time**: $< 100$ ms for 1,000 nodes / 3,000 edges.
- **Impact Traversal & Analysis**: $< 20$ ms per disruption vector.
- **In-Memory Footprint**: $< 20$ MB RAM using custom `OperationalGraph` adjacency dictionaries. No external graph databases are required.

### 11.2 Graceful Degradation Handling

| Failure Scenario | Mitigation Strategy | Degraded Mode Output |
| :--- | :--- | :--- |
| **Redis Cache Unavailable** | Fallback to direct synchronous graph construction from PostgreSQL. | Log warning `REDIS_OFFLINE`; return accurate analysis with `cache_used: false`. |
| **PostgreSQL Unreachable** | Fail safely; return HTTP 503 Service Unavailable with diagnostic payload. | Return error `DATABASE_UNAVAILABLE`; execute zero state changes. |
| **Invalid Primitive Endpoint** | Reject graph edge during construction; emit validation warning. | Skip invalid edge; log `INVALID_ENDPOINT_TYPE`. |
| **Circular Dependency in Graph** | Visited set `visited: Set[str]` halts loop traversal instantly. | Process node once; flag `CYCLE_DETECTED` in path metadata. |
| **Malformed Disruption Input** | Pydantic validation error rejects request at API boundary. | Return HTTP 422 Unprocessable Entity with exact field diagnostic. |

---

## 12. Security, Governance & Read-Only Boundaries

- **State Mutation Lock**: The intelligence engine contains **zero `INSERT` or `UPDATE` statements** targeting operational tables (`suppliers`, `inventory_positions`, `customer_orders`, etc.).
- **Action Execution Boundary**: The engine identifies risk and calculates exposure; it **never** triggers purchase orders, cancels shipments, or alters line schedules.
- **Audit Logging**: Every impact analysis invocation is logged with `analysis_id`, `disruption_input`, `execution_time_ms`, and `checksum` for governance audit trails.

---

## 13. Future REST API Specifications (Design Only — Deferred to Phase 2.3 Implementation)

```mermaid
sequenceDiagram
    participant Client as Frontend / API Client
    participant API as FastAPI Router (/api/v1/intelligence)
    participant Eng as Operational Intelligence Engine
    participant Cache as Redis Graph Cache
    participant DB as PostgreSQL DB

    Client->>API: POST /api/v1/intelligence/impact-analysis (DisruptionInput)
    API->>Eng: analyze_impact(disruption_input)
    Eng->>Cache: GET graph:v1:manufacturing:{checksum}
    alt Cache Hit
        Cache-->>Eng: Operational Graph JSON
    else Cache Miss
        Eng->>DB: Query Core & Adapter Tables
        DB-->>Eng: Primitive Records
        Eng->>Cache: SET graph:v1:manufacturing:{checksum}
    end
    Eng->>Eng: Execute Traversal & Derive SLA Exposure
    Eng-->>API: ImpactAnalysisResult
    API-->>Client: 200 OK (JSON Impact Report)
```

### Proposed Read-Only Endpoints
1. `POST /api/v1/intelligence/impact-analysis`: Evaluates downstream impact for a disruption vector.
2. `GET /api/v1/intelligence/graph/{node_type}/{node_id}`: Returns localized subgraph surrounding a target primitive node.
3. `GET /api/v1/intelligence/bottlenecks`: Returns active structural bottlenecks across the network.
4. `GET /api/v1/intelligence/critical-paths`: Returns all critical paths terminating at high-value SLA customer orders (`MAX_CRITICAL_PATHS = 100`).
5. `GET /api/v1/intelligence/inventory-risk`: Returns deterministic inventory risk details (affected component/warehouse, available inventory, coverage days, estimated stockout timestamp, risk classification).

---

## 14. Testing & Validation Specification (Design Only)

In Phase 2.3 implementation, automated pytest suites will verify:

1. **Golden-Path Causal Traversal Test**: Input disruption at `SUP-001` (72-hour delay) verifies exact causal path traversal: `SUP-001 -> PO-2026-001 -> SHP-2026-001 -> CMP-001 -> PRD-2026-001 -> SO-2026-001`.
2. **Independent $200,000 Exposure Derivation Test**: Asserts engine dynamically computes $200,000 exposure from ground-truth SLA rate ($50,000/day) and 4-day derived delay without hardcoded values.
3. **Stockout Timestamp Derivation Test**: Asserts `stockout_timestamp == effective_at + coverage_days`.
4. **Production Material Shortage (Zero Deficit) Test**: Verifies `material_deficit == 0` results in `production_delay_days == 0.0`.
5. **Production Material Shortage (Positive Deficit) Test**: Verifies `material_deficit > 0` calculates production delay accurately.
6. **Deterministic Graph Traversal Ordering Test**: Asserts neighbors are traversed in strict alphabetical `node_id` order across multiple runs.
7. **Cycle Detection Test**: Verifies `visited` set halts cyclic graph traversal without stack overflow.
8. **Critical-Path Depth Limit Test**: Asserts DFS halts at `MAX_CRITICAL_PATH_DEPTH = 15`.
9. **Critical-Path Maximum-Result Limit Test**: Asserts DFS enumeration halts at `MAX_CRITICAL_PATHS = 100`.
10. **Redis Cache Checksum Strategy Test**: Verifies cache key format `graph:v1:manufacturing:{dataset_checksum}` handles cache hits and misses correctly.
11. **Inventory-Risk Analysis Test**: Verifies deterministic response payload for `GET /api/v1/intelligence/inventory-risk`.
12. **100 Invocations Determinism Test**: Asserts 100 consecutive invocations with the same disruption input vector produce 100% identical JSON outputs.

---

## 15. Architectural Review & Proposed Architectural Decision Records (ADRs)

### Architectural Review
The Phase 2.3 design has been evaluated against `AGENTS.md`, `ARCHITECTURE.md`, `DOMAIN_MODEL.md`, `DECISIONS.md`, `PHASE_2_DOMAIN_DESIGN.md`, and `PHASE_2_2_DATASET_DESIGN.md`.

- **Compliance Status**: 100% Compliant. Preserves phase-by-phase progression, deterministic logic, read-only boundaries, and adapter isolation.

### Proposed Architectural Decision Records

#### Proposed ADR-011: In-Memory Deterministic Operational Graph Engine
- **Context**: NEXUS requires high-performance dependency graph traversal without introducing complex external graph databases (e.g. Neo4j) during Phase 2.
- **Decision**: Represent the operational graph in-memory using a custom lightweight adjacency dictionary structure (`OperationalGraph`) constructed directly from PostgreSQL Core primitives. Cache the constructed graph in Redis using `dataset_checksum`.
- **Consequences**: Sub-20ms traversal performance, zero additional database infrastructure dependencies, complete determinism.

#### Proposed ADR-012: Explicit Separation of SLA Input Rates from Calculated Financial Exposures
- **Context**: Need to avoid ambiguity between stored database facts and calculated analysis metrics.
- **Decision**: Store contract penalty rates (`liquidated_damages_per_day`) as ground-truth entity attributes in PostgreSQL. Dynamically compute total financial exposure (`financial_exposure = delay_days * liquidated_damages_per_day`) within the intelligence engine.
- **Consequences**: Database records remain pure operational facts; analysis reports provide dynamic, context-aware financial risk projections.

---

## 16. Implementation Scope Boundary Statement

> [!IMPORTANT]
> **Phase 2.3 Scope Boundary**:
> This document (`docs/PHASE_2_3_OPERATIONAL_INTELLIGENCE_DESIGN.md`) represents the complete design specification for Phase 2.3.
> **No Python application code, TypeScript code, SQL migrations, database models, or REST API endpoints have been created or modified in this design step.**
