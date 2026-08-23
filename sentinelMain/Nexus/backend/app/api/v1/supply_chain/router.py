from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Query
from typing import List, Dict, Any, Optional
import json

from app.services.supply_chain.sambanova_service import ask_sambanova_ai
from app.services.supply_chain.automotive_tools import calculate_smart_reorder_quantity, calculate_vehicle_build_capacity

router = APIRouter()

# Active WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

# In-memory Canonical Automotive Database
DATABASE = {
    "components": {
        "MOTOR_DRIVE": {
            "part_id": "MOTOR_DRIVE",
            "display_name": "Dual Electric Drive Motor (250kW)",
            "category": "POWERTRAIN",
            "criticality": "CRITICAL",
            "status": "GREEN",
            "available_stock": 250,
            "reserved_stock": 30,
            "incoming_stock": 0,
            "on_order_stock": 0,
            "daily_usage": 30,
            "safety_stock": 90,
            "coverage_days": 8.3,
            "unit_cost": 15000,
            "supplier_id": "SUP-10",
            "supplier_name": "ElectroDrive Systems",
            "lead_time_days": 7,
            "moq": 50,
            "risk_score": 0.12
        },
        "INVERTER": {
            "part_id": "INVERTER",
            "display_name": "Silicon Carbide Power Inverter Module",
            "category": "POWERTRAIN",
            "criticality": "CRITICAL",
            "status": "GREEN",
            "available_stock": 240,
            "reserved_stock": 25,
            "incoming_stock": 0,
            "on_order_stock": 0,
            "daily_usage": 30,
            "safety_stock": 90,
            "coverage_days": 8.0,
            "unit_cost": 8500,
            "supplier_id": "SUP-10",
            "supplier_name": "ElectroDrive Systems",
            "lead_time_days": 8,
            "moq": 50,
            "risk_score": 0.14
        },
        "BATTERY": {
            "part_id": "BATTERY",
            "display_name": "85 kWh Structural Lithium-Ion Pack",
            "category": "ENERGY",
            "criticality": "CRITICAL",
            "status": "GREEN",
            "available_stock": 180,
            "reserved_stock": 40,
            "incoming_stock": 0,
            "on_order_stock": 0,
            "daily_usage": 25,
            "safety_stock": 75,
            "coverage_days": 7.2,
            "unit_cost": 28000,
            "supplier_id": "SUP-30",
            "supplier_name": "VoltMax Cells Ltd",
            "lead_time_days": 7,
            "moq": 40,
            "risk_score": 0.18
        },
        "BMS": {
            "part_id": "BMS",
            "display_name": "Battery Management System (BMS)",
            "category": "ENERGY",
            "criticality": "CRITICAL",
            "status": "GREEN",
            "available_stock": 220,
            "reserved_stock": 30,
            "incoming_stock": 0,
            "on_order_stock": 0,
            "daily_usage": 25,
            "safety_stock": 75,
            "coverage_days": 8.8,
            "unit_cost": 3500,
            "supplier_id": "SUP-30",
            "supplier_name": "VoltMax Cells Ltd",
            "lead_time_days": 8,
            "moq": 40,
            "risk_score": 0.15
        },
        "BRAKE_FRONT_LEFT": {
            "part_id": "BRAKE_FRONT_LEFT",
            "display_name": "Regenerative Brake Caliper FL",
            "category": "BRAKING_AND_SAFETY",
            "criticality": "CRITICAL",
            "status": "GREEN",
            "available_stock": 310,
            "reserved_stock": 40,
            "incoming_stock": 0,
            "on_order_stock": 0,
            "daily_usage": 50,
            "safety_stock": 150,
            "coverage_days": 6.2,
            "unit_cost": 850,
            "supplier_id": "SUP-50",
            "supplier_name": "Brembo Precision Systems",
            "lead_time_days": 6,
            "moq": 80,
            "risk_score": 0.22
        },
        "BRAKE_FRONT_RIGHT": {
            "part_id": "BRAKE_FRONT_RIGHT",
            "display_name": "Regenerative Brake Caliper FR",
            "category": "BRAKING_AND_SAFETY",
            "criticality": "CRITICAL",
            "status": "GREEN",
            "available_stock": 310,
            "reserved_stock": 40,
            "incoming_stock": 0,
            "on_order_stock": 0,
            "daily_usage": 50,
            "safety_stock": 150,
            "coverage_days": 6.2,
            "unit_cost": 850,
            "supplier_id": "SUP-50",
            "supplier_name": "Brembo Precision Systems",
            "lead_time_days": 6,
            "moq": 80,
            "risk_score": 0.22
        },
        "ABS_CONTROLLER": {
            "part_id": "ABS_CONTROLLER",
            "display_name": "ABS Hydraulic Modulator & Control Unit",
            "category": "BRAKING_AND_SAFETY",
            "criticality": "CRITICAL",
            "status": "GREEN",
            "available_stock": 260,
            "reserved_stock": 30,
            "incoming_stock": 0,
            "on_order_stock": 0,
            "daily_usage": 30,
            "safety_stock": 90,
            "coverage_days": 8.6,
            "unit_cost": 2100,
            "supplier_id": "SUP-50",
            "supplier_name": "Brembo Precision Systems",
            "lead_time_days": 6,
            "moq": 60,
            "risk_score": 0.16
        },
        "STEERING_SYSTEM": {
            "part_id": "STEERING_SYSTEM",
            "display_name": "Steer-by-Wire Dual Actuator Rack",
            "category": "STEERING",
            "criticality": "CRITICAL",
            "status": "GREEN",
            "available_stock": 210,
            "reserved_stock": 25,
            "incoming_stock": 0,
            "on_order_stock": 0,
            "daily_usage": 30,
            "safety_stock": 90,
            "coverage_days": 7.0,
            "unit_cost": 7200,
            "supplier_id": "SUP-60",
            "supplier_name": "ZF Steering Tech",
            "lead_time_days": 6,
            "moq": 50,
            "risk_score": 0.19
        },
        "VCU": {
            "part_id": "VCU",
            "display_name": "Vehicle Control Unit (Master Gateway)",
            "category": "ELECTRONICS",
            "criticality": "CRITICAL",
            "status": "GREEN",
            "available_stock": 280,
            "reserved_stock": 35,
            "incoming_stock": 0,
            "on_order_stock": 0,
            "daily_usage": 30,
            "safety_stock": 90,
            "coverage_days": 9.3,
            "unit_cost": 5400,
            "supplier_id": "SUP-70",
            "supplier_name": "Bosch Mobility Electronics",
            "lead_time_days": 7,
            "moq": 60,
            "risk_score": 0.15
        },
        "ECU": {
            "part_id": "ECU",
            "display_name": "Autonomous Drive Controller V3",
            "category": "ELECTRONICS",
            "criticality": "CRITICAL",
            "status": "GREEN",
            "available_stock": 390,
            "reserved_stock": 40,
            "incoming_stock": 100,
            "on_order_stock": 100,
            "daily_usage": 100,
            "safety_stock": 300,
            "coverage_days": 3.9,
            "unit_cost": 4500,
            "supplier_id": "SUP-70",
            "supplier_name": "Bosch Mobility Electronics",
            "lead_time_days": 4,
            "moq": 100,
            "risk_score": 0.42
        },
        "SENSOR_FRONT": {
            "part_id": "SENSOR_FRONT",
            "display_name": "Solid-State LiDAR Array (Front)",
            "category": "ADAS_AND_SENSORS",
            "criticality": "CRITICAL",
            "status": "GREEN",
            "available_stock": 160,
            "reserved_stock": 20,
            "incoming_stock": 0,
            "on_order_stock": 0,
            "daily_usage": 20,
            "safety_stock": 60,
            "coverage_days": 8.0,
            "unit_cost": 3200,
            "supplier_id": "SUP-80",
            "supplier_name": "Luminar Optics",
            "lead_time_days": 5,
            "moq": 30,
            "risk_score": 0.18
        },
        "CAMERA_FRONT": {
            "part_id": "CAMERA_FRONT",
            "display_name": "Tri-Focus ADAS Front Vision Camera",
            "category": "ADAS_AND_SENSORS",
            "criticality": "IMPORTANT",
            "status": "GREEN",
            "available_stock": 220,
            "reserved_stock": 25,
            "incoming_stock": 0,
            "on_order_stock": 0,
            "daily_usage": 25,
            "safety_stock": 75,
            "coverage_days": 8.8,
            "unit_cost": 1800,
            "supplier_id": "SUP-80",
            "supplier_name": "Luminar Optics",
            "lead_time_days": 6,
            "moq": 35,
            "risk_score": 0.16
        },
        "LEFT_HEADLIGHT": {
            "part_id": "LEFT_HEADLIGHT",
            "display_name": "Adaptive LED Matrix Headlight Left",
            "category": "LIGHTING",
            "criticality": "IMPORTANT",
            "status": "RED",
            "available_stock": 0,
            "reserved_stock": 0,
            "incoming_stock": 0,
            "on_order_stock": 0,
            "daily_usage": 90,
            "safety_stock": 90,
            "coverage_days": 0.0,
            "unit_cost": 1200,
            "supplier_id": "SUP-21",
            "supplier_name": "Apex Photonics Ltd",
            "lead_time_days": 7,
            "moq": 100,
            "risk_score": 0.94
        },
        "RIGHT_HEADLIGHT": {
            "part_id": "RIGHT_HEADLIGHT",
            "display_name": "Adaptive LED Matrix Headlight Right",
            "category": "LIGHTING",
            "criticality": "IMPORTANT",
            "status": "GREEN",
            "available_stock": 540,
            "reserved_stock": 60,
            "incoming_stock": 0,
            "on_order_stock": 0,
            "daily_usage": 90,
            "safety_stock": 90,
            "coverage_days": 6.0,
            "unit_cost": 1200,
            "supplier_id": "SUP-21",
            "supplier_name": "Apex Photonics Ltd",
            "lead_time_days": 6,
            "moq": 90,
            "risk_score": 0.28
        },
        "WHEEL_FL": {
            "part_id": "WHEEL_FL",
            "display_name": "Aerodynamic Alloy Rim FL (20-inch)",
            "category": "WHEELS",
            "criticality": "IMPORTANT",
            "status": "GREEN",
            "available_stock": 420,
            "reserved_stock": 50,
            "incoming_stock": 0,
            "on_order_stock": 0,
            "daily_usage": 50,
            "safety_stock": 150,
            "coverage_days": 8.4,
            "unit_cost": 1600,
            "supplier_id": "SUP-90",
            "supplier_name": "Enkei Wheel Dynamics",
            "lead_time_days": 7,
            "moq": 80,
            "risk_score": 0.15
        },
        "WHEEL_FR": {
            "part_id": "WHEEL_FR",
            "display_name": "Aerodynamic Alloy Rim FR (20-inch)",
            "category": "WHEELS",
            "criticality": "IMPORTANT",
            "status": "GREEN",
            "available_stock": 420,
            "reserved_stock": 50,
            "incoming_stock": 0,
            "on_order_stock": 0,
            "daily_usage": 50,
            "safety_stock": 150,
            "coverage_days": 8.4,
            "unit_cost": 1600,
            "supplier_id": "SUP-90",
            "supplier_name": "Enkei Wheel Dynamics",
            "lead_time_days": 7,
            "moq": 80,
            "risk_score": 0.15
        },
        "WHEEL_RL": {
            "part_id": "WHEEL_RL",
            "display_name": "Aerodynamic Alloy Rim RL (20-inch)",
            "category": "WHEELS",
            "criticality": "IMPORTANT",
            "status": "GREEN",
            "available_stock": 420,
            "reserved_stock": 50,
            "incoming_stock": 0,
            "on_order_stock": 0,
            "daily_usage": 50,
            "safety_stock": 150,
            "coverage_days": 8.4,
            "unit_cost": 1600,
            "supplier_id": "SUP-90",
            "supplier_name": "Enkei Wheel Dynamics",
            "lead_time_days": 7,
            "moq": 80,
            "risk_score": 0.15
        },
        "WHEEL_RR": {
            "part_id": "WHEEL_RR",
            "display_name": "Aerodynamic Alloy Rim RR (20-inch)",
            "category": "WHEELS",
            "criticality": "IMPORTANT",
            "status": "GREEN",
            "available_stock": 420,
            "reserved_stock": 50,
            "incoming_stock": 0,
            "on_order_stock": 0,
            "daily_usage": 50,
            "safety_stock": 150,
            "coverage_days": 8.4,
            "unit_cost": 1600,
            "supplier_id": "SUP-90",
            "supplier_name": "Enkei Wheel Dynamics",
            "lead_time_days": 7,
            "moq": 80,
            "risk_score": 0.15
        },
        "TIRE_FL": {
            "part_id": "TIRE_FL",
            "display_name": "Low-Rolling Resistance EV Tire FL",
            "category": "TIRES",
            "criticality": "IMPORTANT",
            "status": "GREEN",
            "available_stock": 520,
            "reserved_stock": 60,
            "incoming_stock": 0,
            "on_order_stock": 0,
            "daily_usage": 60,
            "safety_stock": 180,
            "coverage_days": 8.6,
            "unit_cost": 950,
            "supplier_id": "SUP-95",
            "supplier_name": "Michelin EV Mobility",
            "lead_time_days": 8,
            "moq": 100,
            "risk_score": 0.14
        },
        "TIRE_FR": {
            "part_id": "TIRE_FR",
            "display_name": "Low-Rolling Resistance EV Tire FR",
            "category": "TIRES",
            "criticality": "IMPORTANT",
            "status": "GREEN",
            "available_stock": 520,
            "reserved_stock": 60,
            "incoming_stock": 0,
            "on_order_stock": 0,
            "daily_usage": 60,
            "safety_stock": 180,
            "coverage_days": 8.6,
            "unit_cost": 950,
            "supplier_id": "SUP-95",
            "supplier_name": "Michelin EV Mobility",
            "lead_time_days": 8,
            "moq": 100,
            "risk_score": 0.14
        },
        "BATTERY_COOLING": {
            "part_id": "BATTERY_COOLING",
            "display_name": "Liquid Glycol Battery Chiller & Radiator",
            "category": "THERMAL",
            "criticality": "IMPORTANT",
            "status": "GREEN",
            "available_stock": 270,
            "reserved_stock": 30,
            "incoming_stock": 0,
            "on_order_stock": 0,
            "daily_usage": 30,
            "safety_stock": 90,
            "coverage_days": 9.0,
            "unit_cost": 2900,
            "supplier_id": "SUP-100",
            "supplier_name": "Mahle Thermal Systems",
            "lead_time_days": 8,
            "moq": 45,
            "risk_score": 0.16
        },
        "HVAC_COMPRESSOR": {
            "part_id": "HVAC_COMPRESSOR",
            "display_name": "High-Voltage Electric Heat Pump Compressor",
            "category": "THERMAL",
            "criticality": "IMPORTANT",
            "status": "GREEN",
            "available_stock": 250,
            "reserved_stock": 30,
            "incoming_stock": 0,
            "on_order_stock": 0,
            "daily_usage": 30,
            "safety_stock": 90,
            "coverage_days": 8.3,
            "unit_cost": 3800,
            "supplier_id": "SUP-100",
            "supplier_name": "Mahle Thermal Systems",
            "lead_time_days": 8,
            "moq": 50,
            "risk_score": 0.17
        },
        "FRONT_BUMPER": {
            "part_id": "FRONT_BUMPER",
            "display_name": "Aero Carbon-Composite Front Fascia",
            "category": "BODY",
            "criticality": "NON_CRITICAL",
            "status": "GREEN",
            "available_stock": 320,
            "reserved_stock": 40,
            "incoming_stock": 0,
            "on_order_stock": 0,
            "daily_usage": 40,
            "safety_stock": 120,
            "coverage_days": 8.0,
            "unit_cost": 2400,
            "supplier_id": "SUP-110",
            "supplier_name": "Magna International",
            "lead_time_days": 8,
            "moq": 65,
            "risk_score": 0.12
        },
        "REAR_BUMPER": {
            "part_id": "REAR_BUMPER",
            "display_name": "Integrated Aerodynamic Rear Diffuser",
            "category": "BODY",
            "criticality": "NON_CRITICAL",
            "status": "GREEN",
            "available_stock": 320,
            "reserved_stock": 40,
            "incoming_stock": 0,
            "on_order_stock": 0,
            "daily_usage": 40,
            "safety_stock": 120,
            "coverage_days": 8.0,
            "unit_cost": 2400,
            "supplier_id": "SUP-110",
            "supplier_name": "Magna International",
            "lead_time_days": 8,
            "moq": 65,
            "risk_score": 0.12
        },
        "HOOD": {
            "part_id": "HOOD",
            "display_name": "Lightweight Aluminum Frunk Hood Assembly",
            "category": "BODY",
            "criticality": "NON_CRITICAL",
            "status": "GREEN",
            "available_stock": 220,
            "reserved_stock": 25,
            "incoming_stock": 0,
            "on_order_stock": 0,
            "daily_usage": 25,
            "safety_stock": 75,
            "coverage_days": 8.8,
            "unit_cost": 4200,
            "supplier_id": "SUP-110",
            "supplier_name": "Magna International",
            "lead_time_days": 8,
            "moq": 40,
            "risk_score": 0.15
        },
        "DOORS": {
            "part_id": "DOORS",
            "display_name": "Frameless Acoustic Glass Doors (Set of 4)",
            "category": "BODY",
            "criticality": "NON_CRITICAL",
            "status": "GREEN",
            "available_stock": 250,
            "reserved_stock": 30,
            "incoming_stock": 0,
            "on_order_stock": 0,
            "daily_usage": 30,
            "safety_stock": 90,
            "coverage_days": 8.3,
            "unit_cost": 11500,
            "supplier_id": "SUP-110",
            "supplier_name": "Magna International",
            "lead_time_days": 8,
            "moq": 30,
            "risk_score": 0.13
        },
        "SEATS": {
            "part_id": "SEATS",
            "display_name": "Ergonomic Heated Vegan Leather Seats",
            "category": "INTERIOR",
            "criticality": "NON_CRITICAL",
            "status": "GREEN",
            "available_stock": 290,
            "reserved_stock": 35,
            "incoming_stock": 0,
            "on_order_stock": 0,
            "daily_usage": 35,
            "safety_stock": 105,
            "coverage_days": 8.2,
            "unit_cost": 6500,
            "supplier_id": "SUP-120",
            "supplier_name": "Lear Corporation",
            "lead_time_days": 8,
            "moq": 60,
            "risk_score": 0.14
        }
    },
    "purchase_orders": []
}

@router.get("/api/components")
def get_all_components(category: Optional[str] = None):
    comps = list(DATABASE["components"].values())
    if category and category != "ALL":
        comps = [c for c in comps if c["category"] == category]
    return {"components": comps, "total": len(comps)}

@router.get("/api/components/{part_id}")
def get_component_by_id(part_id: str):
    pid = part_id.upper().strip()
    comp = DATABASE["components"].get(pid)
    if not comp:
        raise HTTPException(status_code=404, detail=f"Component {pid} not found in canonical registry.")
    
    smart = calculate_smart_reorder_quantity(
        available_stock=comp["available_stock"],
        incoming_stock=comp["incoming_stock"],
        daily_usage=comp["daily_usage"],
        lead_time_days=comp["lead_time_days"],
        safety_stock=comp["safety_stock"],
        min_order_quantity=comp["moq"]
    )
    
    comp_copy = dict(comp)
    comp_copy["smart_order"] = smart
    comp_copy["qr_url"] = f"/component/{pid}"
    return comp_copy

@router.get("/api/qr/validate/{part_id}")
def validate_qr_code(part_id: str):
    pid = part_id.upper().strip()
    exists = pid in DATABASE["components"]
    return {
        "part_id": pid,
        "valid": exists,
        "route": f"/component/{pid}",
        "canonical": exists,
        "status": DATABASE["components"][pid]["status"] if exists else "UNKNOWN"
    }

@router.post("/api/purchase-orders")
async def create_purchase_order(payload: Dict[str, Any]):
    part_id = payload.get("part_id", "").upper().strip()
    quantity = int(payload.get("quantity", 0))
    supplier_id = payload.get("supplier_id", "SUP-21")
    supplier_name = payload.get("supplier_name", "Primary Supplier")
    
    if part_id not in DATABASE["components"]:
        raise HTTPException(status_code=404, detail=f"Part {part_id} not found.")
    
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0.")
    
    po_id = f"PO-{10000 + len(DATABASE['purchase_orders']) + 1}"
    comp = DATABASE["components"][part_id]
    
    comp["on_order_stock"] += quantity
    comp["incoming_stock"] += quantity
    comp["status"] = "BLUE"
    
    po_record = {
        "po_id": po_id,
        "part_id": part_id,
        "quantity": quantity,
        "supplier_id": supplier_id,
        "supplier_name": supplier_name,
        "status": "PLACED",
        "created_at": "2026-08-22T23:00:00Z"
    }
    DATABASE["purchase_orders"].append(po_record)
    
    await manager.broadcast({
        "event": "PURCHASE_ORDER_CREATED",
        "po_id": po_id,
        "part_id": part_id,
        "quantity": quantity,
        "status": "BLUE",
        "new_on_order": comp["on_order_stock"]
    })
    
    return {"status": "success", "po": po_record, "updated_component": comp}

@router.post("/api/production-plans/calculate")
def calculate_production_capacity(payload: Dict[str, Any]):
    target_quantity = int(payload.get("target_quantity", 1000))
    bom_map = payload.get("bom_map", {})
    
    component_capacities = []
    for pid, comp in DATABASE["components"].items():
        qty_per_vehicle = bom_map.get(pid, 1)
        usable = max(0, comp["available_stock"] - comp["reserved_stock"])
        producible = usable // qty_per_vehicle
        shortage = max(0, (target_quantity * qty_per_vehicle) - usable)
        
        component_capacities.append({
            "part_id": pid,
            "display_name": comp["display_name"],
            "category": comp["category"],
            "criticality": comp["criticality"],
            "quantity_per_vehicle": qty_per_vehicle,
            "usable_stock": usable,
            "producible_units": producible,
            "shortage_quantity": shortage,
            "is_bottleneck": producible < target_quantity
        })
        
    max_producible = min(c["producible_units"] for c in component_capacities)
    shortfall = max(0, target_quantity - max_producible)
    bottlenecks = [c for c in component_capacities if c["producible_units"] < target_quantity]
    bottlenecks.sort(key=lambda x: x["producible_units"])
    
    return {
        "target_quantity": target_quantity,
        "maximum_producible": max_producible,
        "target_shortfall": shortfall,
        "primary_bottleneck": bottlenecks[0] if bottlenecks else None,
        "secondary_bottlenecks": bottlenecks[1:] if len(bottlenecks) > 1 else [],
        "production_status": "PRODUCTION_READY" if shortfall == 0 else "PRODUCTION_AT_RISK",
        "components": component_capacities
    }

@router.post("/api/extension/evaluate-offer")
def evaluate_extension_supplier_offer(payload: Dict[str, Any]):
    part_id = payload.get("part_id", "ECU").upper().strip()
    offered_qty = int(payload.get("quantity", 0))
    lead_time = int(payload.get("lead_time_days", 7))
    unit_price = float(payload.get("unit_price", 0))
    supplier_name = payload.get("supplier_name", "External Vendor")
    
    comp = DATABASE["components"].get(part_id)
    if not comp:
        raise HTTPException(status_code=404, detail=f"Part {part_id} not found in SupplyShield registry.")
        
    usable = max(0, comp["available_stock"] - comp["reserved_stock"])
    target_need = 1000 - usable
    
    quantity_sufficient = offered_qty >= target_need
    lead_time_acceptable = lead_time <= 4
    price_reasonable = unit_price <= (comp["unit_cost"] * 1.35)
    
    overall_verdict = "ACCEPT" if (quantity_sufficient and lead_time_acceptable and price_reasonable) else "REVIEW_REQUIRED"
    
    return {
        "part_id": part_id,
        "target_need": target_need,
        "supplier_offer": {
            "supplier_name": supplier_name,
            "quantity": offered_qty,
            "lead_time_days": lead_time,
            "unit_price": unit_price
        },
        "evaluations": {
            "quantity_sufficient": quantity_sufficient,
            "lead_time_acceptable": lead_time_acceptable,
            "price_reasonable": price_reasonable
        },
        "verdict": overall_verdict,
        "recommendation": f"Offer from {supplier_name} satisfies {offered_qty} units in {lead_time} days. Compatible with Swift Dzire production deadline."
    }

@router.post("/api/ai/reason")
def ai_reasoning(payload: Dict[str, Any]):
    prompt = payload.get("prompt", "")
    context = payload.get("context", {})
    response = ask_sambanova_ai(prompt, context)
    return {"reasoning": response}

@router.websocket("/ws/digital-twin")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            event = json.loads(data)
            await manager.broadcast(event)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
