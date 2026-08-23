# AGENTS.md - NEXUS Development Rules & Architecture Constraints

This document defines the strict engineering guidelines, architectural constraints, and operational rules for developing the **NEXUS Autonomous Disruption Control Platform**. All AI agents and human contributors must strictly follow these rules during all development phases.

---

## Mandated Engineering Rules

1. **Phase-by-Phase Progression**: NEXUS is built strictly phase-by-phase. Do not jump ahead to future phases.
2. **Explicit Instruction Only**: Never implement future phases unless explicitly instructed by the Lead Engineer/User.
3. **Architecture Preservation**: Never silently redesign the architecture. Architectural modifications require an explicit ADR update in `docs/DECISIONS.md`.
4. **Minimal Refactoring**: Do not rewrite working functionality unnecessarily. Preserve working logic and stable APIs.
5. **Dependency Discipline**: Avoid unnecessary dependencies. Use lightweight, standard, well-maintained libraries.
6. **No Direct AI State Mutations**: AI must not directly mutate operational state or database records.
7. **Tool-Mediated State Changes**: State-changing operations must go through controlled, validated services/tools.
8. **Mandatory Auditability**: Important system actions, tool calls, and state mutations must be completely auditable.
9. **Structured Schemas for AI Outputs**: AI outputs must use strict, explicit structured schemas (e.g., Pydantic models).
10. **Deterministic Business Logic**: Business calculations (financials, coverage, lead times, inventory) must be 100% deterministic.
11. **Deterministic Optimization**: Recovery optimization algorithms must produce deterministic, reproducible results given the same input and seed.
12. **Deterministic Policy Validation**: Policy evaluation and compliance checks must be entirely rule-based and deterministic.
13. **Reproducible Simulation**: Digital Twin scenario simulations must be reproducible and enforce configurable random seeds.
14. **Test-Driven Rigor**: Every implemented feature requires corresponding automated unit or integration tests.
15. **No Broken Builds**: Do not move forward with failing tests or unhandled build errors.
16. **No Mock Vanity Features**: Do not create fake functionality or hardcoded mock components merely for visual appearance.
17. **Domain-Agnostic Core**: Do not hard-code domain-specific assumptions (e.g., POs, BOMs, shipments) into the NEXUS Core.
18. **Domain Adapter Scoping**: Domain-specific behaviors, entities, and mappings belong strictly inside Domain Adapters.
19. **Simplicity First**: Prefer simple, maintainable, modular architecture over unnecessary complexity.
20. **Document Architectural Decisions**: Document all major design choices in `docs/DECISIONS.md`.
21. **API Contract Stability**: Preserve API contracts once established, unless explicitly versioned or breaking changes are documented.
22. **Schema Validation of External Inputs**: Validate all external, third-party, and LLM-generated outputs before consuming them.
23. **Graceful Degraded Mode**: Fail safely when an AI provider or external tool call is unavailable.
24. **Secret Protection**: Never expose API keys, credentials, or secrets in source code.
25. **Git Hygiene for Credentials**: Never commit `.env` or credential files to source control.
