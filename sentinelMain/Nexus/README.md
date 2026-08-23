# NEXUS - Autonomous Disruption Control Platform

NEXUS is an enterprise-grade **Autonomous Disruption Control Platform** designed to detect, investigate, simulate, decide, execute, verify, and learn from operational disruptions across complex physical and digital supply networks.

---

## What Problem Does NEXUS Solve?

Modern supply chains, logistics networks, and operational systems are constantly exposed to unexpected disruptions—supplier delays, component shortages, transport failures, quality rejections, and sudden demand spikes.

Traditional operational software relies on manual monitoring, reactive crisis management, and fragmented tools. Generic LLM chatbots lack deterministic guarantees, financial accuracy, and safe operational control.

NEXUS bridges this gap by combining **AI reasoning** with **deterministic operational control** into a closed-loop control system that manages disruptions autonomously while keeping humans firmly in control of strategic decisions.

---

## Core Control Loop

NEXUS operates on a continuous 9-stage closed control loop:

```
SENSE ──► UNDERSTAND ──► PREDICT ──► SIMULATE ──► DECIDE ──► ACT ──► VERIFY ──► REPLAN ──► LEARN
  ▲                                                                                         │
  └─────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **SENSE**: Ingest real-time operational events, telemetry, and status signals.
2. **UNDERSTAND**: Construct an evidence graph, resolve conflicting signals, and identify root causes.
3. **PREDICT**: Project downstream impacts, dependency cascades, and time-to-failure (TTF).
4. **SIMULATE**: Run deterministic counterfactual simulations of candidate recovery strategies on a Digital Twin.
5. **DECIDE**: Evaluate scenarios against multi-objective trade-offs (cost, time, risk, customer impact).
6. **ACT**: Execute approved actions through governed, tool-mediated API calls.
7. **VERIFY**: Measure actual post-execution reality against projected outcomes.
8. **REPLAN**: Automatically trigger dynamic replanning if execution diverges or new disruptions occur.
9. **LEARN**: Store incident trajectories, decision outcomes, and supplier reliability metrics into long-term memory.

---

## Domain-Agnostic Core & Domain Adapters

NEXUS Core is strictly **domain-agnostic**. It operates on universal operational primitives:
- `ENTITY`
- `RESOURCE`
- `EVENT`
- `CONSTRAINT`
- `ACTION`
- `METRIC`
- `DEPENDENCY`

All domain-specific concepts, logic, and external schema mappings live inside pluggable **Domain Adapters**.

### Primary Domain: Manufacturing / Supply Chain
The initial target implementation domain for NEXUS is **Manufacturing / Supply Chain Operations**, mapping concepts like Suppliers, Purchase Orders, Shipments, Components, Production Orders, and Customer Orders to universal core abstractions.

### Planned Extension: NEXUS Logistics
The architecture natively supports extending to additional operational domains such as **Logistics / Fleet Management**, **Aviation Operations**, **Energy Grids**, and **Cloud Infrastructure** without changing the core reasoning engine.

---

## Current Status & Development Roadmap

> [!IMPORTANT]
> NEXUS is being built strictly phase-by-phase.

- [x] **Phase 0: Architecture & Foundation** *(Current)*
  - Core architecture contracts & specifications established
  - Universal domain model & adapter specifications defined
  - Agent and tool interface contracts documented
  - Governance policies and deterministic simulation specs authored
  - Repository structure and development rules (`AGENTS.md`) enforced
- [ ] **Phase 1: Domain Adapter & Synthetic Environment**
- [ ] **Phase 2: Event, Evidence & Digital Twin Foundation**
- [ ] **Phase 3: Impact Analysis & TTF Engine**
- [ ] **Phase 4: Agent Orchestrator & Tool Architecture**
- [ ] **Phase 5: Scenario Simulation & Multi-Objective Optimization**
- [ ] **Phase 6: Governed Execution, Verification & Replanning**
- [ ] **Phase 7: Memory, Audit & Learning System**
- [ ] **Phase 8: Resilience Lab & Chaos Engineering**
- [ ] **Phase 9: Enterprise UI / Control Tower**
- [ ] **Phase 10: Production Readiness & End-to-End Validation**

---

## Repository Structure

```
NEXUS/
├── AGENTS.md                   # Strict development rules & engineering contracts
├── README.md                   # Project overview & system architecture guide
├── docker-compose.yml          # Containerized infrastructure services definition
├── .env.example                # Environment variables template
│
├── docs/                       # Architectural & Technical Specifications
│   ├── ARCHITECTURE.md         # System design, 23 core subsystems & data flows
│   ├── DOMAIN_MODEL.md         # Universal abstractions & domain adapter mapping
│   ├── AGENT_SPEC.md           # 7 Agent roles, boundaries & tool constraints
│   ├── TOOL_SPEC.md            # 5 Tool categories, schemas & execution model
│   ├── SIMULATION_SPEC.md      # Digital Twin, state cloning & counterfactual simulation
│   ├── POLICY_SPEC.md          # Autonomy Levels (0-3), policy engine & human approval
│   └── DECISIONS.md            # Architecture Decision Records (ADRs 001–007)
│
├── backend/                    # Core Python/FastAPI backend application (Phase 1+)
├── frontend/                   # React/TypeScript/Vite UI Control Tower (Phase 9)
├── simulation/                 # Discrete event & state simulation engine (Phase 5)
├── domain_adapters/            # Domain-specific mapping layers
│   └── manufacturing/          # Manufacturing & supply chain adapter
├── data/                       # Dataset & scenario definitions
│   ├── seed/                   # Baseline seed data definitions
│   └── scenarios/              # Disruption benchmark scenarios
└── tests/                      # Suite of automated unit, integration & end-to-end tests
```

---

## Technology Stack Direction

- **Backend Target**: Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0, PostgreSQL + pgvector, Redis
- **Frontend Target**: React 18+, TypeScript, Vite, Tailwind CSS
- **Simulation Target**: Python SimPy / Custom Deterministic State Engine
- **DevOps**: Docker, Docker Compose
