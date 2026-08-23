import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { Part, VisualStatus } from '../../types/supplyChain';
import { COMPONENT_MESH_MAP } from '../../services/componentMeshMap';
import { VehicleKinematicsController } from '../../services/vehicleKinematics';
import {
  RotateCcw,
  Layers,
  Car,
  DoorOpen,
  Sun
} from 'lucide-react';

interface Vehicle3DViewerProps {
  parts: Part[];
  selectedPartId: string | null;
  onSelectPart: (partId: string) => void;
  disruptionPartId?: string;
  explodedView?: boolean;
  onToggleExplodedView?: () => void;
}

const STATUS_COLORS: Record<VisualStatus, number> = {
  GREEN: 0x10b981,
  YELLOW: 0xf59e0b,
  RED: 0xef4444,
  BLUE: 0x1d4ed8,
  PURPLE: 0x8b5cf6
};

export const Vehicle3DViewer: React.FC<Vehicle3DViewerProps> = ({
  parts,
  selectedPartId,
  onSelectPart,
  disruptionPartId,
  explodedView = false,
  onToggleExplodedView
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [hoodOpen, setHoodOpen] = useState(false);
  const [internalExploded, setInternalExploded] = useState(explodedView);
  const [brightness, setBrightness] = useState(1.25);
  const [loadingProgress, setLoadingProgress] = useState<number | null>(0);
  const [activeCameraView, setActiveCameraView] = useState<'3/4' | 'SIDE' | 'FRONT' | 'TOP' | 'REAR'>('3/4');

  // Sync external explodedView prop with internal state if provided
  useEffect(() => {
    setInternalExploded(explodedView);
  }, [explodedView]);

  // Dedicated Vehicle Kinematics Controller Instance
  const kinematicsControllerRef = useRef<VehicleKinematicsController>(new VehicleKinematicsController());

  // References for Three.js state
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const carModelRef = useRef<THREE.Group | null>(null);
  const interactiveMeshesRef = useRef<Map<THREE.Object3D, string>>(new Map());
  const partNodesRef = useRef<{ [key: string]: THREE.Object3D }>({});
  const originalMaterialsRef = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());
  const prevSelectedPartIdRef = useRef<string | null>(null);
  const isUserInteractingRef = useRef<boolean>(false);
  
  // Animation targets
  const targetCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(3.8, 1.9, 5.0));
  const targetLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0.35, 0));

  // Camera Presets Execution Handler
  const setCameraPreset = (view: '3/4' | 'SIDE' | 'FRONT' | 'TOP' | 'REAR') => {
    setActiveCameraView(view);
    const isExp = onToggleExplodedView ? (explodedView ?? false) : internalExploded;
    const scaleFactor = isExp ? 1.65 : 1.0;

    switch (view) {
      case '3/4':
        targetCamPosRef.current.set(3.8 * scaleFactor, 1.9 * scaleFactor, 5.0 * scaleFactor);
        targetLookAtRef.current.set(0, 0.35, 0);
        break;
      case 'SIDE':
        targetCamPosRef.current.set(5.5 * scaleFactor, 0.4 * scaleFactor, 0);
        targetLookAtRef.current.set(0, 0.35, 0);
        break;
      case 'FRONT':
        targetCamPosRef.current.set(0, 0.6 * scaleFactor, 5.5 * scaleFactor);
        targetLookAtRef.current.set(0, 0.35, 0);
        break;
      case 'TOP':
        targetCamPosRef.current.set(0.01, 7.0 * scaleFactor, 0.01);
        targetLookAtRef.current.set(0, 0, 0);
        break;
      case 'REAR':
        targetCamPosRef.current.set(0, 0.7 * scaleFactor, -5.5 * scaleFactor);
        targetLookAtRef.current.set(0, 0.35, 0);
        break;
    }
  };

  // Re-evaluate camera distance when exploded mode changes
  useEffect(() => {
    setCameraPreset(activeCameraView);
  }, [internalExploded, explodedView]);

  // Smooth Camera Focus only when user explicitly changes selected part
  useEffect(() => {
    if (selectedPartId && selectedPartId !== prevSelectedPartIdRef.current) {
      prevSelectedPartIdRef.current = selectedPartId;
      const selectedPart = parts.find((p) => p.part_id === selectedPartId);
      if (selectedPart) {
        const mapping = COMPONENT_MESH_MAP[selectedPart.part_id];
        const offset = mapping ? mapping.focus_offset : [2.0, 1.2, 2.0];
        const [pX, pY, pZ] = selectedPart.position_3d;

        targetCamPosRef.current.set(pX * 0.7 + offset[0], pY * 0.7 + offset[1], pZ * 0.7 + offset[2]);
        targetLookAtRef.current.set(pX * 0.7, pY * 0.7 + 0.2, pZ * 0.7);
      }
    }
  }, [selectedPartId, parts]);

  // Dynamic Highlight of Selected & Disrupted Parts
  useEffect(() => {
    if (!carModelRef.current) return;

    // Reset non-selected meshes to original materials
    originalMaterialsRef.current.forEach((origMat, mesh) => {
      mesh.material = origMat;
      if (mesh.name.startsWith('Anchor_')) {
        mesh.visible = false;
      }
    });

    // Highlight selected part
    if (selectedPartId) {
      const targetNode = partNodesRef.current[selectedPartId];
      const selectedPart = parts.find((p) => p.part_id === selectedPartId);
      const highlightColor = selectedPart?.status ? STATUS_COLORS[selectedPart.status] : 0x1d4ed8;

      if (targetNode) {
        targetNode.visible = true;
        targetNode.traverse((child: any) => {
          if (child.isMesh) {
            child.visible = true;
            child.material = new THREE.MeshStandardMaterial({
              color: highlightColor,
              emissive: highlightColor,
              emissiveIntensity: 0.6,
              roughness: 0.2,
              metalness: 0.8
            });
          }
        });
      }
    }

    // Highlight disrupted part if different
    if (disruptionPartId && disruptionPartId !== selectedPartId) {
      const disNode = partNodesRef.current[disruptionPartId];
      if (disNode) {
        disNode.visible = true;
        disNode.traverse((child: any) => {
          if (child.isMesh) {
            child.visible = true;
            child.material = new THREE.MeshStandardMaterial({
              color: 0xef4444,
              emissive: 0xef4444,
              emissiveIntensity: 0.6,
              roughness: 0.2
            });
          }
        });
      }
    }
  }, [selectedPartId, disruptionPartId, parts]);

  // Adjust Renderer Exposure
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.toneMappingExposure = brightness;
    }
  }, [brightness]);

  // Toggle Collapse / Exploded View
  const handleToggleCollapse = () => {
    const nextState = onToggleExplodedView ? !explodedView : !internalExploded;
    if (onToggleExplodedView) {
      onToggleExplodedView();
    } else {
      setInternalExploded(nextState);
    }
  };

  // Complete Reset Handler
  const handleResetAll = () => {
    setDoorsOpen(false);
    setHoodOpen(false);
    if (onToggleExplodedView && explodedView) {
      onToggleExplodedView();
    } else {
      setInternalExploded(false);
    }
    kinematicsControllerRef.current.reset();
    setCameraPreset('3/4');
  };

  // Main Three.js Scene Setup & GLB Loading
  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 560;

    // 1. Scene & Environment (Clean Pure White Studio)
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xffffff);
    scene.fog = new THREE.Fog(0xffffff, 10, 32);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(3.8, 1.9, 5.0);
    camera.lookAt(0, 0.35, 0);
    cameraRef.current = camera;

    // 3. Renderer with PBR ACES Tone Mapping & Shadows
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.8);
    keyLight.position.set(6, 9, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 1.8);
    fillLight.position.set(-5, 3, -3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 2.5);
    rimLight.position.set(0, 2, -6);
    scene.add(rimLight);

    // 5. Ground Studio Floor & Polar Grid
    const groundGeo = new THREE.PlaneGeometry(30, 30);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.4,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    const polarGrid = new THREE.PolarGridHelper(7.0, 16, 8, 64, 0x1d4ed8, 0x93c5fd);
    polarGrid.position.y = 0.001;
    scene.add(polarGrid);

    // 6. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2.0;
    controls.maxDistance = 14.0;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.target.set(0, 0.35, 0);
    controlsRef.current = controls;

    controls.addEventListener('start', () => {
      isUserInteractingRef.current = true;
    });

    controls.addEventListener('end', () => {
      isUserInteractingRef.current = false;
      targetCamPosRef.current.copy(camera.position);
      targetLookAtRef.current.copy(controls.target);
    });

    // 7. Load DRACO-Compressed Concept Car GLB
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    interactiveMeshesRef.current.clear();
    originalMaterialsRef.current.clear();
    partNodesRef.current = {};

    gltfLoader.load(
      '/models/automotive/CarConcept.glb',
      (gltf) => {
        const carModel = gltf.scene;
        carModelRef.current = carModel;

        const box = new THREE.Box3().setFromObject(carModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 4.2 / maxDim;
        carModel.scale.setScalar(scale);
        carModel.position.set(-center.x * scale, -center.y * scale + 0.38, -center.z * scale);

        // Realistic Decent Maruti Passenger Car Materials
        const marutiWhitePaint = new THREE.MeshPhysicalMaterial({
          color: 0xf8fafc,       // Pearl Arctic White
          metalness: 0.7,
          roughness: 0.2,
          clearcoat: 0.9,
          clearcoatRoughness: 0.1
        });

        const windowGlass = new THREE.MeshPhysicalMaterial({
          color: 0x0f172a,
          metalness: 0.1,
          roughness: 0.05,
          transmission: 0.85,
          transparent: true,
          opacity: 0.65
        });

        const blackTrim = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          roughness: 0.8,
          metalness: 0.1
        });

        const alloyWheel = new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          metalness: 0.85,
          roughness: 0.25
        });

        const findNode = (root: THREE.Object3D, name: string): THREE.Object3D | null => {
          if (root.name === name) return root;
          for (const child of root.children) {
            const found = findNode(child, name);
            if (found) return found;
          }
          return null;
        };

        const doorL = findNode(carModel, 'BodyDoorLColor1');
        const doorR = findNode(carModel, 'BodyDoorRColor1');
        const hood = findNode(carModel, 'BodyHood');
        const hatch = findNode(carModel, 'BodyRearPanelsColor1');
        const wheelFL = findNode(carModel, 'WheelFrontL');
        const wheelFR = findNode(carModel, 'WheelFrontR');
        const wheelRL = findNode(carModel, 'WheelRearL');
        const wheelRR = findNode(carModel, 'WheelRearR');
        const steering = findNode(carModel, 'InteriorSteeringCylinder');

        if (doorL) partNodesRef.current['DOORS_L'] = doorL;
        if (doorR) partNodesRef.current['DOORS_R'] = doorR;
        if (hood) partNodesRef.current['HOOD'] = hood;
        if (hatch) partNodesRef.current['REAR_BUMPER'] = hatch;
        if (wheelFL) partNodesRef.current['WHEEL_FL'] = wheelFL;
        if (wheelFR) partNodesRef.current['WHEEL_FR'] = wheelFR;
        if (wheelRL) partNodesRef.current['WHEEL_RL'] = wheelRL;
        if (wheelRR) partNodesRef.current['WHEEL_RR'] = wheelRR;
        if (steering) partNodesRef.current['STEERING_SYSTEM'] = steering;

        carModel.traverse((node: any) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;

            const nodeName = node.name.toLowerCase();

            // Apply clean materials
            if (nodeName.includes('body') || nodeName.includes('door') || nodeName.includes('hood') || nodeName.includes('roof')) {
              node.material = marutiWhitePaint;
            } else if (nodeName.includes('glass') || nodeName.includes('windshield') || nodeName.includes('window')) {
              node.material = windowGlass;
            } else if (nodeName.includes('tire') || nodeName.includes('wheelrubber')) {
              node.material = blackTrim;
            } else if (nodeName.includes('rim') || nodeName.includes('wheelfront') || nodeName.includes('wheelrear')) {
              node.material = alloyWheel;
            }

            originalMaterialsRef.current.set(node, node.material);

            let matchedPartId: string | null = null;
            if (nodeName.includes('door')) matchedPartId = 'DOORS';
            else if (nodeName.includes('hood')) matchedPartId = 'HOOD';
            else if (nodeName.includes('rear') || nodeName.includes('diffuser')) matchedPartId = 'REAR_BUMPER';
            else if (nodeName.includes('wheelfrontl')) matchedPartId = 'WHEEL_FL';
            else if (nodeName.includes('wheelfrontr')) matchedPartId = 'WHEEL_FR';
            else if (nodeName.includes('wheelrearl')) matchedPartId = 'WHEEL_RL';
            else if (nodeName.includes('wheelrearr')) matchedPartId = 'WHEEL_RR';
            else if (nodeName.includes('steering')) matchedPartId = 'STEERING_SYSTEM';
            else if (nodeName.includes('seat')) matchedPartId = 'SEATS';
            else if (nodeName.includes('bumper') || nodeName.includes('front')) matchedPartId = 'FRONT_BUMPER';

            if (matchedPartId) {
              interactiveMeshesRef.current.set(node, matchedPartId);
            }
          }
        });

        // Precision Anchors for all registered electrical & powertrain subsystems
        const createPartAnchor = (partId: string, pos: [number, number, number], scale: [number, number, number]) => {
          const geom = new THREE.BoxGeometry(scale[0], scale[1], scale[2]);
          const mat = new THREE.MeshStandardMaterial({
            color: 0x1d4ed8,
            emissive: 0x1d4ed8,
            emissiveIntensity: 0.4,
            transparent: true,
            opacity: 0.85,
            roughness: 0.3
          });

          const mesh = new THREE.Mesh(geom, mat);
          mesh.name = `Anchor_${partId}`;
          mesh.position.set(pos[0], pos[1], pos[2]);
          mesh.visible = false;
          interactiveMeshesRef.current.set(mesh, partId);
          carModel.add(mesh);
          partNodesRef.current[partId] = mesh;
          originalMaterialsRef.current.set(mesh, mat);
          return mesh;
        };

        // Precision anchors situated within real vehicle interior bounds
        createPartAnchor('LEFT_HEADLIGHT', [-0.72, 0.42, 1.78], [0.18, 0.14, 0.2]);
        createPartAnchor('RIGHT_HEADLIGHT', [0.72, 0.42, 1.78], [0.18, 0.14, 0.2]);
        createPartAnchor('BATTERY', [0, 0.08, 0.0], [1.3, 0.08, 1.9]);
        createPartAnchor('BMS', [0.35, 0.12, -0.6], [0.25, 0.1, 0.25]);
        createPartAnchor('MOTOR_DRIVE', [0, 0.28, -0.7], [0.6, 0.28, 0.6]);
        createPartAnchor('INVERTER', [0, 0.46, -0.7], [0.35, 0.16, 0.35]);
        createPartAnchor('ECU', [0, 0.52, 0.35], [0.32, 0.12, 0.32]);
        createPartAnchor('SENSOR_FRONT', [0, 0.38, 1.95], [0.25, 0.12, 0.15]);
        createPartAnchor('BRAKE_FRONT_LEFT', [-0.85, 0.26, 1.25], [0.12, 0.18, 0.18]);
        createPartAnchor('BRAKE_FRONT_RIGHT', [0.85, 0.26, 1.25], [0.12, 0.18, 0.18]);

        // Initialize dedicated Kinematics Controller with all captured transforms
        kinematicsControllerRef.current.initialize(carModel);

        scene.add(carModel);
        setLoadingProgress(null);
      },
      (progress) => {
        if (progress.total > 0) {
          setLoadingProgress(Math.round((progress.loaded / progress.total) * 100));
        }
      },
      (err) => {
        console.error('Error loading CarConcept.glb:', err);
        setLoadingProgress(null);
      }
    );

    // 8. Interactive Raycasting Click Handler
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(Array.from(interactiveMeshesRef.current.keys()), true);

      if (intersects.length > 0) {
        let hitObj: THREE.Object3D | null = intersects[0].object;
        while (hitObj && !interactiveMeshesRef.current.has(hitObj)) {
          hitObj = hitObj.parent;
        }
        if (hitObj) {
          const partId = interactiveMeshesRef.current.get(hitObj);
          if (partId) {
            onSelectPart(partId);
          }
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    // 9. Resize Handler
    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 10. Animation & Kinematics Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth camera interpolation if user is not actively dragging
      if (!isUserInteractingRef.current) {
        camera.position.lerp(targetCamPosRef.current, 0.08);
        controls.target.lerp(targetLookAtRef.current, 0.08);
      }
      controls.update();

      // Smooth 3D Kinematics update (Doors, Hood, Collapse)
      kinematicsControllerRef.current.update({
        doorsOpen,
        hoodOpen,
        collapsed: onToggleExplodedView ? (explodedView ?? false) : internalExploded
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [doorsOpen, hoodOpen, internalExploded, explodedView, onToggleExplodedView]);

  const isCollapsedActive = onToggleExplodedView ? (explodedView ?? false) : internalExploded;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col font-sans">
      
      {/* Top Controls Bar: Camera Viewpoints & Interactive Controls */}
      <div className="p-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2 bg-white text-xs font-mono">
        
        {/* Camera Views */}
        <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setCameraPreset('3/4')}
            className={`px-3 py-1 rounded-lg transition-all font-semibold ${
              activeCameraView === '3/4' ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3/4 View
          </button>
          <button
            onClick={() => setCameraPreset('SIDE')}
            className={`px-3 py-1 rounded-lg transition-all font-semibold ${
              activeCameraView === 'SIDE' ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Side
          </button>
          <button
            onClick={() => setCameraPreset('FRONT')}
            className={`px-3 py-1 rounded-lg transition-all font-semibold ${
              activeCameraView === 'FRONT' ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Front
          </button>
          <button
            onClick={() => setCameraPreset('TOP')}
            className={`px-3 py-1 rounded-lg transition-all font-semibold ${
              activeCameraView === 'TOP' ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Top
          </button>
          <button
            onClick={() => setCameraPreset('REAR')}
            className={`px-3 py-1 rounded-lg transition-all font-semibold ${
              activeCameraView === 'REAR' ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rear
          </button>
        </div>

        {/* Interactive Door/Hood/Collapse Controls */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setDoorsOpen(!doorsOpen)}
            className={`px-3 py-1 rounded-xl border transition-all flex items-center gap-1 font-semibold ${
              doorsOpen ? 'bg-blue-700 text-white border-blue-700 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="Physically open or close vehicle doors"
          >
            <DoorOpen className="w-3.5 h-3.5" />
            <span>{doorsOpen ? 'Close Doors' : 'Open Doors'}</span>
          </button>

          <button
            onClick={() => setHoodOpen(!hoodOpen)}
            className={`px-3 py-1 rounded-xl border transition-all flex items-center gap-1 font-semibold ${
              hoodOpen ? 'bg-blue-700 text-white border-blue-700 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="Physically open or close vehicle hood"
          >
            <Car className="w-3.5 h-3.5" />
            <span>{hoodOpen ? 'Close Hood' : 'Open Hood'}</span>
          </button>

          <button
            onClick={handleToggleCollapse}
            className={`px-3 py-1 rounded-xl border transition-all flex items-center gap-1 font-semibold ${
              isCollapsedActive ? 'bg-blue-700 text-white border-blue-700 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="Physically explode or collapse vehicle component assemblies"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isCollapsedActive ? 'Collapse' : 'Explode'}</span>
          </button>

          <button
            onClick={handleResetAll}
            className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all"
            title="Reset All 3D Kinematics and Camera"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div className="relative w-full h-[520px] lg:h-[580px] bg-white cursor-grab active:cursor-grabbing">
        <div ref={mountRef} className="w-full h-full" />

        {/* Loading Overlay */}
        {loadingProgress !== null && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 z-30 font-mono">
            <Car className="w-10 h-10 text-blue-700 animate-bounce" />
            <div className="text-center space-y-1">
              <p className="text-xs font-bold text-slate-900">Loading Automotive Digital Twin GLB...</p>
              <div className="w-48 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-700 h-full transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <span className="text-[10px] text-slate-500">{loadingProgress}% Synchronized</span>
            </div>
          </div>
        )}

        {/* Active Part Badge in 3D scene */}
        {selectedPartId && (
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-blue-200 shadow-md text-xs font-mono text-blue-700 font-bold flex items-center space-x-2 z-20">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span>INSPECTING: {selectedPartId}</span>
          </div>
        )}

        {/* Bottom Floating Brightness Slider */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700 shadow-xl flex items-center space-x-3 z-20">
          <Sun className="w-4 h-4 text-slate-300" />
          <input
            type="range"
            min="0.5"
            max="2.5"
            step="0.05"
            value={brightness}
            onChange={(e) => setBrightness(parseFloat(e.target.value))}
            className="w-28 accent-blue-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            title="Adjust Studio Lighting Brightness"
          />
        </div>

      </div>

    </div>
  );
};
