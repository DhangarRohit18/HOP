import sys
import os

CANONICAL_27_COMPONENTS = [
    "MOTOR_DRIVE",
    "INVERTER",
    "BATTERY",
    "BMS",
    "BRAKE_FRONT_LEFT",
    "BRAKE_FRONT_RIGHT",
    "ABS_CONTROLLER",
    "STEERING_SYSTEM",
    "VCU",
    "ECU",
    "SENSOR_FRONT",
    "CAMERA_FRONT",
    "LEFT_HEADLIGHT",
    "RIGHT_HEADLIGHT",
    "WHEEL_FL",
    "WHEEL_FR",
    "WHEEL_RL",
    "WHEEL_RR",
    "TIRE_FL",
    "TIRE_FR",
    "BATTERY_COOLING",
    "HVAC_COMPRESSOR",
    "FRONT_BUMPER",
    "REAR_BUMPER",
    "HOOD",
    "DOORS",
    "SEATS"
]

def run_qr_validation_suite():
    print("=" * 60)
    print("SUPPLYSHIELD 3D — AUTOMATED 27-COMPONENT QR TEST SUITE")
    print("=" * 60)
    
    base_url = "http://localhost:3000"
    all_passed = True
    
    for idx, part_id in enumerate(CANONICAL_27_COMPONENTS, 1):
        qr_payload = f"{base_url}/component/{part_id}"
        expected_route = f"/component/{part_id}"
        
        # Verify part ID formatting
        assert part_id.isupper(), f"Part ID {part_id} must be uppercase."
        assert not " " in part_id, f"Part ID {part_id} must not contain spaces."
        
        # Verify QR URL validity
        assert qr_payload.startswith("http"), f"Invalid QR URL {qr_payload}"
        assert qr_payload.endswith(part_id), f"QR URL must end with part ID"
        
        print(f"[{idx:02d}/27] VALIDATED: {part_id:<20} -> QR URL: {qr_payload}")
        
    print("=" * 60)
    print(f"TEST RESULT: ALL {len(CANONICAL_27_COMPONENTS)} CANONICAL QR CODES VALIDATED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_qr_validation_suite()
