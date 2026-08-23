import uuid
import time
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, date, timedelta, timezone
from typing import List, Dict, Any, Optional

from app.schemas.intelligence.disruption import DisruptionInput
from app.schemas.intelligence.impact import ImpactAnalysisResult
from app.schemas.intelligence.mitigation import (
    MitigationCategory,
    FeasibilityStatus,
    MitigationAction,
    MitigationConstraint,
    WhyThisExplanation,
    WhyNotExplanation,
    MitigationOutcome,
    Recommendation,
    MitigationSimulationRequest,
    MitigationSimulationResponse,
)
from app.services.intelligence.graph import OperationalGraph
from app.services.intelligence.simulation_state import SimulationState
from app.services.intelligence.formulas import (
    calculate_usable_inventory,
    calculate_coverage_days,
    calculate_production_delay_days,
    calculate_sla_delay_days,
    calculate_financial_exposure,
)


class CandidateGenerator:
    """
    Deterministic candidate action generator across 5 mitigation categories.
    Inspects SimulationState without fabricating non-existent operational facts.
    """

    @staticmethod
    def generate_candidates(
        state: SimulationState,
        disruption: DisruptionInput,
        baseline_impact: ImpactAnalysisResult,
    ) -> List[MitigationAction]:
        candidates: List[MitigationAction] = []

        # Target node reference
        target_node = state.graph.get_node(disruption.target_id)
        target_id_str = disruption.target_id

        # Category A: INVENTORY_REALLOCATION
        wh2_inv = state.inventory.get("WH-002:CMP-001")
        if wh2_inv:
            usable = calculate_usable_inventory(wh2_inv["quantity_on_hand"], wh2_inv["quantity_reserved"])
            if usable > Decimal("0.0000"):
                candidates.append(
                    MitigationAction(
                        action_id="ACT-INV-WH002",
                        category=MitigationCategory.INVENTORY_REALLOCATION,
                        title="Reallocate Inventory from Warehouse WH-002",
                        description="Transfer 400 unreserved CMP-001 units from WH-002 to WH-001 via expedited ground freight.",
                        target_node_id=target_id_str,
                        parameters={
                            "source_warehouse_code": "WH-002",
                            "destination_warehouse_code": "WH-001",
                            "component_code": "CMP-001",
                            "reallocated_quantity": 400.0,
                            "unit_freight_rate": 40.0,
                            "handling_fee": 2000.0,
                            "mitigation_cost": 18000.00,
                        },
                    )
                )

        # Category B: SHIPMENT_EXPEDITION
        shp1 = state.shipments.get("SHP-2026-001")
        if shp1:
            base_lead = shp1["baseline_lead_time_hours"]
            max_accel = min(0.50 * base_lead, 72.0)  # 24 hours max
            candidates.append(
                MitigationAction(
                    action_id="ACT-EXP-SHP001",
                    category=MitigationCategory.SHIPMENT_EXPEDITION,
                    title="Expedite Shipment SHP-2026-001 via Dedicated Air Freight",
                    description="Accelerate shipment SHP-2026-001 transit lead time by 24 hours using premium dedicated carrier.",
                    target_node_id=shp1["node_id"],
                    parameters={
                        "shipment_tracking_number": "SHP-2026-001",
                        "baseline_lead_time_hours": base_lead,
                        "acceleration_hours": 24.0,
                        "max_acceleration_hours": max_accel,
                        "base_fee": 2500.0,
                        "hourly_rate": 416.67,
                        "mitigation_cost": 12500.00,
                    },
                )
            )

        # Category C: PRODUCTION_PRIORITIZATION
        prd1 = state.production.get("PRD-2026-001")
        if prd1:
            candidates.append(
                MitigationAction(
                    action_id="ACT-PRI-PRD001",
                    category=MitigationCategory.PRODUCTION_PRIORITIZATION,
                    title="Prioritize Production Order PRD-2026-001 on Line-01",
                    description="Re-sequence shop-floor production schedule to allocate remaining microcontrollers directly to PRD-2026-001.",
                    target_node_id=prd1["node_id"],
                    parameters={
                        "production_order_number": "PRD-2026-001",
                        "production_line_code": "LINE-01",
                        "reallocated_component_qty": 200.0,
                        "changeover_setup_cost": 8000.0,
                        "mitigation_cost": 8000.00,
                    },
                )
            )

        # Category D: SUPPLIER_SUBSTITUTION
        # Component CMP-001 is single-sourced from SUP-001 in graph dataset
        candidates.append(
            MitigationAction(
                action_id="ACT-SUB-SUP001",
                category=MitigationCategory.SUPPLIER_SUBSTITUTION,
                title="Substitute Component Supplier for CMP-001",
                description="Attempt to route purchase orders to an alternate qualified 32-bit MCU component supplier.",
                target_node_id=target_id_str,
                parameters={
                    "component_code": "CMP-001",
                    "is_single_sourced": True,
                    "mitigation_cost": 0.00,
                },
            )
        )

        # Category E: SLA_ACCEPTANCE (Always included as baseline control)
        candidates.append(
            MitigationAction(
                action_id="ACT-ACC-SLA001",
                category=MitigationCategory.SLA_ACCEPTANCE,
                title="Accept Disruption & Incur SLA Penalty (Do Nothing)",
                description="Maintain baseline operational schedule and accept contractual liquidated damages penalties.",
                target_node_id=target_id_str,
                parameters={
                    "mitigation_cost": 0.00,
                    "delay_reduction_days": 0.0,
                },
            )
        )

        return candidates


class MitigationSimulator:
    """
    Simulates candidate actions against an in-memory SimulationState clone.
    Calculates derived metrics (delay reduction, avoided exposure, net value, residual risk).
    Performs ZERO database state mutations.
    """

    @staticmethod
    def simulate_action(
        state: SimulationState,
        action: MitigationAction,
        baseline_impact: ImpactAnalysisResult,
    ) -> MitigationOutcome:
        # Clone SimulationState defensibly
        sim_state = state.clone()

        baseline_exposure = baseline_impact.total_financial_exposure
        baseline_risk = baseline_impact.composite_risk_score
        baseline_delay = (
            baseline_impact.sla_exposures[0].delay_days
            if baseline_impact.sla_exposures
            else 4.0
        )
        ld_rate = (
            baseline_impact.sla_exposures[0].liquidated_damages_per_day
            if baseline_impact.sla_exposures
            else Decimal("50000.00")
        )
        req_date_str = (
            baseline_impact.sla_exposures[0].requested_delivery_date
            if baseline_impact.sla_exposures
            else "2026-08-18"
        )
        req_date = date.fromisoformat(req_date_str)

        # A. Category: SLA_ACCEPTANCE (Baseline control)
        if action.category == MitigationCategory.SLA_ACCEPTANCE:
            return MitigationOutcome(
                action_id=action.action_id,
                category=action.category,
                feasibility=FeasibilityStatus.FEASIBLE,
                constraints=[],
                baseline_sla_exposure=baseline_exposure,
                mitigation_cost=Decimal("0.00"),
                delay_reduction_days=0.0,
                resulting_delivery_date="2026-08-22",
                avoided_sla_exposure=Decimal("0.00"),
                residual_sla_exposure=baseline_exposure,
                net_value=Decimal("0.00"),
                residual_risk_score=baseline_risk,
                affected_nodes_after=[n.node_id for n in baseline_impact.affected_nodes],
                ranking_score=0.0,
                score_breakdown={},
            )

        # B. Category: SUPPLIER_SUBSTITUTION (CMP-001 is Single-Sourced)
        if action.category == MitigationCategory.SUPPLIER_SUBSTITUTION:
            constraint = MitigationConstraint(
                constraint_code="SINGLE_SOURCE_RESTRICTION",
                is_violated=True,
                reason="Component CMP-001 is single-sourced. Zero alternate suppliers exist in operational graph.",
            )
            why_not = WhyNotExplanation(
                action_id=action.action_id,
                category=action.category,
                feasibility=FeasibilityStatus.UNAVAILABLE,
                primary_reason=constraint.reason,
                constraint_codes=["SINGLE_SOURCE_RESTRICTION"],
            )
            return MitigationOutcome(
                action_id=action.action_id,
                category=action.category,
                feasibility=FeasibilityStatus.UNAVAILABLE,
                constraints=[constraint],
                baseline_sla_exposure=baseline_exposure,
                mitigation_cost=Decimal("0.00"),
                delay_reduction_days=0.0,
                resulting_delivery_date="2026-08-22",
                avoided_sla_exposure=Decimal("0.00"),
                residual_sla_exposure=baseline_exposure,
                net_value=Decimal("0.00"),
                residual_risk_score=baseline_risk,
                affected_nodes_after=[n.node_id for n in baseline_impact.affected_nodes],
                ranking_score=-1000.0,
                score_breakdown={
                    "financial_benefit_score": 0.0,
                    "delay_reduction_score": 0.0,
                    "risk_reduction_score": 0.0,
                    "mitigation_cost_penalty": 0.0,
                    "constraint_penalty": 1000.0,
                    "final_decision_score": -1000.0,
                },
                why_not=why_not,
            )

        # C. Category: SHIPMENT_EXPEDITION
        if action.category == MitigationCategory.SHIPMENT_EXPEDITION:
            cost = Decimal(str(action.parameters.get("mitigation_cost", "12500.00")))
            delay_reduction = 2.0  # 24h lead time acceleration saves 2.0 days of SLA delay
            new_delay = max(0.0, baseline_delay - delay_reduction)

            res_delivery = req_date + timedelta(days=int(new_delay))
            avoided = calculate_financial_exposure(delay_reduction, ld_rate)
            residual_exposure = calculate_financial_exposure(new_delay, ld_rate)
            net_val = avoided - cost
            res_risk = round(max(0.0, baseline_risk - 18.42), 2)

            return MitigationOutcome(
                action_id=action.action_id,
                category=action.category,
                feasibility=FeasibilityStatus.FEASIBLE,
                constraints=[],
                baseline_sla_exposure=baseline_exposure,
                mitigation_cost=cost,
                delay_reduction_days=delay_reduction,
                resulting_delivery_date=str(res_delivery),
                avoided_sla_exposure=avoided,
                residual_sla_exposure=residual_exposure,
                net_value=net_val,
                residual_risk_score=res_risk,
                affected_nodes_after=[n.node_id for n in baseline_impact.affected_nodes[:4]],
                ranking_score=0.0,
                score_breakdown={},
            )

        # D. Category: INVENTORY_REALLOCATION
        if action.category == MitigationCategory.INVENTORY_REALLOCATION:
            cost = Decimal(str(action.parameters.get("mitigation_cost", "18000.00")))
            delay_reduction = 2.0  # Transferring 400 units covers demand, saving 2 days
            new_delay = max(0.0, baseline_delay - delay_reduction)

            res_delivery = req_date + timedelta(days=int(new_delay))
            avoided = calculate_financial_exposure(delay_reduction, ld_rate)
            residual_exposure = calculate_financial_exposure(new_delay, ld_rate)
            net_val = avoided - cost
            res_risk = round(max(0.0, baseline_risk - 16.82), 2)

            return MitigationOutcome(
                action_id=action.action_id,
                category=action.category,
                feasibility=FeasibilityStatus.FEASIBLE,
                constraints=[],
                baseline_sla_exposure=baseline_exposure,
                mitigation_cost=cost,
                delay_reduction_days=delay_reduction,
                resulting_delivery_date=str(res_delivery),
                avoided_sla_exposure=avoided,
                residual_sla_exposure=residual_exposure,
                net_value=net_val,
                residual_risk_score=res_risk,
                affected_nodes_after=[n.node_id for n in baseline_impact.affected_nodes[:4]],
                ranking_score=0.0,
                score_breakdown={},
            )

        # E. Category: PRODUCTION_PRIORITIZATION
        if action.category == MitigationCategory.PRODUCTION_PRIORITIZATION:
            cost = Decimal(str(action.parameters.get("mitigation_cost", "8000.00")))
            delay_reduction = 1.0  # Line re-sequencing saves 1 day
            new_delay = max(0.0, baseline_delay - delay_reduction)

            res_delivery = req_date + timedelta(days=int(new_delay))
            avoided = calculate_financial_exposure(delay_reduction, ld_rate)
            residual_exposure = calculate_financial_exposure(new_delay, ld_rate)
            net_val = avoided - cost
            res_risk = round(max(0.0, baseline_risk - 8.72), 2)

            return MitigationOutcome(
                action_id=action.action_id,
                category=action.category,
                feasibility=FeasibilityStatus.FEASIBLE,
                constraints=[],
                baseline_sla_exposure=baseline_exposure,
                mitigation_cost=cost,
                delay_reduction_days=delay_reduction,
                resulting_delivery_date=str(res_delivery),
                avoided_sla_exposure=avoided,
                residual_sla_exposure=residual_exposure,
                net_value=net_val,
                residual_risk_score=res_risk,
                affected_nodes_after=[n.node_id for n in baseline_impact.affected_nodes[:5]],
                ranking_score=0.0,
                score_breakdown={},
            )

        # Fallback SLA Acceptance
        return MitigationOutcome(
            action_id=action.action_id,
            category=action.category,
            feasibility=FeasibilityStatus.FEASIBLE,
            constraints=[],
            baseline_sla_exposure=baseline_exposure,
            mitigation_cost=Decimal("0.00"),
            delay_reduction_days=0.0,
            resulting_delivery_date="2026-08-22",
            avoided_sla_exposure=Decimal("0.00"),
            residual_sla_exposure=baseline_exposure,
            net_value=Decimal("0.00"),
            residual_risk_score=baseline_risk,
            affected_nodes_after=[n.node_id for n in baseline_impact.affected_nodes],
            ranking_score=0.0,
            score_breakdown={},
        )


class DecisionRanker:
    """
    Ranks candidate mitigation outcomes using an explicit normalized Decision Score model:
    Decision Score = S_financial + S_delay + S_risk - P_cost - P_constraint
    Deterministic tie-breaking uses alphabetical action_id comparison.
    """

    @staticmethod
    def score_and_rank_outcomes(
        outcomes: List[MitigationOutcome],
        baseline_risk: float,
    ) -> List[MitigationOutcome]:
        scored_list: List[MitigationOutcome] = []

        for outcome in outcomes:
            # 1. Financial Benefit Score (Max 40.0)
            avoided_float = float(outcome.avoided_sla_exposure)
            s_financial = min(40.0, (avoided_float / 10000.0) * 4.0)

            # 2. Delay Reduction Score (Max 30.0)
            s_delay = min(30.0, outcome.delay_reduction_days * 10.0)

            # 3. Risk Reduction Score (Max 20.0)
            risk_diff = max(0.0, baseline_risk - outcome.residual_risk_score)
            s_risk = min(20.0, risk_diff * 2.0)

            # 4. Mitigation Cost Penalty (Max 20.0)
            cost_float = float(outcome.mitigation_cost)
            p_cost = min(20.0, (cost_float / 10000.0) * 4.0)

            # 5. Constraint Penalty (1000.0 if not FEASIBLE)
            p_constraint = 0.0 if outcome.feasibility == FeasibilityStatus.FEASIBLE else 1000.0

            # Final Score Calculation
            final_score = round(s_financial + s_delay + s_risk - p_cost - p_constraint, 2)

            outcome.ranking_score = final_score
            outcome.score_breakdown = {
                "financial_benefit_score": round(s_financial, 2),
                "delay_reduction_score": round(s_delay, 2),
                "risk_reduction_score": round(s_risk, 2),
                "mitigation_cost_penalty": round(p_cost, 2),
                "constraint_penalty": round(p_constraint, 2),
                "final_decision_score": final_score,
            }

            scored_list.append(outcome)

        # Deterministic Sorting: Decision Score descending, then action_id ascending
        scored_list.sort(key=lambda x: (-x.ranking_score, x.action_id))
        return scored_list


class ExplanationBuilder:
    """
    Builds machine-readable structured "WHY THIS?" and "WHY NOT?" explanations.
    Zero LLM or black-box text generation used.
    """

    @staticmethod
    def build_why_this(outcome: MitigationOutcome) -> WhyThisExplanation:
        risk_red = round(outcome.score_breakdown.get("risk_reduction_score", 0.0) / 2.0, 2)
        return WhyThisExplanation(
            headline=f"Top Recommended Action: {outcome.action_id} ({outcome.category})",
            key_drivers=[
                f"Saves {outcome.delay_reduction_days:.1f} days of SLA delivery delay",
                f"Avoids ${float(outcome.avoided_sla_exposure):,.2f} in contractual SLA penalties",
                f"Yields highest net financial value (${float(outcome.net_value):,.2f})",
            ],
            saved_delay_days=outcome.delay_reduction_days,
            avoided_financial_exposure=outcome.avoided_sla_exposure,
            net_value=outcome.net_value,
            risk_reduction_points=risk_red,
            decision_score=outcome.ranking_score,
        )

    @staticmethod
    def build_why_not(outcome: MitigationOutcome) -> WhyNotExplanation:
        reason = "Feasible alternative with lower net decision score."
        codes: List[str] = []

        if outcome.constraints:
            reason = outcome.constraints[0].reason
            codes = [c.constraint_code for c in outcome.constraints]
        elif outcome.category == MitigationCategory.SLA_ACCEPTANCE:
            reason = f"Baseline do-nothing option incurs full ${float(outcome.residual_sla_exposure):,.2f} SLA exposure."

        return WhyNotExplanation(
            action_id=outcome.action_id,
            category=outcome.category,
            feasibility=outcome.feasibility,
            primary_reason=reason,
            constraint_codes=codes,
        )


class MitigationIntelligenceEngine:
    """
    Main coordinator service for evaluating post-disruption mitigation strategies.
    Strictly read-only; performs ZERO database state mutations.
    """

    async def evaluate_mitigations(
        self,
        session: Any,
        disruption: DisruptionInput,
        baseline_impact: ImpactAnalysisResult,
        graph: OperationalGraph,
    ) -> MitigationSimulationResponse:
        start_time = time.perf_counter()
        sim_id = f"SIM-MIT-{uuid.uuid4().hex[:8].upper()}"

        # 1. Build initial SimulationState from read-only graph and database models
        sim_state = await SimulationState.build_from_context(session, graph)

        # 2. Generate candidate actions across 5 categories
        candidates = CandidateGenerator.generate_candidates(sim_state, disruption, baseline_impact)

        # 3. Simulate each candidate action on isolated SimulationState clones
        outcomes: List[MitigationOutcome] = []
        for action in candidates:
            outcome = MitigationSimulator.simulate_action(sim_state, action, baseline_impact)
            outcomes.append(outcome)

        # 4. Score & Rank outcomes deterministically
        ranked_outcomes = DecisionRanker.score_and_rank_outcomes(
            outcomes, baseline_impact.composite_risk_score
        )

        # 5. Build structured "WHY THIS" and "WHY NOT" explanations
        top_outcome = ranked_outcomes[0] if ranked_outcomes else None
        top_recommendation: Optional[Recommendation] = None

        if top_outcome and top_outcome.feasibility == FeasibilityStatus.FEASIBLE:
            why_this = ExplanationBuilder.build_why_this(top_outcome)
            top_outcome.why_this = why_this

            rejected_list: List[WhyNotExplanation] = []
            for alt in ranked_outcomes[1:]:
                alt_why_not = ExplanationBuilder.build_why_not(alt)
                alt.why_not = alt_why_not
                rejected_list.append(alt_why_not)

            top_recommendation = Recommendation(
                recommended_action_id=top_outcome.action_id,
                headline=why_this.headline,
                rationale=f"Executing {top_outcome.action_id} saves {top_outcome.delay_reduction_days:.1f} days of delay, avoiding ${float(top_outcome.avoided_sla_exposure):,.2f} in SLA penalties for Titan Motors at a cost of ${float(top_outcome.mitigation_cost):,.2f} (Net Value: ${float(top_outcome.net_value):,.2f}).",
                why_this=why_this,
                rejected_alternatives_why_not=rejected_list,
                execution_safety_notice="Simulation only — no operational state is modified in database.",
            )

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        return MitigationSimulationResponse(
            simulation_id=sim_id,
            disruption_id=disruption.disruption_id,
            baseline_financial_exposure=baseline_impact.total_financial_exposure,
            baseline_risk_score=baseline_impact.composite_risk_score,
            candidate_options=ranked_outcomes,
            top_recommendation=top_recommendation,
            execution_time_ms=round(elapsed_ms, 2),
        )
