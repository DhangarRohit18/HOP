import { COMPONENT_MESH_MAP } from './componentMeshMap';

export interface QRValidationResult {
  part_id: string;
  is_canonical: boolean;
  qr_url: string;
  encoded_route: string;
  api_endpoint: string;
  has_mesh_mapping: boolean;
  status: 'VALID' | 'INVALID';
}

export const CANONICAL_27_PART_IDS = [
  'MOTOR_DRIVE',
  'INVERTER',
  'BATTERY',
  'BMS',
  'BRAKE_FRONT_LEFT',
  'BRAKE_FRONT_RIGHT',
  'ABS_CONTROLLER',
  'STEERING_SYSTEM',
  'VCU',
  'ECU',
  'SENSOR_FRONT',
  'CAMERA_FRONT',
  'LEFT_HEADLIGHT',
  'RIGHT_HEADLIGHT',
  'WHEEL_FL',
  'WHEEL_FR',
  'WHEEL_RL',
  'WHEEL_RR',
  'TIRE_FL',
  'TIRE_FR',
  'BATTERY_COOLING',
  'HVAC_COMPRESSOR',
  'FRONT_BUMPER',
  'REAR_BUMPER',
  'HOOD',
  'DOORS',
  'SEATS'
];

export function validateAllQRCodes(baseUrl: string = 'http://localhost:3000'): {
  total: number;
  valid_count: number;
  results: QRValidationResult[];
} {
  const results: QRValidationResult[] = CANONICAL_27_PART_IDS.map((partId) => {
    const isCanonical = CANONICAL_27_PART_IDS.includes(partId);
    const hasMesh = !!COMPONENT_MESH_MAP[partId];
    const qrUrl = `${baseUrl}/component/${partId}`;
    const encodedRoute = `/component/${partId}`;
    const apiEndpoint = `${baseUrl}/api/components/${partId}`;

    return {
      part_id: partId,
      is_canonical: isCanonical,
      qr_url: qrUrl,
      encoded_route: encodedRoute,
      api_endpoint: apiEndpoint,
      has_mesh_mapping: hasMesh,
      status: isCanonical && hasMesh ? 'VALID' : 'INVALID'
    };
  });

  const validCount = results.filter((r) => r.status === 'VALID').length;

  return {
    total: results.length,
    valid_count: validCount,
    results
  };
}
