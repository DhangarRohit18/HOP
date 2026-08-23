from typing import List, Optional, Dict
from app.schemas.traceability.material import (
    MaterialUnit,
    MaterialCondition,
    MaterialQualityStatus,
    MaterialInspectionStatus,
    MaterialOperationalStatus,
    MaterialEventType,
    MaterialHistoryEvent,
    MaterialPassport,
    MaterialRiskInfo,
    MaterialImpactResponse,
    StructuredEvidence,
)


class MaterialTraceabilityService:
    def __init__(self):
        # Deterministic Material Registry with 8 Scenarios
        self._units: Dict[str, MaterialUnit] = {
            # Scenario 1: AT_RISK (Golden Path fab outage + delay + $200k SLA)
            "CMP-001-00427": MaterialUnit(
                material_unit_id="CMP-001-00427",
                component_id="CMP-001",
                component_name="32-bit MCU Microcontroller",
                batch_id="BATCH-2026-0710",
                serial_number="MCU-00427",
                supplier_id="SUP-001",
                purchase_order_id="PO-2026-001",
                shipment_id="SHP-2026-001",
                warehouse_id="WH-SJC-01",
                production_order_id="PRD-2026-001",
                customer_order_id="SO-2026-001",
                condition=MaterialCondition.AT_RISK,
                quality_status=MaterialQualityStatus.VERIFIED,
                inspection_status=MaterialInspectionStatus.PASSED,
                status=MaterialOperationalStatus.RESERVED,
            ),
            # Scenario 2: HEALTHY (No disruption, clean execution)
            "CMP-001-00428": MaterialUnit(
                material_unit_id="CMP-001-00428",
                component_id="CMP-001",
                component_name="32-bit MCU Microcontroller",
                batch_id="BATCH-2026-0710",
                serial_number="MCU-00428",
                supplier_id="SUP-001",
                purchase_order_id="PO-2026-001",
                shipment_id="SHP-2026-001",
                warehouse_id="WH-SJC-01",
                production_order_id="PRD-2026-001",
                customer_order_id="SO-2026-001",
                condition=MaterialCondition.HEALTHY,
                quality_status=MaterialQualityStatus.VERIFIED,
                inspection_status=MaterialInspectionStatus.PASSED,
                status=MaterialOperationalStatus.AVAILABLE,
            ),
            # Scenario 3: QUARANTINED (Quality failure, blocked at warehouse/production)
            "CMP-001-00429": MaterialUnit(
                material_unit_id="CMP-001-00429",
                component_id="CMP-001",
                component_name="32-bit MCU Microcontroller",
                batch_id="BATCH-2026-0710",
                serial_number="MCU-00429",
                supplier_id="SUP-001",
                purchase_order_id="PO-2026-001",
                shipment_id="SHP-2026-001",
                warehouse_id="WH-SJC-01",
                production_order_id="PRD-2026-001",
                customer_order_id=None,
                condition=MaterialCondition.QUARANTINED,
                quality_status=MaterialQualityStatus.FAILED,
                inspection_status=MaterialInspectionStatus.FAILED,
                status=MaterialOperationalStatus.BLOCKED,
            ),
            # Scenario 4: AT_RISK - Inventory Shortage / Safety Stock Breach
            "CMP-005-01001": MaterialUnit(
                material_unit_id="CMP-005-01001",
                component_id="CMP-005",
                component_name="High-Voltage IGBT Driver Module",
                batch_id="BATCH-2026-0801",
                serial_number="IGBT-01001",
                supplier_id="SUP-003",
                purchase_order_id="PO-2026-015",
                shipment_id="SHP-2026-012",
                warehouse_id="WH-CHI-02",
                production_order_id="PRD-2026-008",
                customer_order_id="SO-2026-012",
                condition=MaterialCondition.AT_RISK,
                quality_status=MaterialQualityStatus.VERIFIED,
                inspection_status=MaterialInspectionStatus.PASSED,
                status=MaterialOperationalStatus.RESERVED,
            ),
            # Scenario 5: AT_RISK - Customs Hold / Port Logistics Disruption
            "CMP-009-01002": MaterialUnit(
                material_unit_id="CMP-009-01002",
                component_id="CMP-009",
                component_name="Precision Optical Sensor Array",
                batch_id="BATCH-2026-0805",
                serial_number="OPT-01002",
                supplier_id="SUP-006",
                purchase_order_id="PO-2026-022",
                shipment_id="SHP-2026-018",
                warehouse_id="WH-LAX-03",
                production_order_id="PRD-2026-014",
                customer_order_id="SO-2026-019",
                condition=MaterialCondition.AT_RISK,
                quality_status=MaterialQualityStatus.VERIFIED,
                inspection_status=MaterialInspectionStatus.PASSED,
                status=MaterialOperationalStatus.RESERVED,
            ),
            # Scenario 6: AT_RISK - Production Bottleneck / Line Downtime
            "CMP-012-01003": MaterialUnit(
                material_unit_id="CMP-012-01003",
                component_id="CMP-012",
                component_name="Automotive Power Inverter Board",
                batch_id="BATCH-2026-0810",
                serial_number="INV-01003",
                supplier_id="SUP-002",
                purchase_order_id="PO-2026-030",
                shipment_id="SHP-2026-025",
                warehouse_id="WH-DET-01",
                production_order_id="PRD-2026-020",
                customer_order_id="SO-2026-028",
                condition=MaterialCondition.AT_RISK,
                quality_status=MaterialQualityStatus.VERIFIED,
                inspection_status=MaterialInspectionStatus.PASSED,
                status=MaterialOperationalStatus.RESERVED,
            ),
            # Scenario 7: AT_RISK - Single Source Shortage / Severe Penalty
            "CMP-017-01004": MaterialUnit(
                material_unit_id="CMP-017-01004",
                component_id="CMP-017",
                component_name="Custom Silicon PMIC Controller",
                batch_id="BATCH-2026-0812",
                serial_number="PMIC-01004",
                supplier_id="SUP-001",
                purchase_order_id="PO-2026-041",
                shipment_id="SHP-2026-033",
                warehouse_id="WH-SJC-01",
                production_order_id="PRD-2026-025",
                customer_order_id="SO-2026-035",
                condition=MaterialCondition.AT_RISK,
                quality_status=MaterialQualityStatus.VERIFIED,
                inspection_status=MaterialInspectionStatus.PASSED,
                status=MaterialOperationalStatus.RESERVED,
            ),
            # Scenario 8: HEALTHY - Healthy Control Case B
            "CMP-021-01005": MaterialUnit(
                material_unit_id="CMP-021-01005",
                component_id="CMP-021",
                component_name="Standard Industrial Connector Harness",
                batch_id="BATCH-2026-0815",
                serial_number="HAR-01005",
                supplier_id="SUP-005",
                purchase_order_id="PO-2026-050",
                shipment_id="SHP-2026-040",
                warehouse_id="WH-CHI-02",
                production_order_id="PRD-2026-030",
                customer_order_id="SO-2026-042",
                condition=MaterialCondition.HEALTHY,
                quality_status=MaterialQualityStatus.VERIFIED,
                inspection_status=MaterialInspectionStatus.PASSED,
                status=MaterialOperationalStatus.AVAILABLE,
            ),
        }

        # Deterministic History Event Registry
        self._history: Dict[str, List[MaterialHistoryEvent]] = {
            "CMP-001-00427": [
                MaterialHistoryEvent(
                    event_id="EVT-00427-01",
                    material_unit_id="CMP-001-00427",
                    event_type=MaterialEventType.MATERIAL_CREATED,
                    timestamp="2026-07-10T08:00:00Z",
                    source="Apex Semiconductor Inc. (SUP-001)",
                    status="CREATED",
                    description="Microcontroller unit manufactured at Hsinchu Science Park",
                    related_entity_type="SUPPLIER",
                    related_entity_id="SUP-001",
                ),
                MaterialHistoryEvent(
                    event_id="EVT-00427-02",
                    material_unit_id="CMP-001-00427",
                    event_type=MaterialEventType.QUALITY_INSPECTED,
                    timestamp="2026-07-11T10:30:00Z",
                    source="Factory Quality Gate 4",
                    status="PASSED",
                    description="Automated wafer probe test verified with zero defects",
                    related_entity_type="COMPONENT",
                    related_entity_id="CMP-001",
                ),
                MaterialHistoryEvent(
                    event_id="EVT-00427-03",
                    material_unit_id="CMP-001-00427",
                    event_type=MaterialEventType.PACKED,
                    timestamp="2026-07-12T14:00:00Z",
                    source="Apex Packaging Line",
                    status="PACKED",
                    description="Assigned to batch BATCH-2026-0710 for PO-2026-001",
                    related_entity_type="PURCHASE_ORDER",
                    related_entity_id="PO-2026-001",
                ),
                MaterialHistoryEvent(
                    event_id="EVT-00427-04",
                    material_unit_id="CMP-001-00427",
                    event_type=MaterialEventType.SHIPPED,
                    timestamp="2026-07-15T09:00:00Z",
                    source="TPE Air Cargo Hub",
                    status="IN_TRANSIT",
                    description="Loaded onto Air Express Freight SHP-2026-001",
                    related_entity_type="SHIPMENT",
                    related_entity_id="SHP-2026-001",
                ),
                MaterialHistoryEvent(
                    event_id="EVT-00427-05",
                    material_unit_id="CMP-001-00427",
                    event_type=MaterialEventType.DISRUPTION_DETECTED,
                    timestamp="2026-08-01T12:00:00Z",
                    source="NEXUS Risk Intelligence",
                    status="AT_RISK",
                    description="Critical supplier outage reported at Apex Semiconductor (SUP-001)",
                    related_entity_type="SUPPLIER",
                    related_entity_id="SUP-001",
                ),
                MaterialHistoryEvent(
                    event_id="EVT-00427-06",
                    material_unit_id="CMP-001-00427",
                    event_type=MaterialEventType.IMPACT_ANALYZED,
                    timestamp="2026-08-01T12:05:00Z",
                    source="NEXUS Impact Engine",
                    status="AT_RISK",
                    description="SLA delay exposure of $200,000 quantified for customer contract SO-2026-001",
                    related_entity_type="CUSTOMER_ORDER",
                    related_entity_id="SO-2026-001",
                ),
            ],
            "CMP-001-00428": [
                MaterialHistoryEvent(
                    event_id="EVT-00428-01",
                    material_unit_id="CMP-001-00428",
                    event_type=MaterialEventType.MATERIAL_CREATED,
                    timestamp="2026-07-10T08:00:00Z",
                    source="Apex Semiconductor Inc. (SUP-001)",
                    status="CREATED",
                    description="Microcontroller unit manufactured at Hsinchu Science Park",
                    related_entity_type="SUPPLIER",
                    related_entity_id="SUP-001",
                ),
                MaterialHistoryEvent(
                    event_id="EVT-00428-02",
                    material_unit_id="CMP-001-00428",
                    event_type=MaterialEventType.QUALITY_INSPECTED,
                    timestamp="2026-07-11T10:30:00Z",
                    source="Factory Quality Gate 4",
                    status="PASSED",
                    description="Automated wafer probe test verified with zero defects",
                    related_entity_type="COMPONENT",
                    related_entity_id="CMP-001",
                ),
                MaterialHistoryEvent(
                    event_id="EVT-00428-03",
                    material_unit_id="CMP-001-00428",
                    event_type=MaterialEventType.PACKED,
                    timestamp="2026-07-12T14:00:00Z",
                    source="Apex Packaging Line",
                    status="PACKED",
                    description="Assigned to batch BATCH-2026-0710 for PO-2026-001",
                    related_entity_type="PURCHASE_ORDER",
                    related_entity_id="PO-2026-001",
                ),
                MaterialHistoryEvent(
                    event_id="EVT-00428-04",
                    material_unit_id="CMP-001-00428",
                    event_type=MaterialEventType.SHIPPED,
                    timestamp="2026-07-15T09:00:00Z",
                    source="TPE Air Cargo Hub",
                    status="IN_TRANSIT",
                    description="Loaded onto Air Express Freight SHP-2026-001",
                    related_entity_type="SHIPMENT",
                    related_entity_id="SHP-2026-001",
                ),
                MaterialHistoryEvent(
                    event_id="EVT-00428-05",
                    material_unit_id="CMP-001-00428",
                    event_type=MaterialEventType.RECEIVED,
                    timestamp="2026-07-20T11:00:00Z",
                    source="San Jose Logistics Warehouse (WH-SJC-01)",
                    status="AVAILABLE",
                    description="Received into active inventory with full quality clearance",
                    related_entity_type="RESOURCE",
                    related_entity_id="WH-SJC-01",
                ),
            ],
            "CMP-001-00429": [
                MaterialHistoryEvent(
                    event_id="EVT-00429-01",
                    material_unit_id="CMP-001-00429",
                    event_type=MaterialEventType.MATERIAL_CREATED,
                    timestamp="2026-07-10T08:00:00Z",
                    source="Apex Semiconductor Inc. (SUP-001)",
                    status="CREATED",
                    description="Microcontroller unit manufactured at Hsinchu Science Park",
                    related_entity_type="SUPPLIER",
                    related_entity_id="SUP-001",
                ),
                MaterialHistoryEvent(
                    event_id="EVT-00429-02",
                    material_unit_id="CMP-001-00429",
                    event_type=MaterialEventType.QUALITY_INSPECTION_FAILED,
                    timestamp="2026-07-11T10:30:00Z",
                    source="Factory Quality Gate 4",
                    status="FAILED",
                    description="Automated wafer probe test failed due to clock frequency volatility",
                    related_entity_type="COMPONENT",
                    related_entity_id="CMP-001",
                ),
                MaterialHistoryEvent(
                    event_id="EVT-00429-03",
                    material_unit_id="CMP-001-00429",
                    event_type=MaterialEventType.QUARANTINED,
                    timestamp="2026-07-11T11:00:00Z",
                    source="Quality Isolation Zone B",
                    status="BLOCKED",
                    description="Physical unit quarantined and blocked from assembly allocation",
                    related_entity_type="MATERIAL_UNIT",
                    related_entity_id="CMP-001-00429",
                ),
            ],
            "CMP-005-01001": [
                MaterialHistoryEvent(
                    event_id="EVT-01001-01",
                    material_unit_id="CMP-005-01001",
                    event_type=MaterialEventType.MATERIAL_CREATED,
                    timestamp="2026-07-18T09:00:00Z",
                    source="Budget Microelectronics (SUP-003)",
                    status="CREATED",
                    description="High-Voltage IGBT Driver manufactured in Shenzhen",
                    related_entity_type="SUPPLIER",
                    related_entity_id="SUP-003",
                ),
                MaterialHistoryEvent(
                    event_id="EVT-01001-02",
                    material_unit_id="CMP-005-01001",
                    event_type=MaterialEventType.DISRUPTION_DETECTED,
                    timestamp="2026-08-03T14:00:00Z",
                    source="NEXUS Inventory Monitor",
                    status="AT_RISK",
                    description="Safety stock breach detected at Chicago Regional DC (WH-CHI-02)",
                    related_entity_type="RESOURCE",
                    related_entity_id="WH-CHI-02",
                ),
            ],
            "CMP-009-01002": [
                MaterialHistoryEvent(
                    event_id="EVT-01002-01",
                    material_unit_id="CMP-009-01002",
                    event_type=MaterialEventType.MATERIAL_CREATED,
                    timestamp="2026-07-20T08:30:00Z",
                    source="Alpha Sensors Inc. (SUP-006)",
                    status="CREATED",
                    description="Precision Optical Sensor Array produced in Boston",
                    related_entity_type="SUPPLIER",
                    related_entity_id="SUP-006",
                ),
                MaterialHistoryEvent(
                    event_id="EVT-01002-02",
                    material_unit_id="CMP-009-01002",
                    event_type=MaterialEventType.DISRUPTION_DETECTED,
                    timestamp="2026-08-04T10:00:00Z",
                    source="Customs Border Control",
                    status="AT_RISK",
                    description="Customs documentation hold flagged at LAX Freight Terminal",
                    related_entity_type="SHIPMENT",
                    related_entity_id="SHP-2026-018",
                ),
            ],
            "CMP-012-01003": [
                MaterialHistoryEvent(
                    event_id="EVT-01003-01",
                    material_unit_id="CMP-012-01003",
                    event_type=MaterialEventType.MATERIAL_CREATED,
                    timestamp="2026-07-22T07:15:00Z",
                    source="Global Logistics Foundry (SUP-002)",
                    status="CREATED",
                    description="Power Inverter Board fabricated in Stuttgart",
                    related_entity_type="SUPPLIER",
                    related_entity_id="SUP-002",
                ),
                MaterialHistoryEvent(
                    event_id="EVT-01003-02",
                    material_unit_id="CMP-012-01003",
                    event_type=MaterialEventType.DISRUPTION_DETECTED,
                    timestamp="2026-08-05T16:00:00Z",
                    source="Detroit Assembly Line MES",
                    status="AT_RISK",
                    description="Assembly Line 2 conveyor failure causing manufacturing bottleneck",
                    related_entity_type="PRODUCTION_ORDER",
                    related_entity_id="PRD-2026-020",
                ),
            ],
            "CMP-017-01004": [
                MaterialHistoryEvent(
                    event_id="EVT-01004-01",
                    material_unit_id="CMP-017-01004",
                    event_type=MaterialEventType.MATERIAL_CREATED,
                    timestamp="2026-07-25T11:00:00Z",
                    source="Apex Semiconductor Inc. (SUP-001)",
                    status="CREATED",
                    description="PMIC Controller batch produced under exclusive single-source contract",
                    related_entity_type="SUPPLIER",
                    related_entity_id="SUP-001",
                ),
                MaterialHistoryEvent(
                    event_id="EVT-01004-02",
                    material_unit_id="CMP-017-01004",
                    event_type=MaterialEventType.DISRUPTION_DETECTED,
                    timestamp="2026-08-06T09:30:00Z",
                    source="NEXUS Impact Engine",
                    status="AT_RISK",
                    description="Single-source silicon restriction causing $310,000 contract SLA exposure",
                    related_entity_type="CUSTOMER_ORDER",
                    related_entity_id="SO-2026-035",
                ),
            ],
            "CMP-021-01005": [
                MaterialHistoryEvent(
                    event_id="EVT-01005-01",
                    material_unit_id="CMP-021-01005",
                    event_type=MaterialEventType.MATERIAL_CREATED,
                    timestamp="2026-07-28T10:00:00Z",
                    source="Precision Harnesses Inc. (SUP-005)",
                    status="CREATED",
                    description="Standard Connector Harness assembled in Monterrey facility",
                    related_entity_type="SUPPLIER",
                    related_entity_id="SUP-005",
                ),
                MaterialHistoryEvent(
                    event_id="EVT-01005-02",
                    material_unit_id="CMP-021-01005",
                    event_type=MaterialEventType.RECEIVED,
                    timestamp="2026-08-02T15:00:00Z",
                    source="Chicago Regional DC (WH-CHI-02)",
                    status="AVAILABLE",
                    description="Received into active inventory with dual-source backup verified",
                    related_entity_type="RESOURCE",
                    related_entity_id="WH-CHI-02",
                ),
            ],
        }

    def get_material_unit(self, material_id: str) -> Optional[MaterialUnit]:
        return self._units.get(material_id)

    def get_material_history(self, material_id: str) -> Optional[List[MaterialHistoryEvent]]:
        if material_id not in self._units:
            return None
        events = self._history.get(material_id, [])
        for evt in events:
            if evt.material_unit_id != material_id:
                return None
        return events

    def get_material_passport(self, material_id: str) -> Optional[MaterialPassport]:
        unit = self.get_material_unit(material_id)
        if not unit:
            return None

        evidence: List[StructuredEvidence] = []
        is_at_risk = False
        active_disruption_id = None
        severity = "NONE"
        estimated_delay_days = 0.0
        sla_exposure = 0.0

        if unit.material_unit_id == "CMP-001-00427":
            is_at_risk = True
            active_disruption_id = "INC-2026-001"
            severity = "CRITICAL"
            estimated_delay_days = 4.0
            sla_exposure = 200000.0
            evidence = [
                StructuredEvidence(
                    evidence_type="SUPPLIER_OUTAGE",
                    source_entity=unit.supplier_id,
                    severity="CRITICAL",
                    description=f"Supplier {unit.supplier_id} has an active critical supplier outage (200 hours).",
                    verified=True,
                    source_type="SUPPLIER",
                    source_id=unit.supplier_id,
                    reason_code="SUPPLIER_OUTAGE",
                ),
                StructuredEvidence(
                    evidence_type="SHIPMENT_DELAY",
                    source_entity=unit.shipment_id,
                    severity="HIGH",
                    description=f"Freight shipment {unit.shipment_id} delayed by +4 days due to supplier outage.",
                    verified=True,
                    source_type="SHIPMENT",
                    source_id=unit.shipment_id,
                    reason_code="SHIPMENT_DELAY",
                ),
                StructuredEvidence(
                    evidence_type="SINGLE_SOURCE_RISK",
                    source_entity=unit.component_id,
                    severity="HIGH",
                    description=f"Component {unit.component_id} is single-sourced with no active catalog substitute.",
                    verified=True,
                    source_type="COMPONENT",
                    source_id=unit.component_id,
                    reason_code="SINGLE_SOURCE_RISK",
                ),
            ]
        elif unit.material_unit_id == "CMP-005-01001":
            is_at_risk = True
            severity = "HIGH"
            estimated_delay_days = 2.5
            sla_exposure = 85000.0
            evidence = [
                StructuredEvidence(
                    evidence_type="SAFETY_STOCK_BREACH",
                    source_entity=unit.warehouse_id,
                    severity="HIGH",
                    description=f"Inventory position at {unit.warehouse_id} breached critical safety stock threshold.",
                    verified=True,
                    source_type="WAREHOUSE",
                    source_id=unit.warehouse_id,
                    reason_code="SAFETY_STOCK_BREACH",
                )
            ]
        elif unit.material_unit_id == "CMP-009-01002":
            is_at_risk = True
            severity = "HIGH"
            estimated_delay_days = 5.0
            sla_exposure = 120000.0
            evidence = [
                StructuredEvidence(
                    evidence_type="CUSTOMS_HOLD",
                    source_entity=unit.shipment_id,
                    severity="HIGH",
                    description=f"Port logistics delay and customs documentation hold active for shipment {unit.shipment_id}.",
                    verified=True,
                    source_type="SHIPMENT",
                    source_id=unit.shipment_id,
                    reason_code="CUSTOMS_HOLD",
                )
            ]
        elif unit.material_unit_id == "CMP-012-01003":
            is_at_risk = True
            severity = "HIGH"
            estimated_delay_days = 3.0
            sla_exposure = 50000.0
            evidence = [
                StructuredEvidence(
                    evidence_type="PRODUCTION_BOTTLENECK",
                    source_entity=unit.production_order_id,
                    severity="HIGH",
                    description=f"Assembly line downtime reported on manufacturing order {unit.production_order_id}.",
                    verified=True,
                    source_type="PRODUCTION_ORDER",
                    source_id=unit.production_order_id,
                    reason_code="PRODUCTION_BOTTLENECK",
                )
            ]
        elif unit.material_unit_id == "CMP-017-01004":
            is_at_risk = True
            severity = "CRITICAL"
            estimated_delay_days = 6.0
            sla_exposure = 310000.0
            evidence = [
                StructuredEvidence(
                    evidence_type="SINGLE_SOURCE_SHORTAGE",
                    source_entity=unit.supplier_id,
                    severity="CRITICAL",
                    description=f"Exclusive single-source silicon shortage at {unit.supplier_id} impacting order {unit.customer_order_id}.",
                    verified=True,
                    source_type="SUPPLIER",
                    source_id=unit.supplier_id,
                    reason_code="SINGLE_SOURCE_SHORTAGE",
                )
            ]
        elif unit.condition == MaterialCondition.QUARANTINED:
            is_at_risk = True
            severity = "HIGH"
            estimated_delay_days = 0.0
            sla_exposure = 0.0
            evidence = [
                StructuredEvidence(
                    evidence_type="QUALITY_INSPECTION_FAILURE",
                    source_entity=unit.material_unit_id,
                    severity="HIGH",
                    description=f"Incoming quality inspection failed for unit {unit.material_unit_id}. Unit quarantined and blocked.",
                    verified=True,
                    source_type="MATERIAL_UNIT",
                    source_id=unit.material_unit_id,
                    reason_code="QUALITY_INSPECTION_FAILURE",
                ),
            ]

        risk_info = MaterialRiskInfo(
            is_at_risk=is_at_risk,
            active_disruption_id=active_disruption_id,
            severity=severity,
            estimated_delay_days=estimated_delay_days,
            sla_exposure=sla_exposure,
            evidence=evidence,
        )

        upstream_entities = [unit.supplier_id, unit.purchase_order_id, unit.shipment_id]
        downstream_entities = [e for e in [unit.component_id, unit.production_order_id, unit.customer_order_id] if e]

        passport = MaterialPassport(
            material_unit_id=unit.material_unit_id,
            identity={
                "component_id": unit.component_id,
                "component_name": unit.component_name,
                "batch_id": unit.batch_id,
                "serial_number": unit.serial_number,
            },
            provenance={
                "supplier_id": unit.supplier_id,
                "purchase_order_id": unit.purchase_order_id,
                "shipment_id": unit.shipment_id,
            },
            current_state={
                "warehouse_id": unit.warehouse_id,
                "condition": unit.condition.value,
                "quality_status": unit.quality_status.value,
                "inspection_status": unit.inspection_status.value,
                "operational_status": unit.status.value,
            },
            production={
                "production_order_id": unit.production_order_id,
            },
            customer={
                "customer_order_id": unit.customer_order_id,
            },
            traceability={
                "upstream_entities": upstream_entities,
                "downstream_entities": downstream_entities,
            },
            risk=risk_info,
        )

        if passport.material_unit_id != material_id:
            return None
        return passport

    def get_material_impact(self, material_id: str) -> Optional[MaterialImpactResponse]:
        unit = self.get_material_unit(material_id)
        if not unit:
            return None

        passport = self.get_material_passport(material_id)
        if not passport:
            return None

        upstream_chain = [
            {"entity_type": "SUPPLIER", "entity_id": unit.supplier_id, "code": unit.supplier_id},
            {"entity_type": "PURCHASE_ORDER", "entity_id": unit.purchase_order_id, "code": unit.purchase_order_id},
            {"entity_type": "SHIPMENT", "entity_id": unit.shipment_id, "code": unit.shipment_id},
        ]

        downstream_chain = [
            {"entity_type": "COMPONENT", "entity_id": unit.component_id, "code": unit.component_id},
        ]
        if unit.production_order_id:
            downstream_chain.append(
                {"entity_type": "PRODUCTION_ORDER", "entity_id": unit.production_order_id, "code": unit.production_order_id}
            )
        if unit.customer_order_id:
            downstream_chain.append(
                {"entity_type": "CUSTOMER_ORDER", "entity_id": unit.customer_order_id, "code": unit.customer_order_id}
            )

        impact_res = MaterialImpactResponse(
            material_unit_id=unit.material_unit_id,
            component_id=unit.component_id,
            upstream_chain=upstream_chain,
            downstream_chain=downstream_chain,
            affected_production_orders=[unit.production_order_id] if unit.production_order_id else [],
            affected_customer_orders=[unit.customer_order_id] if unit.customer_order_id else [],
            estimated_sla_exposure=passport.risk.sla_exposure,
            evidence=passport.risk.evidence,
        )

        if impact_res.material_unit_id != material_id:
            return None

        return impact_res


traceability_service = MaterialTraceabilityService()
