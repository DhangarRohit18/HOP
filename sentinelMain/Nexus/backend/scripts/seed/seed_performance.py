from decimal import Decimal
from typing import List
from app.models.manufacturing import Supplier, SupplierPerformance
from scripts.seed.constants import make_nexus_uuid, make_nexus_date, make_nexus_datetime


def generate_performance(suppliers: List[Supplier]) -> List[SupplierPerformance]:
    performance_records: List[SupplierPerformance] = []

    # 12 suppliers x 12 monthly evaluations = 144 performance records
    for supp in suppliers:
        for m in range(12):
            eval_date = make_nexus_date(-330 + (m * 30))
            perf_id = make_nexus_uuid("PERFORMANCE", f"{supp.supplier_code}:{m}")
            created_dt = make_nexus_datetime(-330 + (m * 30))

            if supp.supplier_code == "SUP-001":
                ontime = Decimal("0.98")
                defect = Decimal("0.01")
                lead = Decimal("2.00")
            elif supp.supplier_code == "SUP-003":
                ontime = Decimal("0.68")
                defect = Decimal("0.07")
                lead = Decimal("8.50")
            elif supp.supplier_code == "SUP-006":
                ontime = Decimal("0.82")
                defect = Decimal("0.09")
                lead = Decimal("4.00")
            else:
                ontime = Decimal("0.95")
                defect = Decimal("0.02")
                lead = Decimal("3.00")

            perf = SupplierPerformance(
                id=perf_id,
                supplier_id=supp.id,
                evaluation_date=eval_date,
                on_time_delivery_rate=ontime,
                quality_defect_rate=defect,
                response_lead_time_days=lead,
                created_at=created_dt,
                updated_at=created_dt,
            )
            performance_records.append(perf)

    return performance_records
