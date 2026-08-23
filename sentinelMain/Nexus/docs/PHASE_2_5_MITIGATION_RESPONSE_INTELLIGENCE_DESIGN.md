# Phase 2.5 Specification — Mitigation & Response Intelligence Design (Revision 2)

## 1. Executive Summary & Core Objectives

Phase 2.5 extends the **NEXUS Autonomous Disruption Control Platform** from post-disruption diagnosis into predictive decision evaluation.

```
PHASE 2.3:  DETECT ──► TRACE ──► QUANTIFY
PHASE 2.5:  DETECT ──► TRACE ──► QUANTIFY ──► EVALUATE MITIGATIONS
```

The primary objective of Phase 2.5 is to allow supply chain managers and operators to evaluate, compare, and rank candidate **mitigation strategies** for a hypothetical operational disruption.

### Architectural Directives
1. **100% Deterministic Engine**: The mitigation generation, simulation, economic calculation, constraint verification, and recommendation ranking MUST NOT use LLMs, machine learning models, stochastic algorithms, reinforcement learning, NetworkX, Neo4j, or black-box decision frameworks. Given identical graph state, disruption input, and mitigation parameters, the engine MUST produce **identical semantic intelligence, candidate actions, simulation metrics, and rankings**.
2. **Human-in-the-Loop Read-Only Operation**: Mitigation strategies are purely **hypothetical and simulated**. The engine NEVER mutates PostgreSQL database records, updates inventory balances, executes purchase orders, reallocates shipments, or performs autonomous operational changes. Every mitigation is presented for human review and decision-making.
3. **Strict Ground-Truth vs. Derived Boundary**:
   - **Ground-Truth Inputs**: Persistent database facts (on-hand inventory, reserved inventory, daily demand rates, PO lead times, contract delivery dates, SLA liquidated damages penalty rates).
   - **Derived Metrics**: Simulated ETA acceleration, saved delay days, avoided SLA financial exposure, mitigation execution cost, net value, residual financial exposure, and post-mitigation composite risk score.
4. **No Fabricated Operational Facts**: The engine MUST NEVER invent operational facts, alternate suppliers, warehouse stock, or carrier capabilities. If required operational data or configuration parameters are unavailable, the engine MUST classify the candidate as `BLOCKED` or `UNAVAILABLE` with an explicit, structured constraint reason code.
5. **Dynamic Golden-Path Derivation**: Financial calculations must derive dynamically from engine formulas ($\text{financial\_exposure} = \text{delay\_days} \times \text{ld\_rate}$). The $50,000/day SLA penalty rate and 4-day derived delay for customer order `SO-2026-001` must dynamically evaluate to the $200,000 benchmark without hardcoding fixed dollars.

---

## 2. Architecture & Simulation State Pipeline

Phase 2.5 introduces an explicit **Simulation State Abstraction** layer. Instead of mutating graph edges directly, mitigations apply hypothetical changes to an in-memory `SimulationState` object.

```
┌────────────────────────────────────────────────────────┐
│               PostgreSQL Core DB & Cache               │
│         (Entities, Resources, Inventory, SLAs)         │
└───────────────────────────┬────────────────────────────┘
                            │ (Read-Only Fetch)
                            ▼
┌────────────────────────────────────────────────────────┐
│             Phase 2.3 Operational Graph                │
│            + Impact Analysis Baseline Result           │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               In-Memory SimulationState                │
│    (graph_state, inventory_state, shipment_state,      │
│     production_state, supplier_state, sla_state)       │
└───────────────────────────┬────────────────────────────┘
                            │ (Apply Hypothetical Action)
                            ▼
┌────────────────────────────────────────────────────────┐
│            Deterministic Simulation Engine             │
│   (Re-run Traversal, Economic Derivation & Rescoring)  │
└───────────────────────────┬────────────────────────────┘
                            │ (Simulated Outcomes)
                            ▼
┌────────────────────────────────────────────────────────┐
│       Deterministic Score & Ranking Model              │
│    (Normalized Breakdown + Semantic Determinism)       │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│            Mitigation & Response Report API            │
│       (POST /api/v1/intelligence/mitigations)          │
└───────────────────────────┴────────────────────────────┘
```

### SimulationState Components
The in-memory `SimulationState` maintains transient copies of state variables:
- `graph_state`: Operational graph adjacency, node statuses, and edge lead times.
- `inventory_state`: On-hand stock, reserved stock, and demand rates per warehouse/component.
- `shipment_state`: In-transit tracking, carrier modes, and ETA timestamps.
- `production_state`: Line schedules, target dates, and material allocations.
- `supplier_state`: Supplier capacities, tier ratings, and single-source flags.
- `sla_state`: Customer order commitments, target delivery dates, and LD rates.

---

## 3. Mitigation Domain Models & Schemas

The mitigation domain defines explicit Pydantic models for representing candidate actions, simulation outcomes, constraints, explanations, and recommendations.

### 3.1 Domain Schemas

```python
from enum import Enum
from typing import List, Dict, Optional, Any
from decimal import Decimal
from datetime import datetime, date
from pydantic import BaseModel, Field


class MitigationCategory(str, Enum):
    INVENTORY_REALLOCATION = "INVENTORY_REALLOCATION"
    SHIPMENT_EXPEDITION = "SHIPMENT_EXPEDITION"
    PRODUCTION_PRIORITIZATION = "PRODUCTION_PRIORITIZATION"
    SUPPLIER_SUBSTITUTION = "SUPPLIER_SUBSTITUTION"
    SLA_ACCEPTANCE = "SLA_ACCEPTANCE"


class FeasibilityStatus(str, Enum):
    FEASIBLE = "FEASIBLE"
    UNAVAILABLE = "UNAVAILABLE"
    BLOCKED = "BLOCKED"


class MitigationAction(BaseModel):
    action_id: str = Field(..., description="Unique deterministic identifier (e.g. ACT-EXP-SHP001)")
    category: MitigationCategory
    title: str = Field(..., description="Human-readable title")
    description: str = Field(..., description="Detailed description of hypothetical operational action")
    target_node_id: str = Field(..., description="Primary graph node ID targeted by this action")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Action parameters and operational inputs")


class MitigationConstraint(BaseModel):
    constraint_code: str = Field(..., description="Structured code (e.g. SINGLE_SOURCE_RESTRICTION)")
    is_violated: bool
    reason: str = Field(..., description="Human-readable rule explanation")


class WhyThisExplanation(BaseModel):
    headline: str
    key_drivers: List[str]
    saved_delay_days: float
    avoided_financial_exposure: Decimal
    net_value: Decimal
    risk_reduction_points: float
    decision_score: float


class WhyNotExplanation(BaseModel):
    action_id: str
    category: MitigationCategory
    feasibility: FeasibilityStatus
    primary_reason: str
    constraint_codes: List[str] = Field(default_factory=list)


class MitigationOutcome(BaseModel):
    action_id: str
    category: MitigationCategory
    feasibility: FeasibilityStatus
    constraints: List[MitigationConstraint] = Field(default_factory=list)
    
    # Ground Truth Inputs
    baseline_sla_exposure: Decimal
    mitigation_cost: Decimal
    
    # Derived Output Metrics
    delay_reduction_days: float
    resulting_delivery_date: str
    avoided_sla_exposure: Decimal
    residual_sla_exposure: Decimal
    net_value: Decimal
    residual_risk_score: float
    affected_nodes_after: List[str] = Field(default_factory=list)
    
    # Ranking & Explanation
    ranking_score: float
    score_breakdown: Dict[str, float] = Field(default_factory=dict)
    why_this: Optional[WhyThisExplanation] = None
    why_not: Optional[WhyNotExplanation] = None


class Recommendation(BaseModel):
    recommended_action_id: Optional[str]
    headline: str
    rationale: str
    why_this: WhyThisExplanation
    rejected_alternatives_why_not: List[WhyNotExplanation] = Field(default_factory=list)
    execution_safety_notice: str = Field(
        default="Simulation only — no operational state is modified in database."
    )


class MitigationSimulationRequest(BaseModel):
    disruption_id: str
    target_type: str
    target_id: str
    event_type: str
    severity: str
    effective_at: datetime
    duration_hours: float
    selected_action_id: Optional[str] = None
    action_parameters: Dict[str, Any] = Field(default_factory=dict)


class MitigationSimulationResponse(BaseModel):
    simulation_id: str
    disruption_id: str
    baseline_financial_exposure: Decimal
    baseline_risk_score: float
    candidate_options: List[MitigationOutcome]
    top_recommendation: Optional[Recommendation]
    execution_time_ms: float
```

---

## 4. Feasibility Terminology & Constraint Engine

To ensure rigorous decision-making, Phase 2.5 enforces strict, mutually exclusive **Feasibility Statuses**.

### Feasibility States Definition

| Status | Exact Definition | Operational Example |
|---|---|---|
| **`FEASIBLE`** | The mitigation can be simulated successfully under all known operational constraints. | Shipment acceleration is physically possible and carrier rate parameter exists. |
| **`UNAVAILABLE`** | The required resource, alternate entity, or capability does NOT exist in the network. | Component `CMP-001` is single-sourced (`is_single_sourced = True`); zero alternate suppliers exist. |
| **`BLOCKED`** | The resource/alternate exists, but one or more operational constraints or missing data parameters prevent its use. | Alternate supplier exists but lacks unallocated capacity, or shop-floor capacity data is missing. |

*Rule*: Every outcome MUST have exactly ONE feasibility status. Contradictory statuses (e.g. `UNAVAILABLE [BLOCKED]`) are strictly forbidden.

### Structured Constraint Reason Codes

| Reason Code | Feasibility Status | Detailed Description |
|---|---|---|
| `SINGLE_SOURCE_RESTRICTION` | `UNAVAILABLE` | Component is single-sourced in database. Zero alternate suppliers exist. |
| `NO_ALTERNATE_SUPPLIER_REGISTERED` | `UNAVAILABLE` | No alternate supplier record linked to component in adapter tables. |
| `INSUFFICIENT_UNRESERVED_STOCK` | `BLOCKED` | Source warehouse unreserved stock is less than required transfer quantity. |
| `MAX_ACCELERATION_EXCEEDED` | `BLOCKED` | Acceleration hours requested exceeds physical transit limits ($> 50\%$ lead time). |
| `PROTECTED_ORDER_CONFLICT` | `BLOCKED` | Reallocating material/priority breaches a higher-value customer SLA contract. |
| `REQUIRED_CAPACITY_DATA_UNAVAILABLE` | `BLOCKED` | Shop-floor production capacity or changeover parameter is missing from database. |
| `MISSING_OPERATIONAL_PARAM` | `BLOCKED` | Required parameter (e.g. transfer rate fee) is omitted and cannot be derived. |
| `NEGATIVE_DELAY_IMPOSSIBLE` | `BLOCKED` | Mitigation cannot complete delivery prior to target baseline completion. |

---

## 5. Candidate Generation Engine across 5 Categories

The Candidate Generation Engine inspects `SimulationState` to produce candidates without hardcoded unconditional outcomes or fabricated business facts.

### Deterministic Action Derivation Rules

#### Category A: `INVENTORY_REALLOCATION`
- **Derivation Rule**: Scans non-target warehouses for matching component inventory.
- **Usable Inventory**: $\text{usable} = \max(0, \text{quantity\_on\_hand} - \text{quantity\_reserved})$.
- **Transfer Cost**: $\text{transfer\_cost} = \text{reallocated\_qty} \times \text{unit\_freight\_rate} + \text{handling\_fee}$.
- **Missing Parameter Handling**: If `unit_freight_rate` parameter is missing, status is set to `BLOCKED` with code `MISSING_OPERATIONAL_PARAM`.

#### Category B: `SHIPMENT_EXPEDITION`
- **Derivation Rule**: Evaluates in-transit shipments carrying affected components.
- **Acceleration Limit**: $\text{max\_acceleration\_hours} = \min(0.50 \times \text{baseline\_lead\_time}, 72.0\text{ hours})$.
- **Expedition Cost**: Derived from rate table: $\text{expedition\_cost} = \text{base\_fee} + (\text{acceleration\_hours} \times \text{hourly\_rate})$.
- **Feasibility**: `FEASIBLE` if acceleration $\le \text{max\_acceleration}$; `BLOCKED` with `MAX_ACCELERATION_EXCEEDED` if exceeded.

#### Category C: `PRODUCTION_PRIORITIZATION`
- **Derivation Rule**: Evaluates re-sequencing shop-floor production orders.
- **Strict Data Verification**: Deterministically verifies:
  1. Material availability for prioritized order.
  2. Remaining production quantity and line status.
  3. Changeover setup cost and time.
  4. SLA contract importance of deprioritized order.
- **Missing Data Rule**: If line capacity or setup cost data is missing from database records, status is set to `BLOCKED` with code `REQUIRED_CAPACITY_DATA_UNAVAILABLE`.

#### Category D: `SUPPLIER_SUBSTITUTION`
- **Derivation Rule**: Inspects `OperationalGraph` for alternate component suppliers.
- **Single-Source Rule**: If `CMP-001` has `is_single_sourced = True`, engine returns `UNAVAILABLE` with reason code `SINGLE_SOURCE_RESTRICTION`.
- **Capacity Rule**: If alternate supplier exists but unallocated capacity $<$ required volume, returns `BLOCKED` with code `INSUFFICIENT_UNRESERVED_STOCK`.

#### Category E: `SLA_ACCEPTANCE`
- **Derivation Rule**: Always generated as the "Do nothing / accept exposure" baseline control option.
- **Outputs**: Cost $= \$0.00$, Saved Delay $= 0.0$d, Avoided Exposure $= \$0.00$, Residual Exposure $=$ Baseline Exposure, Feasibility $=$ `FEASIBLE`.

---

## 6. Economic & Financial Model

All financial derivations use fixed-precision `Decimal` arithmetic.

### Deterministic Financial Equations

$$\text{avoided\_exposure} = \max(0, \text{baseline\_exposure} - \text{scenario\_exposure})$$

$$\text{net\_value} = \text{avoided\_exposure} - \text{mitigation\_cost}$$

$$\text{residual\_exposure} = \max(0, \text{baseline\_exposure} - \text{avoided\_exposure})$$

### Separation of Ground Truth vs. Derived Metrics

| Ground Truth Persistent DB Facts | Derived Mitigation Simulation Outputs |
|---|---|
| Contractual SLA Penalty Rate ($\$50,000.00$/day) | Derived Delay Reduction ($2.0$ Days) |
| Requested Delivery Date (`2026-08-18`) | Avoided SLA Exposure ($\$100,000.00$) |
| On-hand Inventory ($500$ units) | Derived Mitigation Cost ($\$12,500.00$) |
| Reserved Inventory ($300$ units) | Derived Net Financial Value ($\$87,500.00$) |
| Average Daily Demand ($150$ units/day) | Derived Residual Exposure ($\$100,000.00$) |

---

## 7. Normalized Recommendation Ranking Model

To eliminate double-counting of mitigation cost (previously subtracted in `net_value` and also as a cost penalty), Phase 2.5 establishes a transparent, normalized **Decision Score Model**.

### Decision Score Formula

$$\text{Decision Score} = S_{\text{financial}} + S_{\text{delay}} + S_{\text{risk}} - P_{\text{cost}} - P_{\text{constraint}}$$

Where:
1. **Financial Benefit Score ($S_{\text{financial}}$)**: Measures exposure avoided (bounded $[0, 40]$).
   $$S_{\text{financial}} = \min\left(40.0, \frac{\text{avoided\_exposure}}{10,000} \times 4.0\right)$$
2. **Delay Reduction Score ($S_{\text{delay}}$)**: Measures time saved (bounded $[0, 30]$).
   $$S_{\text{delay}} = \min\left(30.0, \text{delay\_reduction\_days} \times 10.0\right)$$
3. **Risk Reduction Score ($S_{\text{risk}}$)**: Measures graph risk score improvement (bounded $[0, 20]$).
   $$S_{\text{risk}} = \min\left(20.0, (\text{baseline\_risk} - \text{residual\_risk}) \times 2.0\right)$$
4. **Mitigation Cost Penalty ($P_{\text{cost}}$)**: Penalizes direct execution cost (bounded $[0, 20]$).
   $$P_{\text{cost}} = \min\left(20.0, \frac{\text{mitigation\_cost}}{10,000} \times 4.0\right)$$
5. **Constraint Penalty ($P_{\text{constraint}}$)**:
   $$P_{\text{constraint}} = \begin{cases} 0.0 & \text{if Feasibility} = \text{FEASIBLE} \\ 1000.0 & \text{if Feasibility} \in \{\text{UNAVAILABLE}, \text{BLOCKED}\} \end{cases}$$

### Deterministic Tie-Breaking
If two feasible mitigation options achieve identical `Decision Score` values (to 2 decimal places), ties are broken deterministically by alphabetical order of `action_id` (e.g. `ACT-EXP-SHP001` before `ACT-INV-WH002`).

### Structured Score Breakdown Output

```json
"score_breakdown": {
  "financial_benefit_score": 40.0,
  "delay_reduction_score": 20.0,
  "risk_reduction_score": 12.0,
  "mitigation_cost_penalty": 5.0,
  "constraint_penalty": 0.0,
  "final_decision_score": 67.0
}
```

---

## 8. Structured "WHY THIS?" and "WHY NOT?" Explanations

The API response provides machine-readable structured explanation fields generated directly from engine attributes without using LLM text generation.

### "WHY THIS?" Structure
Attached to the top-recommended option:
- **Headline**: Executive summary statement.
- **Key Drivers**: List of primary metrics driving recommendation.
- **Metrics**: `saved_delay_days`, `avoided_financial_exposure`, `net_value`, `risk_reduction_points`, `decision_score`.

### "WHY NOT?" Structure
Attached to rejected, blocked, or lower-ranked alternatives:
- **Action ID & Category**
- **Feasibility Status** (`UNAVAILABLE`, `BLOCKED`, `FEASIBLE`)
- **Primary Reason**: Deterministic explanation string.
- **Constraint Codes**: Array of constraint reason codes (e.g. `['SINGLE_SOURCE_RESTRICTION']`).

---

## 9. Semantic Determinism Contract

The design replaces raw byte-for-byte JSON identity claims with a strict **Semantic Determinism Contract**.

### Semantic Determinism Contract Definition
Given identical:
- Database state,
- Graph adjacency,
- Disruption vector inputs,
- Mitigation parameters and configuration,

The engine MUST produce **100% identical semantic intelligence**:
- Identical candidate action lists,
- Identical feasibility statuses and constraint codes,
- Identical financial exposure and net value calculations,
- Identical delay reduction days,
- Identical residual risk scores,
- Identical ranking order and top recommendation,
- Identical structured "Why This?" and "Why Not?" explanations.

*Allowed Metadata Variations*: Ephemeral metadata fields such as `simulation_id` (UUID generation), `execution_time_ms` (CPU clock timing), and response generation timestamps MAY legitimately vary.

---

## 10. Golden-Path Benchmark Integration

The Phase 2.5 engine integrates seamlessly with the NEXUS Golden-Path Benchmark:

$$\text{SUP-001} \to \text{PO-2026-001} \to \text{SHP-2026-001} \to \text{CMP-001} \to \text{PRD-2026-001} \to \text{SO-2026-001}$$

- **Baseline Exposure**: Derived from Phase 2.3 engine ($4.0$ days delay $\times$ $\$50,000$/day LD rate $=$ **$\$200,000.00$**).
- **Illustrative Expected Demo Outputs**:
  - `SHIPMENT_EXPEDITION` (`SHP-2026-001`): Saves $2.0$ days, avoids $\$100,000.00$ exposure at $\$12,500.00$ cost $\to$ Net Value $+\$87,500.00$ (Rank #1).
  - `INVENTORY_REALLOCATION` (`WH-002` $\to$ `WH-001`): Saves $2.0$ days, avoids $\$100,000.00$ exposure at $\$18,000.00$ cost $\to$ Net Value $+\$82,000.00$ (Rank #2).
  - `PRODUCTION_PRIORITIZATION` (`PRD-2026-001`): Saves $1.0$ day, avoids $\$50,000.00$ exposure at $\$8,000.00$ cost $\to$ Net Value $+\$42,000.00$ (Rank #3).
  - `SLA_ACCEPTANCE`: Saves $0.0$ days, cost $\$0.00$, residual exposure $\$200,000.00$ (Rank #4).
  - `SUPPLIER_SUBSTITUTION`: `UNAVAILABLE` (`CMP-001` single-sourced from `SUP-001`).

---

## 11. API Contract (`POST /api/v1/intelligence/mitigations`)

### Request Payload

```json
{
  "disruption_id": "DIS-HYP-001",
  "target_type": "ENTITY",
  "target_id": "ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519",
  "event_type": "SUPPLIER_OUTAGE",
  "severity": "CRITICAL",
  "effective_at": "2026-08-01T12:00:00Z",
  "duration_hours": 200.0
}
```

### Response Payload

```json
{
  "simulation_id": "SIM-MIT-8A91F2C0",
  "disruption_id": "DIS-HYP-001",
  "baseline_financial_exposure": 200000.00,
  "baseline_risk_score": 42.92,
  "candidate_options": [
    {
      "action_id": "ACT-EXP-SHP001",
      "category": "SHIPMENT_EXPEDITION",
      "feasibility": "FEASIBLE",
      "constraints": [],
      "baseline_sla_exposure": 200000.00,
      "mitigation_cost": 12500.00,
      "delay_reduction_days": 2.0,
      "resulting_delivery_date": "2026-08-20",
      "avoided_sla_exposure": 100000.00,
      "residual_sla_exposure": 100000.00,
      "net_value": 87500.00,
      "residual_risk_score": 24.50,
      "ranking_score": 67.0,
      "score_breakdown": {
        "financial_benefit_score": 40.0,
        "delay_reduction_score": 20.0,
        "risk_reduction_score": 12.0,
        "mitigation_cost_penalty": 5.0,
        "constraint_penalty": 0.0,
        "final_decision_score": 67.0
      },
      "why_this": {
        "headline": "Expedite Shipment SHP-2026-001 via Dedicated Air Freight",
        "key_drivers": [
          "Saves 2.0 days of SLA delay for Titan Motors",
          "Avoids $100,000.00 in contractual liquidated damages",
          "Yields highest net financial value ($87,500.00)"
        ],
        "saved_delay_days": 2.0,
        "avoided_financial_exposure": 100000.00,
        "net_value": 87500.00,
        "risk_reduction_points": 18.42,
        "decision_score": 67.0
      }
    },
    {
      "action_id": "ACT-SUB-SUP001",
      "category": "SUPPLIER_SUBSTITUTION",
      "feasibility": "UNAVAILABLE",
      "constraints": [
        {
          "constraint_code": "SINGLE_SOURCE_RESTRICTION",
          "is_violated": true,
          "reason": "Component CMP-001 is single-sourced. Zero alternate suppliers exist in graph."
        }
      ],
      "baseline_sla_exposure": 200000.00,
      "mitigation_cost": 0.00,
      "delay_reduction_days": 0.0,
      "resulting_delivery_date": "2026-08-22",
      "avoided_sla_exposure": 0.00,
      "residual_sla_exposure": 200000.00,
      "net_value": 0.00,
      "residual_risk_score": 42.92,
      "ranking_score": -1000.0,
      "score_breakdown": {
        "financial_benefit_score": 0.0,
        "delay_reduction_score": 0.0,
        "risk_reduction_score": 0.0,
        "mitigation_cost_penalty": 0.0,
        "constraint_penalty": -1000.0,
        "final_decision_score": -1000.0
      },
      "why_not": {
        "action_id": "ACT-SUB-SUP001",
        "category": "SUPPLIER_SUBSTITUTION",
        "feasibility": "UNAVAILABLE",
        "primary_reason": "Component CMP-001 is single-sourced. Zero alternate suppliers exist in operational graph.",
        "constraint_codes": ["SINGLE_SOURCE_RESTRICTION"]
      }
    }
  ],
  "top_recommendation": {
    "recommended_action_id": "ACT-EXP-SHP001",
    "headline": "Expedite Shipment SHP-2026-001 via Dedicated Air Freight",
    "rationale": "Expediting shipment SHP-2026-001 saves 2.0 days of delay, avoiding $100,000.00 in SLA penalties for Titan Motors at a mitigation cost of $12,500.00 (Net Value: $87,500.00).",
    "why_this": {
      "headline": "Expedite Shipment SHP-2026-001 via Dedicated Air Freight",
      "key_drivers": [
        "Saves 2.0 days of SLA delay for Titan Motors",
        "Avoids $100,000.00 in contractual liquidated damages",
        "Yields highest net financial value ($87,500.00)"
      ],
      "saved_delay_days": 2.0,
      "avoided_financial_exposure": 100000.00,
      "net_value": 87500.00,
      "risk_reduction_points": 18.42,
      "decision_score": 67.0
    },
    "rejected_alternatives_why_not": [
      {
        "action_id": "ACT-SUB-SUP001",
        "category": "SUPPLIER_SUBSTITUTION",
        "feasibility": "UNAVAILABLE",
        "primary_reason": "Component CMP-001 is single-sourced. Zero alternate suppliers exist in graph.",
        "constraint_codes": ["SINGLE_SOURCE_RESTRICTION"]
      }
    ],
    "execution_safety_notice": "Simulation only — no operational state is modified in database."
  },
  "execution_time_ms": 42.5
}
```

---

## 12. Complete 30-Case Testing Specification

The testing suite for Phase 2.5 implementation will cover **30 explicit test cases**:

1. `test_golden_path_mitigation_baseline`: Verifies baseline exposure evaluates dynamically to $200,000.
2. `test_shipment_expedition_derivation`: Validates delay reduction and net value formulas for shipment expedition.
3. `test_inventory_reallocation_usable_stock`: Confirms inventory reallocation respects `usable = max(0, on_hand - reserved)`.
4. `test_production_prioritization_simulation`: Verifies shop-floor re-sequencing simulation.
5. `test_supplier_substitution_available`: Tests alternate supplier selection when unallocated capacity exists.
6. `test_supplier_substitution_single_source_blocked`: Confirms single-sourced `CMP-001` returns `UNAVAILABLE` status.
7. `test_sla_acceptance_do_nothing`: Verifies SLA acceptance baseline option returns zero cost and zero exposure avoided.
8. `test_insufficient_inventory_rejection`: Confirms rejection when source warehouse stock is insufficient.
9. `test_impossible_acceleration_cap`: Confirms expedition acceleration is capped at 50% lead time limit.
10. `test_negative_parameters_validation`: Rejects negative cost or invalid duration parameters.
11. `test_dynamic_ld_rate_computation`: Confirms SLA exposure derives dynamically from LD rate $\times$ delay days.
12. `test_avoided_exposure_formula`: Verifies $\text{avoided} = \text{baseline} - \text{scenario}$.
13. `test_net_value_formula`: Verifies $\text{net\_value} = \text{avoided} - \text{cost}$.
14. `test_residual_exposure_formula`: Verifies $\text{residual} = \max(0, \text{baseline} - \text{avoided})$.
15. `test_deterministic_ranking_order`: Confirms candidate actions rank strictly by derived decision score.
16. `test_100_percent_repeatable_output`: Confirms 100 consecutive runs produce identical semantic intelligence.
17. `test_zero_database_mutations`: Verifies PostgreSQL row counts remain unchanged after simulation.
18. `test_constraint_reason_codes`: Confirms structured reason codes (`SINGLE_SOURCE_RESTRICTION`).
19. `test_zero_exposure_scenario`: Confirms graceful handling when baseline disruption produces zero exposure.
20. `test_api_schema_validation`: Validates request and response Pydantic schema validation.
21. `test_missing_operational_data_blocks_mitigation`: Confirms missing parameters return `BLOCKED` with code `MISSING_OPERATIONAL_PARAM`.
22. `test_no_fabricated_supplier`: Guarantees engine never fabricates non-existent suppliers.
23. `test_no_fabricated_inventory`: Guarantees engine never fabricates warehouse stock.
24. `test_no_fabricated_production_capacity`: Confirms missing shop-floor capacity returns `REQUIRED_CAPACITY_DATA_UNAVAILABLE`.
25. `test_feasible_vs_blocked_vs_unavailable_semantics`: Validates mutually exclusive feasibility state assignments.
26. `test_ranking_does_not_double_count_cost`: Verifies normalized Decision Score model without double cost penalty.
27. `test_semantic_determinism_across_repeated_runs`: Confirms identical semantic intelligence across repeated runs.
28. `test_why_this_explanation_is_structured`: Verifies machine-readable `WhyThisExplanation` payload.
29. `test_why_not_explanation_is_structured`: Verifies machine-readable `WhyNotExplanation` payload.
30. `test_simulation_state_does_not_mutate_database`: Verifies in-memory `SimulationState` leaves database 100% untouched.

---

## 13. Phase Boundary & Verification Checklist

- [x] Design specification updated and hardened (`docs/PHASE_2_5_MITIGATION_RESPONSE_INTELLIGENCE_DESIGN.md`).
- [x] **0 backend Python files modified**.
- [x] **0 frontend TS/TSX files modified**.
- [x] **0 database schemas, migrations, or seed files created**.
- [x] **0 external npm or Python dependencies added**.
- [x] **0 AI/LLM/agent frameworks introduced**.
- [x] Hardcoded mitigation outcome assumptions removed.
- [x] Scoring model revised to prevent cost double-counting.
- [x] Byte-for-byte claim replaced with Semantic Determinism Contract.
- [x] Feasibility states (`FEASIBLE`, `UNAVAILABLE`, `BLOCKED`) strictly defined.
- [x] Production prioritization data verification strengthened.
- [x] `SimulationState` abstraction introduced.
- [x] Structured "Why This?" and "Why Not?" explanations specified.
- [x] Missing-data safety rule established.
- [x] 30 conceptual test cases specified.

---

```
PHASE 2.5 DESIGN HARDENED
READY FOR IMPLEMENTATION
```
