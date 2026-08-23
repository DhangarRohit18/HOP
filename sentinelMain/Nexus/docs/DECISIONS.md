# Architectural Decision Records (ADR Log)

This log records the foundational architectural decisions established in **Phase 0** of the **NEXUS Platform**.

---

## ADR-001: Phase-by-Phase Modular Development Strategy

* **Status**: APPROVED
* **Date**: 2026-08-22
* **Context**: Complex autonomous control systems often fail when built as monolithic implementations without strict contracts.
* **Decision**: NEXUS development will proceed strictly phase-by-phase (Phases 0 through 10). No phase may begin until the preceding phase is completed, tested, and validated.
* **Consequences**: Ensures structural integrity, eliminates premature optimization, and prevents scope creep.

---

## ADR-002: Strict Separation of AI Reasoning and Deterministic Control

* **Status**: APPROVED
* **Date**: 2026-08-22
* **Context**: LLMs excel at parsing unstructured context and generating candidate hypotheses, but suffer from non-determinism, hallucination risk, and math inaccuracy.
* **Decision**: All financial calculations, inventory counts, time-to-failure calculations, policy evaluations, simulations, and database state mutations must be 100% deterministic code. LLMs are restricted to parsing, hypothesis generation, drafting plans, and explaining trade-offs.
* **Consequences**: Guarantees system safety, financial precision, and regulatory compliance while retaining advanced AI reasoning capability.

---

## ADR-003: Domain-Agnostic Core with Pluggable Domain Adapters

* **Status**: APPROVED
* **Date**: 2026-08-22
* **Context**: Coupling the core reasoning engine to specific domain concepts (e.g., Purchase Orders or Bill of Materials) limits reusability across future domains like Logistics, Aviation, or Energy.
* **Decision**: NEXUS Core will operate exclusively on universal primitives (`ENTITY`, `RESOURCE`, `EVENT`, `CONSTRAINT`, `ACTION`, `METRIC`, `DEPENDENCY`). All domain-specific concepts belong inside Domain Adapters (e.g., `domain_adapters/manufacturing/`).
* **Consequences**: Enables expanding NEXUS to new industries without modifying the core reasoning engine.

---

## ADR-004: Closed-Loop Verification and Dynamic Self-Healing Replanning

* **Status**: APPROVED
* **Date**: 2026-08-22
* **Context**: Open-loop systems execute commands and assume success. Real-world physical operations frequently experience execution delays, carrier failures, or partial order fulfillments.
* **Decision**: NEXUS enforces closed-loop execution. Every dispatched action is followed by telemetry verification against target state goals. If divergence is detected, the Self-Healing Replanning Engine automatically re-simulates and updates recovery plans.
* **Consequences**: Creates a resilient, self-correcting operational control platform.

---

## ADR-005: Governed Autonomy Matrix and Human-in-the-Loop Escalation

* **Status**: APPROVED
* **Date**: 2026-08-22
* **Context**: Fully autonomous AI execution presents financial, legal, and operational risks if high-cost or high-risk actions execute without oversight.
* **Decision**: All candidate actions are passed through a deterministic Policy Engine enforcing Autonomy Levels 0 to 3. Actions exceeding pre-set financial thresholds ($\$10,000+$) or involving uncertified suppliers require explicit human approval via an escalation matrix.
* **Consequences**: Maintains executive governance and risk control while allowing rapid automated handling of low-risk operational issues.

---

## ADR-006: Reproducible Digital Twin Scenario Simulation Architecture

* **Status**: APPROVED
* **Date**: 2026-08-22
* **Context**: Evaluating recovery strategies directly in live environments can cause catastrophic disruption.
* **Decision**: Recovery strategies must be simulated on counterfactual Copy-on-Write Digital Twin state forks before execution. Simulations must be deterministic and require an explicit random seed parameter (`seed`) for full reproducibility.
* **Consequences**: Ensures candidate strategies are proven safe and effective prior to live dispatch.

---

## ADR-007: Mandatory Audit Lineage and Cryptographic Execution Logs

* **Status**: APPROVED
* **Date**: 2026-08-22
* **Context**: Enterprise compliance requires full transparency into why decisions were made, what evidence was evaluated, and who authorized execution.
* **Decision**: Every event, evidence evaluation, agent thought trajectory, tool call, policy gate result, operator sign-off, and ERP mutation must be recorded in an immutable, cryptographically verifiable audit trail.
* **Consequences**: Facilitates post-incident replay, forensic analysis, regulatory auditing, and continuous machine learning.
