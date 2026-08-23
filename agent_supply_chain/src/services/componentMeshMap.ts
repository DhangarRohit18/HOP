export interface MeshMappingRule {
  part_id: string;
  glb_node_names: string[];
  aliases: string[];
  focus_offset: [number, number, number];
  category: string;
}

export const COMPONENT_MESH_MAP: Record<string, MeshMappingRule> = {
  MOTOR_DRIVE: {
    part_id: 'MOTOR_DRIVE',
    glb_node_names: ['EngineBlock', 'MotorBlock', 'Powertrain', 'Drivetrain', 'Motor_Drive'],
    aliases: ['motor', 'drive motor', 'electric motor', 'dual motor', 'powertrain motor'],
    focus_offset: [0, 1.2, 2.2],
    category: 'POWERTRAIN'
  },
  INVERTER: {
    part_id: 'INVERTER',
    glb_node_names: ['Inverter', 'PowerElectronics', 'Inverter_Module'],
    aliases: ['inverter', 'power inverter', 'sic inverter'],
    focus_offset: [0, 1.4, -1.8],
    category: 'POWERTRAIN'
  },
  BATTERY: {
    part_id: 'BATTERY',
    glb_node_names: ['Battery', 'BatteryPack', 'Battery_Floor_Pack', 'FloorPan'],
    aliases: ['battery', 'battery pack', 'lithium battery', '85kwh pack', 'traction battery'],
    focus_offset: [0, 2.5, 3.5],
    category: 'ENERGY'
  },
  BMS: {
    part_id: 'BMS',
    glb_node_names: ['BMS', 'BatteryManagement', 'BMS_Controller'],
    aliases: ['bms', 'battery management system', 'battery controller'],
    focus_offset: [0.8, 1.2, -2.0],
    category: 'ENERGY'
  },
  BRAKE_FRONT_LEFT: {
    part_id: 'BRAKE_FRONT_LEFT',
    glb_node_names: ['BrakeCaliperFL', 'BrakeDiscFL', 'BrakeFL', 'WheelFrontL'],
    aliases: ['front left brake', 'left brake', 'fl brake', 'brake fl', 'left caliper'],
    focus_offset: [-2.2, 0.8, 2.2],
    category: 'BRAKING_AND_SAFETY'
  },
  BRAKE_FRONT_RIGHT: {
    part_id: 'BRAKE_FRONT_RIGHT',
    glb_node_names: ['BrakeCaliperFR', 'BrakeDiscFR', 'BrakeFR', 'WheelFrontR'],
    aliases: ['front right brake', 'right brake', 'fr brake', 'brake fr', 'right caliper'],
    focus_offset: [2.2, 0.8, 2.2],
    category: 'BRAKING_AND_SAFETY'
  },
  ABS_CONTROLLER: {
    part_id: 'ABS_CONTROLLER',
    glb_node_names: ['ABSController', 'HydraulicABS', 'ABS_Unit'],
    aliases: ['abs', 'abs controller', 'abs hydraulic unit'],
    focus_offset: [-1.2, 1.4, 2.0],
    category: 'BRAKING_AND_SAFETY'
  },
  STEERING_SYSTEM: {
    part_id: 'STEERING_SYSTEM',
    glb_node_names: ['InteriorSteeringCylinder', 'SteeringRack', 'SteeringWheel', 'Steering'],
    aliases: ['steering', 'steering rack', 'steer-by-wire', 'steering system', 'steering wheel'],
    focus_offset: [0, 1.4, 2.2],
    category: 'STEERING'
  },
  VCU: {
    part_id: 'VCU',
    glb_node_names: ['VCU', 'VehicleControlUnit', 'CentralVCU'],
    aliases: ['vcu', 'vehicle control unit', 'central vcu'],
    focus_offset: [-0.8, 1.5, 1.2],
    category: 'ELECTRONICS'
  },
  ECU: {
    part_id: 'ECU',
    glb_node_names: ['ECU', 'DriveController', 'AutonomousECU', 'BrainModule'],
    aliases: ['ecu', 'autonomous controller', 'drive controller', 'ad controller'],
    focus_offset: [0, 1.6, 1.8],
    category: 'ELECTRONICS'
  },
  SENSOR_FRONT: {
    part_id: 'SENSOR_FRONT',
    glb_node_names: ['FrontLiDAR', 'LiDARArray', 'SensorFront', 'LiDAR'],
    aliases: ['lidar', 'front lidar', 'front sensor', 'lidar array', 'solid state lidar'],
    focus_offset: [0, 1.2, 3.5],
    category: 'ADAS_AND_SENSORS'
  },
  CAMERA_FRONT: {
    part_id: 'CAMERA_FRONT',
    glb_node_names: ['TriFocusCamera', 'FrontCamera', 'CameraModule'],
    aliases: ['camera', 'front camera', 'triple camera', 'vision camera'],
    focus_offset: [0, 1.6, 2.8],
    category: 'ADAS_AND_SENSORS'
  },
  LEFT_HEADLIGHT: {
    part_id: 'LEFT_HEADLIGHT',
    glb_node_names: ['HeadlightLeft', 'HeadlightL', 'HeadlampFL', 'LightFrontL'],
    aliases: ['left headlight', 'headlight left', 'driver headlight', 'lh headlight', 'left headlamp'],
    focus_offset: [-1.8, 1.2, 3.2],
    category: 'LIGHTING'
  },
  RIGHT_HEADLIGHT: {
    part_id: 'RIGHT_HEADLIGHT',
    glb_node_names: ['HeadlightRight', 'HeadlightR', 'HeadlampFR', 'LightFrontR'],
    aliases: ['right headlight', 'headlight right', 'passenger headlight', 'rh headlight', 'right headlamp'],
    focus_offset: [1.8, 1.2, 3.2],
    category: 'LIGHTING'
  },
  WHEEL_FL: {
    part_id: 'WHEEL_FL',
    glb_node_names: ['WheelFrontL', 'Wheel_FL', 'RimFrontL'],
    aliases: ['wheel fl', 'front left wheel', 'left front wheel', 'alloy wheel fl'],
    focus_offset: [-2.5, 0.8, 2.2],
    category: 'WHEELS'
  },
  WHEEL_FR: {
    part_id: 'WHEEL_FR',
    glb_node_names: ['WheelFrontR', 'Wheel_FR', 'RimFrontR'],
    aliases: ['wheel fr', 'front right wheel', 'right front wheel', 'alloy wheel fr'],
    focus_offset: [2.5, 0.8, 2.2],
    category: 'WHEELS'
  },
  WHEEL_RL: {
    part_id: 'WHEEL_RL',
    glb_node_names: ['WheelRearL', 'Wheel_RL', 'RimRearL'],
    aliases: ['wheel rl', 'rear left wheel', 'left rear wheel', 'alloy wheel rl'],
    focus_offset: [-2.5, 0.8, -2.2],
    category: 'WHEELS'
  },
  WHEEL_RR: {
    part_id: 'WHEEL_RR',
    glb_node_names: ['WheelRearR', 'Wheel_RR', 'RimRearR'],
    aliases: ['wheel rr', 'rear right wheel', 'right rear wheel', 'alloy wheel rr'],
    focus_offset: [2.5, 0.8, -2.2],
    category: 'WHEELS'
  },
  TIRE_FL: {
    part_id: 'TIRE_FL',
    glb_node_names: ['TireFrontL', 'Tire_FL'],
    aliases: ['tire fl', 'front left tire', 'ev tire fl'],
    focus_offset: [-2.5, 0.8, 2.2],
    category: 'TIRES'
  },
  TIRE_FR: {
    part_id: 'TIRE_FR',
    glb_node_names: ['TireFrontR', 'Tire_FR'],
    aliases: ['tire fr', 'front right tire', 'ev tire fr'],
    focus_offset: [2.5, 0.8, 2.2],
    category: 'TIRES'
  },
  BATTERY_COOLING: {
    part_id: 'BATTERY_COOLING',
    glb_node_names: ['CoolingRadiator', 'BatteryChiller', 'HeatExchanger'],
    aliases: ['battery cooling', 'chiller', 'heat exchanger', 'radiator'],
    focus_offset: [0, 1.2, 3.0],
    category: 'THERMAL'
  },
  HVAC_COMPRESSOR: {
    part_id: 'HVAC_COMPRESSOR',
    glb_node_names: ['HVACCompressor', 'HeatPump', 'CompressorModule'],
    aliases: ['hvac compressor', 'heat pump', 'compressor', 'ac compressor'],
    focus_offset: [1.2, 1.2, 1.8],
    category: 'THERMAL'
  },
  FRONT_BUMPER: {
    part_id: 'FRONT_BUMPER',
    glb_node_names: ['BodyFrontBumper', 'FasciaFront', 'BumperFront'],
    aliases: ['front bumper', 'front fascia', 'bumper front'],
    focus_offset: [0, 1.0, 3.8],
    category: 'BODY'
  },
  REAR_BUMPER: {
    part_id: 'REAR_BUMPER',
    glb_node_names: ['BodyRearPanelsColor1', 'DiffuserRear', 'BumperRear', 'Hatch'],
    aliases: ['rear bumper', 'rear diffuser', 'diffuser', 'hatch', 'rear panels'],
    focus_offset: [0, 1.2, -3.8],
    category: 'BODY'
  },
  HOOD: {
    part_id: 'HOOD',
    glb_node_names: ['BodyHood', 'Hood', 'FrunkHood'],
    aliases: ['hood', 'frunk', 'engine hood', 'front hood'],
    focus_offset: [0, 1.6, 2.4],
    category: 'BODY'
  },
  DOORS: {
    part_id: 'DOORS',
    glb_node_names: ['BodyDoorLColor1', 'BodyDoorRColor1', 'Doors', 'DoorLeft', 'DoorRight'],
    aliases: ['doors', 'scissor doors', 'left door', 'right door', 'side doors'],
    focus_offset: [2.2, 1.5, 0],
    category: 'BODY'
  },
  SEATS: {
    part_id: 'SEATS',
    glb_node_names: ['InteriorSeats', 'DriverSeat', 'PassengerSeat', 'Seats'],
    aliases: ['seats', 'front seats', 'driver seat', 'passenger seat', 'vegan leather seats'],
    focus_offset: [0, 1.4, 0.4],
    category: 'INTERIOR'
  }
};

export function resolveSearchQueryToPart(query: string): string | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  // 1. Exact Part ID match
  if (COMPONENT_MESH_MAP[q.toUpperCase()]) {
    return q.toUpperCase();
  }

  // 2. Alias match
  for (const [partId, rule] of Object.entries(COMPONENT_MESH_MAP)) {
    if (rule.aliases.some(alias => q.includes(alias) || alias.includes(q))) {
      return partId;
    }
  }

  return null;
}
