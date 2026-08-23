import * as THREE from 'three';

export interface TransformSnapshot {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
}

export interface VehicleKinematicsState {
  doorsOpen: boolean;
  hoodOpen: boolean;
  collapsed: boolean;
}

export class VehicleKinematicsController {
  private originalTransforms: Map<THREE.Object3D, TransformSnapshot> = new Map();
  
  // Specific kinematic nodes in CarConcept.glb
  private leftDoorNode: THREE.Object3D | null = null;
  private rightDoorNode: THREE.Object3D | null = null;
  private hoodNode: THREE.Object3D | null = null;
  private rearPanelsNode: THREE.Object3D | null = null;
  private roofNode: THREE.Object3D | null = null;
  private wheelFL: THREE.Object3D | null = null;
  private wheelFR: THREE.Object3D | null = null;
  private wheelRL: THREE.Object3D | null = null;
  private wheelRR: THREE.Object3D | null = null;
  private engineNode: THREE.Object3D | null = null;
  private seatsNode: THREE.Object3D | null = null;

  // External Subsystems added to carModel
  private batteryNode: THREE.Object3D | null = null;
  private motorNode: THREE.Object3D | null = null;
  private inverterNode: THREE.Object3D | null = null;
  private ecuNode: THREE.Object3D | null = null;
  private sensorFrontNode: THREE.Object3D | null = null;
  private headlightLNode: THREE.Object3D | null = null;
  private headlightRNode: THREE.Object3D | null = null;
  private brakeFLNode: THREE.Object3D | null = null;
  private brakeFRNode: THREE.Object3D | null = null;

  // Continuous animation progress (0.0 to 1.0)
  public doorProgress: number = 0;
  public hoodProgress: number = 0;
  public explodeProgress: number = 0;

  /**
   * Initializes and indexes all actual named nodes from CarConcept.glb
   */
  public initialize(root: THREE.Object3D): void {
    this.originalTransforms.clear();

    const findNode = (name: string): THREE.Object3D | null => {
      let found: THREE.Object3D | null = null;
      root.traverse((node) => {
        if (node.name.toLowerCase() === name.toLowerCase()) {
          found = node;
        }
      });
      return found;
    };

    // 1. Capture immutable original factory transforms for EVERY node in the hierarchy ONCE
    root.traverse((node) => {
      this.originalTransforms.set(node, {
        position: node.position.clone(),
        rotation: node.rotation.clone(),
        quaternion: node.quaternion.clone(),
        scale: node.scale.clone()
      });
    });

    // 2. Discover exact GLB nodes
    this.leftDoorNode = findNode('BodyDoorLColor1');
    this.rightDoorNode = findNode('BodyDoorRColor1');
    this.hoodNode = findNode('BodyHood');
    this.rearPanelsNode = findNode('BodyRearPanelsColor1');
    this.roofNode = findNode('BodyRoofPanel');
    this.wheelFL = findNode('WheelFrontL');
    this.wheelFR = findNode('WheelFrontR');
    this.wheelRL = findNode('WheelRearL');
    this.wheelRR = findNode('WheelRearR');
    this.engineNode = findNode('Engine');
    this.seatsNode = findNode('InteriorSeatsColor1');

    // 3. Discover exact semantic subsystem anchors
    this.batteryNode = findNode('BATTERY');
    this.motorNode = findNode('MOTOR_DRIVE');
    this.inverterNode = findNode('INVERTER');
    this.ecuNode = findNode('ECU');
    this.sensorFrontNode = findNode('SENSOR_FRONT');
    this.headlightLNode = findNode('LEFT_HEADLIGHT');
    this.headlightRNode = findNode('RIGHT_HEADLIGHT');
    this.brakeFLNode = findNode('BRAKE_FRONT_LEFT');
    this.brakeFRNode = findNode('BRAKE_FRONT_RIGHT');

    console.log('[SupplyShield Kinematics] Initialized ultra-clear expanded engineering digital twin assemblies.');
  }

  /**
   * Resets all objects to their exact initial captured transforms
   */
  public reset(): void {
    this.doorProgress = 0;
    this.hoodProgress = 0;
    this.explodeProgress = 0;

    this.originalTransforms.forEach((snapshot, node) => {
      node.position.copy(snapshot.position);
      node.rotation.copy(snapshot.rotation);
      node.quaternion.copy(snapshot.quaternion);
      node.scale.copy(snapshot.scale);
    });
  }

  /**
   * Smoothly updates object transforms frame-by-frame using cubic easing.
   * Generous, distinct, ultra-clear engineering explosion layout:
   * Local +X = World +X (Right)
   * Local -X = World -X (Left)
   * Local +Y = World -Z (Rearward)
   * Local -Y = World +Z (Forward)
   * Local +Z = World +Y (Upward)
   * Local -Z = World -Y (Downward)
   * Local Z rotation = World Y rotation (horizontal door yaw)
   */
  public update(targetState: VehicleKinematicsState, lerpSpeed: number = 0.08): void {
    const targetDoor = targetState.doorsOpen ? 1.0 : 0.0;
    const targetHood = targetState.hoodOpen ? 1.0 : 0.0;
    const targetExplode = targetState.collapsed ? 1.0 : 0.0;

    this.doorProgress = THREE.MathUtils.lerp(this.doorProgress, targetDoor, lerpSpeed);
    this.hoodProgress = THREE.MathUtils.lerp(this.hoodProgress, targetHood, lerpSpeed);
    this.explodeProgress = THREE.MathUtils.lerp(this.explodeProgress, targetExplode, lerpSpeed);

    const easedExplode = this.easeOutCubic(this.explodeProgress);
    const easedDoor = this.easeOutCubic(this.doorProgress);
    const easedHood = this.easeOutCubic(this.hoodProgress);

    // 1. LEFT DOOR KINEMATICS (Node 65: BodyDoorLColor1)
    if (this.leftDoorNode && this.originalTransforms.has(this.leftDoorNode)) {
      const orig = this.originalTransforms.get(this.leftDoorNode)!;
      const expX = easedExplode * 1.25;
      const doorYaw = easedDoor * 0.75;
      const doorOpenOffset = easedDoor * 0.20;

      this.leftDoorNode.position.set(
        orig.position.x + expX + doorOpenOffset,
        orig.position.y,
        orig.position.z
      );
      this.leftDoorNode.rotation.set(orig.rotation.x, orig.rotation.y, orig.rotation.z + doorYaw);
    }

    // 2. RIGHT DOOR KINEMATICS (Node 50: BodyDoorRColor1)
    if (this.rightDoorNode && this.originalTransforms.has(this.rightDoorNode)) {
      const orig = this.originalTransforms.get(this.rightDoorNode)!;
      const expX = -easedExplode * 1.25;
      const doorYaw = -easedDoor * 0.75;
      const doorOpenOffset = -easedDoor * 0.20;

      this.rightDoorNode.position.set(
        orig.position.x + expX + doorOpenOffset,
        orig.position.y,
        orig.position.z
      );
      this.rightDoorNode.rotation.set(orig.rotation.x, orig.rotation.y, orig.rotation.z + doorYaw);
    }

    // 3. HOOD KINEMATICS (Node 44: BodyHood) - Forward in Local -Y / World +Z and Up in Local +Z / World +Y
    if (this.hoodNode && this.originalTransforms.has(this.hoodNode)) {
      const orig = this.originalTransforms.get(this.hoodNode)!;
      const expForward = -easedExplode * 1.40;
      const expUp = easedExplode * 0.85;

      const hoodTilt = easedHood * 0.60;
      const hoodLift = easedHood * 0.30;

      this.hoodNode.position.set(
        orig.position.x,
        orig.position.y + expForward,
        orig.position.z + expUp + hoodLift
      );
      this.hoodNode.rotation.set(orig.rotation.x + hoodTilt, orig.rotation.y, orig.rotation.z);
    }

    // 4. REAR PANELS / HATCH (Node 34: BodyRearPanelsColor1) - Rearward in Local +Y / World -Z and Up in Local +Z / World +Y
    if (this.rearPanelsNode && this.originalTransforms.has(this.rearPanelsNode)) {
      const orig = this.originalTransforms.get(this.rearPanelsNode)!;
      const expRear = easedExplode * 1.40;
      const expUp = easedExplode * 0.75;

      this.rearPanelsNode.position.set(
        orig.position.x,
        orig.position.y + expRear,
        orig.position.z + expUp
      );
    }

    // 5. ROOF PANEL (Node 33: BodyRoofPanel) - Elevates high in Local +Z / World +Y to fully reveal the interior cabin
    if (this.roofNode && this.originalTransforms.has(this.roofNode)) {
      const orig = this.originalTransforms.get(this.roofNode)!;
      const expUp = easedExplode * 1.65;

      this.roofNode.position.set(
        orig.position.x,
        orig.position.y,
        orig.position.z + expUp
      );
    }

    // 6. FOUR WHEELS - Symmetrically separate outward along lateral X axles
    if (this.wheelFL && this.originalTransforms.has(this.wheelFL)) {
      const orig = this.originalTransforms.get(this.wheelFL)!;
      this.wheelFL.position.set(orig.position.x + easedExplode * 1.25, orig.position.y, orig.position.z);
    }
    if (this.wheelRL && this.originalTransforms.has(this.wheelRL)) {
      const orig = this.originalTransforms.get(this.wheelRL)!;
      this.wheelRL.position.set(orig.position.x + easedExplode * 1.25, orig.position.y, orig.position.z);
    }
    if (this.wheelFR && this.originalTransforms.has(this.wheelFR)) {
      const orig = this.originalTransforms.get(this.wheelFR)!;
      this.wheelFR.position.set(orig.position.x - easedExplode * 1.25, orig.position.y, orig.position.z);
    }
    if (this.wheelRR && this.originalTransforms.has(this.wheelRR)) {
      const orig = this.originalTransforms.get(this.wheelRR)!;
      this.wheelRR.position.set(orig.position.x - easedExplode * 1.25, orig.position.y, orig.position.z);
    }

    // 7. CABIN SEATS & DASHBOARD (Elevate comfortably in Local +Z / World +Y)
    if (this.seatsNode && this.originalTransforms.has(this.seatsNode)) {
      const orig = this.originalTransforms.get(this.seatsNode)!;
      this.seatsNode.position.set(orig.position.x, orig.position.y, orig.position.z + easedExplode * 0.60);
    }

    // 8. UNDERFLOOR BATTERY PACK - Clean downward separation in World -Y underneath the chassis
    if (this.batteryNode && this.originalTransforms.has(this.batteryNode)) {
      const orig = this.originalTransforms.get(this.batteryNode)!;
      this.batteryNode.position.set(orig.position.x, orig.position.y - easedExplode * 1.25, orig.position.z);
    }

    // 9. POWERTRAIN MOTOR & INVERTER - Rearward in World -Z & separated vertically
    if (this.motorNode && this.originalTransforms.has(this.motorNode)) {
      const orig = this.originalTransforms.get(this.motorNode)!;
      this.motorNode.position.set(orig.position.x, orig.position.y - easedExplode * 0.45, orig.position.z - easedExplode * 1.15);
    }
    if (this.inverterNode && this.originalTransforms.has(this.inverterNode)) {
      const orig = this.originalTransforms.get(this.inverterNode)!;
      this.inverterNode.position.set(orig.position.x, orig.position.y + easedExplode * 0.65, orig.position.z - easedExplode * 1.15);
    }

    // 10. ADAS SENSORS & HEADLIGHTS - Forward in World +Z with lateral spread
    if (this.sensorFrontNode && this.originalTransforms.has(this.sensorFrontNode)) {
      const orig = this.originalTransforms.get(this.sensorFrontNode)!;
      this.sensorFrontNode.position.set(orig.position.x, orig.position.y + easedExplode * 0.45, orig.position.z + easedExplode * 1.40);
    }
    if (this.headlightLNode && this.originalTransforms.has(this.headlightLNode)) {
      const orig = this.originalTransforms.get(this.headlightLNode)!;
      this.headlightLNode.position.set(orig.position.x - easedExplode * 0.65, orig.position.y + easedExplode * 0.45, orig.position.z + easedExplode * 1.30);
    }
    if (this.headlightRNode && this.originalTransforms.has(this.headlightRNode)) {
      const orig = this.originalTransforms.get(this.headlightRNode)!;
      this.headlightRNode.position.set(orig.position.x + easedExplode * 0.65, orig.position.y + easedExplode * 0.45, orig.position.z + easedExplode * 1.30);
    }
  }

  private easeOutCubic(x: number): number {
    return 1 - Math.pow(1 - x, 3);
  }
}
