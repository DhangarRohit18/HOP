import random
import csv
import os

CANONICAL_PARTS = [
    ("MOTOR_DRIVE", "POWERTRAIN", "CRITICAL", 15000, 50, 7),
    ("INVERTER", "POWERTRAIN", "CRITICAL", 8500, 50, 8),
    ("BATTERY", "ENERGY", "CRITICAL", 28000, 40, 7),
    ("BMS", "ENERGY", "CRITICAL", 3500, 40, 8),
    ("BRAKE_FRONT_LEFT", "BRAKING_AND_SAFETY", "CRITICAL", 850, 80, 6),
    ("BRAKE_FRONT_RIGHT", "BRAKING_AND_SAFETY", "CRITICAL", 850, 80, 6),
    ("ABS_CONTROLLER", "BRAKING_AND_SAFETY", "CRITICAL", 2100, 60, 6),
    ("STEERING_SYSTEM", "STEERING", "CRITICAL", 7200, 50, 6),
    ("VCU", "ELECTRONICS", "CRITICAL", 5400, 60, 7),
    ("ECU", "ELECTRONICS", "CRITICAL", 4500, 100, 4),
    ("SENSOR_FRONT", "ADAS_AND_SENSORS", "CRITICAL", 3200, 30, 5),
    ("CAMERA_FRONT", "ADAS_AND_SENSORS", "IMPORTANT", 1800, 35, 6),
    ("LEFT_HEADLIGHT", "LIGHTING", "IMPORTANT", 1200, 90, 0),
    ("RIGHT_HEADLIGHT", "LIGHTING", "IMPORTANT", 1200, 90, 6),
    ("WHEEL_FL", "WHEEL", "IMPORTANT", 1600, 80, 7),
    ("WHEEL_FR", "WHEEL", "IMPORTANT", 1600, 80, 7),
    ("WHEEL_RL", "WHEEL", "IMPORTANT", 1600, 80, 7),
    ("WHEEL_RR", "WHEEL", "IMPORTANT", 1600, 80, 7),
    ("TIRE_FL", "TIRES", "IMPORTANT", 950, 100, 8),
    ("TIRE_FR", "TIRES", "IMPORTANT", 950, 100, 8),
    ("BATTERY_COOLING", "THERMAL", "IMPORTANT", 2900, 45, 8),
    ("HVAC_COMPRESSOR", "THERMAL", "IMPORTANT", 3800, 50, 8),
    ("FRONT_BUMPER", "BODY", "NON_CRITICAL", 2400, 65, 8),
    ("REAR_BUMPER", "BODY", "NON_CRITICAL", 2400, 65, 8),
    ("HOOD", "BODY", "NON_CRITICAL", 4200, 40, 8),
    ("DOORS", "BODY", "NON_CRITICAL", 11500, 30, 8),
    ("SEATS", "INTERIOR", "NON_CRITICAL", 6500, 60, 8)
]

def generate_dataset(num_records: int = 50000, output_path: str = "ml/dataset/automotive_supply_chain_50k.csv"):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    random.seed(42)

    headers = [
        "record_id", "part_id", "category", "criticality", "unit_cost",
        "supplier_reliability", "supplier_quality_score", "lead_time_days",
        "available_inventory", "daily_consumption", "coverage_days",
        "historical_delay_count", "single_source_dependency", "weather_disruption_risk",
        "demand_spike_multiplier", "risk_score", "stockout_event"
    ]

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)

        for i in range(num_records):
            part_id, category, criticality, unit_cost, daily_burn, def_coverage = random.choice(CANONICAL_PARTS)
            
            reliability = round(random.betavariate(8, 2), 2)
            quality = round(random.betavariate(9, 1), 2)
            lead_time = random.randint(3, 14)
            daily_usage = max(10, int(daily_burn * random.uniform(0.8, 1.4)))
            avail_stock = max(0, int(daily_usage * random.uniform(0, 10)))
            coverage = round(avail_stock / daily_usage, 1)
            delays = random.randint(0, 5)
            single_source = 1 if random.random() < 0.3 else 0
            weather_risk = round(random.uniform(0.05, 0.4), 2)
            demand_spike = round(random.uniform(1.0, 1.6), 2)

            # Correlated Risk Score Calculation
            risk = 0.0
            if coverage < 2.0:
                risk += 0.45
            elif coverage < 5.0:
                risk += 0.20

            if reliability < 0.75:
                risk += 0.25
            if single_source == 1:
                risk += 0.15
            if delays > 2:
                risk += 0.15

            risk = min(1.0, round(risk, 2))
            stockout = 1 if coverage == 0 or (coverage < 3 and random.random() < 0.7) else 0

            writer.writerow([
                f"REC-{i+100000}", part_id, category, criticality, unit_cost,
                reliability, quality, lead_time, avail_stock, daily_usage,
                coverage, delays, single_source, weather_risk, demand_spike,
                risk, stockout
            ])

    print(f"Successfully generated {num_records} synthetic automotive supply chain records at {output_path}")

if __name__ == "__main__":
    generate_dataset()
