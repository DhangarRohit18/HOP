# Phase 2.4 Specification — Operational Intelligence Product Design (Revision 2)

## 1. Executive Summary & Product Architecture Overview

Phase 2.4 defines the comprehensive UI/UX product design specification for integrating the NEXUS **Operational Dependency Intelligence Engine** into a state-of-the-art web application interface.

This product layer transforms the underlying deterministic graph traversal, inventory forecasting, production delay evaluation, and SLA financial exposure calculations into an interactive, visual operational intelligence suite.

```
┌────────────────────────────────────────────────────────┐
│             NEXUS Web Application Frontend             │
│        (Vite + React / Modern JS + Vanilla CSS)        │
└───────────────────────────┬────────────────────────────┘
                            │ (Async REST API Calls)
                            ▼
┌────────────────────────────────────────────────────────┐
│            FastAPI REST Router (/api/v1)               │
│   (/intelligence/impact-analysis, /inventory-risk,     │
│    /bottlenecks, /critical-paths, /health)             │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│         Deterministic Operational Engine (v2.3)        │
│   (Custom Adjacency Graph + Redis Checksum Cache)      │
└───────────────────────────┴────────────────────────────┘
```

### Core Product Design Principles
1. **Central Operational Journey**:
   $$\text{Disruption Vector} \to \text{Dependency Graph} \to \text{Causal Impact} \to \text{Bottlenecks} \to \text{Inventory Risk} \to \text{Production Delay} \to \text{SLA Financial Exposure} \to \text{Explainable Risk} \to \text{Human Decision}$$
2. **Strict Read-Only Enforcement**: The product UI provides complete visibility into network vulnerabilities and derived exposures. The UI may contain forms and controls for submitting hypothetical read-only analysis requests, but contains **zero controls capable of executing INSERT, UPDATE, DELETE, operational state mutation, or autonomous recovery actions**.
3. **Visual Excellence & High Aesthetics**: Incorporates curated dark-mode color palettes, HSL design tokens, glassmorphic cards, dynamic node-edge canvas graph renderings, and micro-animations to deliver a state-of-the-art executive experience.
4. **100% Deterministic & Explainable Presentation**: Every score, timestamp, delay, and financial penalty presented on screen links directly to an explainable mathematical formula and structural causal path. Zero black-box AI estimations.

---

## 2. Frontend Information Architecture

The application layout follows a responsive 3-zone architecture: a global header bar, a collapsible primary navigation sidebar, and a dynamic main content stage.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Global Header Bar (System Brand, Live Health Indicators, Disruption Status)  │
├───────────────┬──────────────────────────────────────────────────────────────┤
│               │                                                              │
│  Navigation   │                                                              │
│    Sidebar    │                     Main Content Stage                       │
│               │             (Dashboard / Workspace Views)                    │
│  • Executive  │                                                              │
│  • Impact     │                                                              │
│  • Graph      │                                                              │
│  • Bottleneck │                                                              │
│  • Inventory  │                                                              │
│  • SLA Exposure│                                                              │
│               │                                                              │
└───────────────┴──────────────────────────────────────────────────────────────┘
```

### Primary Navigation Views
1. **Executive Operational Dashboard (`/dashboard`)**: High-level system overview, global financial exposure metrics, active disruption summary, and platform infrastructure health.
2. **Interactive Impact Analysis Workspace (`/impact-workspace`)**: Disruption scenario configuration, target primitive picker, execution trigger, and comprehensive impact report visualizer.
3. **Operational Dependency Graph Viewer (`/graph-viewer`)**: Interactive 2D canvas/SVG rendering of the directed primitive network with node filtering, search, and depth controls.
4. **Bottleneck Intelligence Center (`/bottlenecks`)**: Real-time table and risk cards highlighting single-source components, near-capacity suppliers ($\ge 90\%$), and high-centrality primitives.
5. **Inventory Risk & Coverage Center (`/inventory-risk`)**: Table and stockout timeline views detailing warehouse balances, daily demand rates, coverage days, and projected stockout timestamps.
6. **Critical Path & SLA Exposure Center (`/sla-exposure`)**: Visual breakdown of high-risk customer orders, requested vs. estimated delivery dates, and daily liquidated damages penalty exposure.

---

## 3. Executive Operational Dashboard

The Executive Operational Dashboard provides supply chain executives with an immediate visual overview of operational risk and financial exposure across the global manufacturing network.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  TOTAL FINANCIAL EXPOSURE    CRITICAL BOTTLENECK COUNT    ACTIVE DISRUPTIONS │
│        $200,000.00                       3                        1          │
│   (Derived SLA Penalty)          (SUP-001, CMP-001)       (SHP-2026-001 Delay) │
├──────────────────────────────────────┬───────────────────────────────────────┤
│ Active Vulnerability Intersection    │ Platform Infrastructure Health        │
│ Chain:                               │ • PostgreSQL DB: HEALTHY (Latency 2ms)│
│ SUP-001 ➔ PO-2026-001 ➔ SHP-2026-001  │ • Redis Cache: HEALTHY (Hit Rate 98%) │
│ ➔ CMP-001 ➔ PRD-2026-001 ➔ SO-2026-001│ • Engine API: ONLINE (31/31 Tests)   │
└──────────────────────────────────────┴───────────────────────────────────────┘
```

### Key Components
- **Global Metric Cards**: Large numeric callouts featuring dark HSL gradients (`hsl(220, 25%, 10%)`), showing Total Financial Exposure ($), Total Affected Production Units, Active Disruption Vectors, and System Bottleneck Count.
- **Active Intersection Chain Banner**: Highlights the primary vulnerability path (`SUP-001 -> PO-2026-001 -> SHP-2026-001 -> CMP-001 -> PRD-2026-001 -> SO-2026-001`) with pulsating alert badges.
- **Top Financial Exposure Orders Table**: Ranked list of customer orders facing SLA liquidated damages penalties.

---

## 4. Live Platform Health Integration

The application header embeds real-time polling indicators connected to the `/api/v1/health` endpoint:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEALTH STATUS: [● OPERATIONAL]   |   DB: PostgreSQL (Connected)   |   CACHE: Redis (Hit) │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Health State Visual Encoding

| System Component | Status Code | UI Indicator Badge | Color Token | UI Behavior |
| :--- | :---: | :---: | :---: | :--- |
| **Overall Platform** | `healthy` | `● OPERATIONAL` | `#10B981` (Emerald) | All features active. |
| **Overall Platform** | `degraded` | `▲ DEGRADED` | `#F59E0B` (Amber) | Displays banner: *"Redis cache offline; querying PostgreSQL directly."* |
| **Overall Platform** | `unhealthy` | `✖ CRITICAL` | `#EF4444` (Rose) | Displays full-screen modal: *"Database unavailable; engine offline."* |

---

## 5. Interactive Disruption Input Workflow

The Disruption Input Form allows supply chain analysts to submit hypothetical read-only disruption analysis requests:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ SIMULATE OPERATIONAL DISRUPTION                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│ Disruption Identifier: [ DIS-2026-001                        ]               │
│ Target Primitive Type: [ ENTITY                             ▼ ]               │
│ Target Entity ID / Code: [ ENTITY:SUP-001 (Apex Semiconductor) ▼ ]           │
│ Event Category:        [ SUPPLIER_OUTAGE                    ▼ ]               │
│ Disruption Severity:   [ CRITICAL                           ▼ ]               │
│ Reference Timestamp:   [ 2026-08-01T12:00:00Z               📅 ]              │
│ Disruption Duration:   [ 72.0               ] Hours                          │
│                                                                              │
│                        [ RUN IMPACT ANALYSIS ]                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Form Controls & Validation Rules
1. **Target Selector**: Hierarchical dropdown listing active Core Entities (`Suppliers`, `Shipments`, `Production Orders`) and Resources (`Components`).
2. **Reference Timestamp Picker**: Date/time input determining `effective_at` for inventory depletion evaluations.
3. **Duration Slider / Field**: Numerical input constrained to $\ge 0.0$ hours. Rejects negative values via client-side validation prior to API payload submission.

---

## 6. Impact Analysis Workspace

Upon submitting a disruption vector to `POST /api/v1/intelligence/impact-analysis`, the workspace renders a detailed analysis report:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ANALYSIS RESULT: DIS-2026-001                                                │
├───────────────────────────────┬──────────────────────────────────────────────┤
│ Affected Primitives: 6 Nodes  │ Total Derived Exposure: $200,000.00          │
│ Propagation Depth:   6 Levels │ Composite Risk Score:   86.5 / 100 (HIGH)    │
│ Analysis Time:       11.4 ms  │ Engine Checksum:       a7f01bf257...         │
├───────────────────────────────┴──────────────────────────────────────────────┤
│ AFFECTED PRIMITIVE GRAPH NODES                                               │
│ • ENTITY:SUP-001 (Apex Semiconductor) ── Outage Event Disruption Target     │
│ • ENTITY:PO-2026-001 (PO #PO-2026-001) ── Supplier Fulfillment Delayed        │
│ • ENTITY:SHP-2026-001 (TRK-APEX-001)  ── Transit Delayed (ETA Aug 10)         │
│ • RESOURCE:CMP-001 (32-bit MCU)       ── Stockout Predicted (Aug 2, 20:00)   │
│ • ENTITY:PRD-2026-001 (EV Assembly)   ── Production Line Halted (4 Days)    │
│ • ENTITY:SO-2026-001 (Titan Motors)   ── SLA Breach ($50k/day x 4 = $200k)   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Interactive Dependency Graph Visualization

The dependency graph is rendered using an interactive 2D HTML5 canvas/SVG graph renderer:

```
    ┌───────────┐      ┌───────────┐      ┌───────────┐
    │  SUP-001  │ ───► │PO-2026-001│ ───► │SHP-2026-001│
    │ (ENTITY)  │      │ (ENTITY)  │      │ (ENTITY)  │
    └───────────┘      └───────────┘      └─────┬─────┘
                                                │
                                                ▼
    ┌───────────┐      ┌───────────┐      ┌───────────┐
    │SO-2026-001│ ◄─── │PRD-2026-001│ ◄─── │  CMP-001  │
    │ (ENTITY)  │      │ (ENTITY)  │      │(RESOURCE) │
    └───────────┘      └───────────┘      └───────────┘
```

### Visualization Features & Renderer Policy
- **Rendering Technology**: HTML5 Canvas/SVG is the baseline rendering technology. Zero third-party graph visualization frameworks or backend graph databases (`NetworkX`, `Neo4j`) are required.
- **Color-Coded Primitive Nodes**:
  - `ENTITY`: Indigo (`#6366F1`)
  - `RESOURCE`: Emerald (`#10B981`)
  - `EVENT`: Amber (`#F59E0B`)
  - `CONSTRAINT`: Rose (`#EF4444`)
- **Directional Dependency Edges**: Curved arrow lines with edge labels showing `dependency_type` and `lead_time_hours`.

---

## 8. Golden-Path Causal Explanation

The interface provides an explicit step-by-step causal explanation panel tracing root causes directly to financial impacts:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ CAUSAL TRACE: SUP-001 ➔ SO-2026-001                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Step 1] Disruption at Supplier SUP-001 (Apex Semiconductor)                 │
│          └── Delay: 72 Hours Outage Event                                    │
│ [Step 2] Purchase Order PO-2026-001 Delivery Blocked                         │
│          └── Lead Time Impact: +72 Hours                                     │
│ [Step 3] Shipment SHP-2026-001 Transit Delayed                               │
│          └── Carrier: Apex Logistics (ETA delayed to Aug 10)                 │
│ [Step 4] Component CMP-001 Stockout Triggered                                │
│          └── Usable Inventory: 200 Units | Coverage: 1.33 Days (Stockout Aug 2)│
│ [Step 5] Production Order PRD-2026-001 Line Stoppage                         │
│          └── Material Deficit: 300 Units | Stoppage Delay: 4.0 Days          │
│ [Step 6] Customer Order SO-2026-001 SLA Breach                               │
│          └── Delivery Delay: 4 Days | Contract Rate: $50,000/Day             │
│          └── TOTAL DERIVED FINANCIAL EXPOSURE: $200,000.00                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Bottleneck Intelligence Dashboard

The Bottleneck Dashboard aggregates all operational vulnerabilities identified by the engine:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ NETWORK BOTTLENECK INTELLIGENCE                                              │
├────────────────┬─────────────┬──────────┬────────────────────────────────────┤
│ BOTTLENECK ID  │ PRIMITIVE   │ SEVERITY │ TRIGGER CONDITION                  │
├────────────────┼─────────────┼──────────┼────────────────────────────────────┤
│ BOT-SINGLE-MCU │ CMP-001     │ HIGH     │ Single-Sourced Component           │
│ BOT-CAP-SUP01  │ SUP-001     │ HIGH     │ 96.0% Capacity Utilization         │
│ BOT-STOCK-WH01 │ CMP-001     │ CRITICAL │ 1.33 Days Stock Coverage           │
│ BOT-SLA-SO001  │ SO-2026-001 │ CRITICAL │ $50,000/Day Liquidated Damages Rate│
└────────────────┴─────────────┴──────────┴────────────────────────────────────┘
```

---

## 10. Inventory-Risk Dashboard

The Inventory Risk Dashboard exposes real-time coverage days and estimated stockout dates calculated by `GET /api/v1/intelligence/inventory-risk`:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ WAREHOUSE INVENTORY RISK & COVERAGE                                          │
├───────────┬───────────┬─────────┬──────────┬──────────┬──────────┬───────────┤
│ WAREHOUSE │ PART NO.  │ ON-HAND │ RESERVED │ USABLE   │ COVERAGE │ RISK CAT. │
├───────────┼───────────┼─────────┼──────────┼──────────┼──────────┼───────────┤
│ WH-001    │ CMP-001   │ 800     │ 600      │ 200      │ 1.33 Days│ CRITICAL  │
│ WH-001    │ CMP-004   │ 1,200   │ 1,000    │ 200      │ 2.50 Days│ CRITICAL  │
│ WH-002    │ CMP-009   │ 5,000   │ 2,000    │ 3,000    │ 15.0 Days│ HEALTHY   │
└───────────┴───────────┴─────────┴──────────┴──────────┴──────────┴───────────┘
```

---

## 11. Critical-Path Dashboard

Displays all critical dependency chains terminating at customer delivery commitments fetched from `GET /api/v1/intelligence/critical-paths`:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ CRITICAL DEPENDENCY PATHS (MAX DEPTH = 15, MAX PATHS = 100)                  │
├──────────────────────────────────────────────────────┬───────────────────────┤
│ PATH SEQUENCE                                        │ CUMULATIVE LEAD TIME  │
├──────────────────────────────────────────────────────┼───────────────────────┤
│ SUP-001 ➔ PO-2026-001 ➔ SHP-2026-001 ➔ CMP-001 ➔ ... │ 216.0 Hours           │
│ SUP-004 ➔ PO-2026-004 ➔ SHP-2026-004 ➔ CMP-004 ➔ ... │ 144.0 Hours           │
└──────────────────────────────────────────────────────┴───────────────────────┘
```

---

## 12. SLA Exposure & Financial Exposure Visualization

Renders contractual penalty breakdowns for all affected sales orders:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ CUSTOMER ORDER SLA EXPOSURE SUMMARY                                          │
├─────────────┬──────────────┬────────────┬─────────────┬───────────┬──────────┤
│ ORDER NO.   │ CUSTOMER     │ REQ. DATE  │ EST. DATE   │ DELAY     │ EXPOSURE │
├─────────────┼──────────────┼────────────┼─────────────┼───────────┼──────────┤
│ SO-2026-001 │ Titan Motors │ 2026-08-18 │ 2026-08-22  │ 4.0 Days  │ $200,000 │
│ SO-2026-002 │ Apex Auto    │ 2026-08-20 │ 2026-08-21  │ 1.0 Days  │ $25,000  │
└─────────────┴──────────────┴────────────┴─────────────┴───────────┴──────────┘
```

---

## 13. Risk-Score Explanation UI & Breakdown Cards

Visualizes the explainable composite risk score formula $S(v) \in [0, 100]$:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ COMPOSITE RISK SCORE: 86.5 / 100                                             │
├──────────────────────────────────────────────────────────────────────────────┤
│ • Single-Source Factor (25% Weight):        25.0 / 25.0  [██████████████████]│
│ • Supplier Utilization Factor (20% Weight): 19.2 / 20.0  [████████████████░░]│
│ • Stock Coverage Factor (25% Weight):       21.7 / 25.0  [███████████████░░░]│
│ • SLA Penalty Rate Factor (15% Weight):     7.5  / 15.0  [█████████░░░░░░░░░]│
│ • Graph Centrality Factor (15% Weight):     13.1 / 15.0  [██████████████░░░░]│
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 14. Entity Drill-Down Side Drawers

Clicking any primitive node opens a slide-over panel displaying:
- Core primitive properties (`node_id`, `primitive_type`, `business_code`).
- Manufacturing Adapter attributes (`supplier_code`, `part_number`, `reliability_score`).
- Direct incoming and outgoing dependency edges.

---

## 15. API-to-Frontend Contract Design & Resiliency Rules

| Frontend View / Component | Backend API Endpoint | HTTP Method | Data Consumed |
| :--- | :--- | :---: | :--- |
| **Header Health Indicators** | `/api/v1/health` | `GET` | PostgreSQL & Redis connectivity status |
| **Impact Analysis Workspace** | `/api/v1/intelligence/impact-analysis` | `POST` | Disruption report, exposure, causal paths |
| **Graph Viewer** | `/api/v1/intelligence/graph/{type}/{id}` | `GET` | Node properties, incoming/outgoing neighbors |
| **Bottleneck Dashboard** | `/api/v1/intelligence/bottlenecks` | `GET` | Network bottleneck items & severities |
| **Critical Path Viewer** | `/api/v1/intelligence/critical-paths` | `GET` | Critical dependency chains & lead times |
| **Inventory Risk Center** | `/api/v1/intelligence/inventory-risk` | `GET` | Usable stock, coverage days, stockout dates |

### Robustness & Resiliency Rules
1. **Schema Versioning & Compatibility**: Frontend client targets `/api/v1` contracts. Schema changes require explicit version incrementing to guarantee backward compatibility.
2. **Request Timeout Behavior**: HTTP client sets a strict `10.0s` request timeout. If an API request times out, the UI transitions to an error boundary with a manual retry button.
3. **Retry & Backoff Policy**: Transient network errors (HTTP 502/503/504) execute up to 2 exponential backoff retries (1s, 2s) before presenting a degraded UI state.
4. **Stale-Result Handling**: When a new disruption vector form is submitted, existing workspace results are flagged as `STALE_RESULT` until the active request returns.

---

## 16. Loading, Error & Degraded UI States

1. **Loading State**: Shimmering skeleton loaders replace metric cards and tables during API fetches.
2. **Client Validation Errors**: Form inputs highlight invalid fields (e.g. negative duration) in Rose (`#EF4444`) before request dispatch.
3. **API Error State**: Displays user-friendly error card with diagnostic HTTP status code (e.g. `404 Node Not Found`, `422 Validation Error`).

---

## 17. Redis & Database Degradation UI Behavior

- **Redis Offline (Degraded Mode)**: Displays amber warning badge: *"Redis Cache Offline — Intelligence engine running directly against PostgreSQL DB."*
- **PostgreSQL Offline (Unhealthy State)**: Displays rose error overlay: *"Database Connectivity Lost — Platform operational intelligence unavailable."*

---

## 18. Deterministic Result Presentation Guardrails

- **No Speculative Language**: UI headers state *"Derived Operational Metric"* or *"Contractual Input Rate"* to prevent confusion between DB facts and derived projections.
- **Fixed Formatting**: Numbers formatted consistently across all pages (e.g. currency `$200,000.00`, delay `4.0 Days`).

---

## 19. Accessibility, Responsiveness & Design System Tokens

### Design System HSL Color Tokens
- **Background Main**: `hsl(224, 71%, 4%)` (Deep Midnight)
- **Card Glassmorphism**: `hsla(224, 71%, 8%, 0.75)` with `backdrop-filter: blur(12px)`
- **Primary Accent**: `hsl(239, 84%, 67%)` (Indigo Accent)
- **Success / Healthy**: `hsl(160, 84%, 39%)` (Emerald Green)
- **Warning / Degraded**: `hsl(38, 92%, 50%)` (Amber Gold)
- **Danger / Critical**: `hsl(350, 89%, 60%)` (Rose Red)

### Responsiveness & WCAG Compliance
- Fluid flexbox/grid layout supporting viewports from 1280px desktop down to 768px tablet.
- Minimum contrast ratio of 4.5:1 for all text labels against dark backgrounds.

---

## 20. Security & Governance Boundaries

> [!IMPORTANT]
> **Read-Only Security Boundary**:
> The UI may contain forms and controls for submitting hypothetical read-only analysis requests, but contains **zero controls capable of executing INSERT, UPDATE, DELETE, operational state mutation, or autonomous recovery actions**.
>
> - **Analysis Request Submission**: **ALLOWED** (Read-Only)
> - **Operational State Mutation**: **PROHIBITED**
> - **Autonomous Action Execution**: **PROHIBITED**

---

## 21. Frontend Performance & Latency Budgets

- **Initial Static Asset Load**: $< 1.5$ seconds over standard broadband.
- **Frontend DOM Rendering Budget**: $< 100$ ms from HTTP response receipt to DOM update. *(Note: This is a frontend client DOM rendering budget and is NOT an API/network latency SLA. The backend Phase 2.3 intelligence engine delivers an empirical average execution latency of 60.72 ms).*

---

## 22. Frontend Testing Strategy (Specification Only)

Future Phase 2.4 frontend testing will include:
1. **Component Unit Tests**: Vitest / React Testing Library tests for form controls, metric cards, and risk badges.
2. **Visual Regression Tests**: Storybook visual diff assertions for dark-mode components.

---

## 23. End-to-End Testing Strategy & Dynamic Exposure Contract

Future E2E automation (Playwright) will execute the full end-to-end user flow:
1. Navigate to `/impact-workspace`.
2. Select target `ENTITY:SUP-001` (Apex Semiconductor).
3. Input disruption duration `200.0` hours and submit read-only analysis request.
4. Assert engine dynamically derives 4 days of delivery delay and calculates financial exposure matching the **$200,000.00** validation benchmark target ($\text{financial\_exposure} = \text{derived\_sla\_delay\_days} \times \text{liquidated\_damages\_per\_day}$).
5. Assert causal path renders `SUP-001 -> PO-2026-001 -> SHP-2026-001 -> CMP-001 -> PRD-2026-001 -> SO-2026-001`.

---

## 24. Demo & Winning-Flow Interactive Scenario Design

The primary product demonstration flow highlights the core NEXUS value proposition:

1. **Step 1: Executive Dashboard Baseline**: Show baseline state (Demo baseline prior to submitting a hypothetical disruption analysis).
2. **Step 2: Disruption Event Input**: Submit a hypothetical read-only disruption analysis request (200-hour transit delay simulation on `SHP-2026-001`, carrying single-sourced MCU `CMP-001`).
3. **Step 3: Graph Propagation**: Watch the dynamic graph animate downstream propagation from shipment to warehouse, component stockout, production line stoppage, and customer SLA breach.
4. **Step 4: Financial Exposure & Causal Path**: View the derived **$200,000.00** SLA liquidated damages exposure (derived from 4 days delay $\times$ $50,000/day contract rate) and inspect the step-by-step causal explanation trace.

---

## 25. Phase 3 Readiness & Sense-Understand-Predict Boundary

Phase 2.4 completes the **UNDERSTAND & PREDICT** visualization foundation. It prepares NEXUS for Phase 3:
- **Sense**: Real-time disruption monitoring.
- **Decide**: Autonomous recovery option generation.
- **Act**: Tool-mediated execution of recovery plans.

---

## 26. Architectural Review & Proposed Architectural Decision Records (ADRs)

### Architectural Review
Evaluated against `AGENTS.md`, `ARCHITECTURE.md`, `DOMAIN_MODEL.md`, `DECISIONS.md`, and `PHASE_2_3_OPERATIONAL_INTELLIGENCE_DESIGN.md`. 100% compliant.

### Proposed Architectural Decision Records

#### Proposed ADR-013: Frontend API Contract & Read-Only State Architecture
- **Context**: Need to connect frontend product UI to Phase 2.3 REST API without creating state mutation vulnerabilities.
- **Decision**: Implement a pure read-only client state model where all UI views consume FastAPI `/api/v1/intelligence/*` endpoints without persisting transient state or issuing mutation queries.
- **Consequences**: Complete read-only safety, predictable data flow, zero state drift.

#### Proposed ADR-014: Interactive Node-Edge Graph Renderer Policy
- **Context**: Need to render operational dependency graphs smoothly in the web browser.
- **Decision**: Use HTML5 Canvas / SVG as the baseline frontend rendering technology. No external graph visualization framework is required, and no `NetworkX`, `Neo4j`, or backend graph dependencies may be introduced.
- **Consequences**: 60 FPS pan/zoom performance, zero third-party framework overhead, strict dependency discipline.

---

## 27. Implementation Boundary Statement

> [!IMPORTANT]
> **Phase 2.4 Scope Boundary**:
> This document (`docs/PHASE_2_4_OPERATIONAL_INTELLIGENCE_PRODUCT_DESIGN.md`) represents the complete design specification for Phase 2.4.
> **No application code, frontend components, TypeScript/JavaScript scripts, SQL migrations, database models, or REST API endpoints have been created or modified in this design step.**
