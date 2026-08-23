# Governance, Autonomy & Multi-Objective Policy Specification

## 1. Governed Autonomy Model (Levels 0 to 3)

NEXUS enforces a structured **Governed Autonomy Hierarchy**. Autonomy is not binary; it is scoped dynamically based on action risk, financial threshold, operational criticality, and configured system permission levels.

```
┌────────────────────────────────────────────────────────┐
│                   LEVEL 3: EXECUTE                     │
│  Autonomous dispatch of low-risk, pre-approved actions  │
├────────────────────────────────────────────────────────┤
│                   LEVEL 2: PREPARE                     │
│  Stage actions, draft POs, pre-reserve inventory       │
├────────────────────────────────────────────────────────┤
│                  LEVEL 1: RECOMMEND                    │
│  Generate ranked strategies & trade-off briefings      │
├────────────────────────────────────────────────────────┤
│                   LEVEL 0: OBSERVE                     │
│  Passive ingestion, logging & disruption monitoring    │
└────────────────────────────────────────────────────────┘
```

### Level Definitions & Boundaries

1. **LEVEL 0 (Observe)**:
   - System passively ingests telemetry, builds Digital Twin models, and detects disruptions.
   - Zero active recommendations or external communications dispatched.

2. **LEVEL 1 (Recommend)**:
   - System investigates root causes, runs scenario simulations, and presents ranked recovery plans to operators.
   - Requires human selection and manual execution of all recovery steps.

3. **LEVEL 2 (Prepare)**:
   - System automatically drafts purchase orders, issues soft inventory reservations, and dispatches RFQ inquiries.
   - Final binding execution requires explicit one-click operator sign-off.

4. **LEVEL 3 (Execute)**:
   - System autonomously dispatches binding execution commands for actions falling strictly within pre-authorized policy parameters (e.g., cost < $10,000, certified supplier).
   - Escalates to Human Approval if thresholds are exceeded.

---

## 2. Policy Action Classification Engine

Proposed actions are passed through a deterministic Policy Engine that classifies each action into one of three outcome states:

```
                      ┌──────────────────────┐
                      │  Proposed Action Payload │
                      └──────────┬───────────┘
                                 │
                                 ▼
                      ┌──────────────────────┐
                      │ Deterministic Policy │
                      │ Evaluation Rules     │
                      └──────────┬───────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            ▼                    ▼                    ▼
     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
     │    AUTO     │     │   APPROVAL   │     │   BLOCKED   │
     │ (Autonomous)│     │   REQUIRED   │     │(Prohibited) │
     └─────────────┘     └──────────────┘     └─────────────┘
```

### Classification Rules

1. `AUTO`:
   - Action risk is LOW.
   - Cost is below the `MAX_AUTO_APPROVAL_COST_USD` threshold (e.g., $\le \$10,000$).
   - Target vendor is Tier-1 certified.
   - System configured to Autonomy Level 3.

2. `APPROVAL_REQUIRED`:
   - Financial commitment exceeds auto-approval limits ($> \$10,000$).
   - Action involves an uncertified backup supplier.
   - Action involves a premium air freight expenditure exceeding budget variance allowances.
   - High customer impact or contract SLA penalty risk.

3. `BLOCKED`:
   - Violates regulatory compliance or safety policies.
   - Exceeds maximum corporate single-incident spend ceiling (e.g., $> \$250,000$).
   - Tries to issue actions against blacklisted or sanctioned entities.

---

## 3. Human Approval & Escalation Matrix

When an action is classified as `APPROVAL_REQUIRED`, the Human Approval System routes the decision package based on financial exposure and risk severity:

| Financial Exposure (USD) | Risk / SLA Impact | Required Approval Role | Timeout SLA | Default Fallback Action |
| :--- | :--- | :--- | :--- | :--- |
| **$\$0 - \$10,000$** | Low / Minor | Operations Specialist | 4 Hours | Auto-Execute if Level 3 |
| **$\$10,001 - \$50,000$** | Medium / Line Risk | Supply Chain Manager | 2 Hours | Stage Backup RFQ |
| **$\$50,001 - \$250,000$** | High / Customer SLA | VP of Operations | 1 Hour | Notify Executive On-Call |
| **$> \$250,000$** | Critical / Plant Stop | Chief Operating Officer | 30 Mins | Re-route to Safety Idle |

---

## 4. Multi-Objective Recovery Optimization

When evaluating candidate recovery plans, the Multi-Objective Optimizer uses a **deterministic scoring function** evaluating 8 objective vectors:

$$\text{Score}(P) = w_1 \cdot \text{Cont}(P) - w_2 \cdot \text{Cost}(P) - w_3 \cdot \text{LeadTime}(P) + w_4 \cdot \text{Qual}(P) + w_5 \cdot \text{Rel}(P) - w_6 \cdot \text{CustImp}(P) - w_7 \cdot \text{Risk}(P) - w_8 \cdot \text{ApprPen}(P)$$

```
                      Multi-Objective Optimization Vector
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Production Continuity (Minimize downtime hours)                           │
│ 2. Financial Cost (Minimize expedited freight + component unit cost)        │
│ 3. Lead Time (Minimize total replenishment hours)                            │
│ 4. Component Quality Rating (Maximize certified defect-free rate)          │
│ 5. Supplier Reliability Index (Maximize historical fulfillment score)        │
│ 6. Customer Impact (Minimize SLA breach severity)                           │
│ 7. Residual Risk (Minimize uncertainty propagation)                          │
│ 8. Approval Constraint Overhead (Prefer lower governance friction)           │
└─────────────────────────────────────────────────────────────────────────────┘
```

The optimizer generates a **Pareto Frontier** of non-dominated candidate plans, allowing the Decision Agent or Human Operator to select the optimal trade-off point.
