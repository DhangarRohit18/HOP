import React, { useState, useEffect, useRef } from 'react';
import { EXTENSION_CONSTANTS } from '../shared/constants';
import {
  EntityContext,
  ExtensionMessage,
  ExtensionResponse,
  IncidentContext,
  BackendConnectionStatus,
  FullMaterialTraceabilityAggregate,
  RecentMaterialItem,
} from '../shared/types';
import { isValidMaterialQR, decodeMaterialQR } from '../shared/qr_helpers';
import { decodeQrFromImageData } from '../shared/qr_decoder';

export type CameraScannerState =
  | 'IDLE'
  | 'CAMERA_STARTING'
  | 'REQUESTING_PERMISSION'
  | 'CAMERA_ACTIVE'
  | 'SCANNING'
  | 'QR_DETECTED'
  | 'VALIDATING'
  | 'VERIFYING_IDENTITY'
  | 'RESOLVING'
  | 'RESOLVED'
  | 'INVALID_QR'
  | 'CAMERA_ERROR'
  | 'STOPPED';

export type ResolutionLifecycleStage =
  | 'IDLE'
  | 'INITIALIZING'
  | 'RESOLVING IDENTITY'
  | 'LOADING PASSPORT'
  | 'LOADING HISTORY'
  | 'LOADING IMPACT'
  | 'VERIFYING IDENTITY'
  | 'MATERIAL READY';

interface BarcodeDetectorDetected {
  rawValue: string;
  format?: string;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => {
      detect: (source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap) => Promise<BarcodeDetectorDetected[]>;
    };
  }
}

export interface VerificationDetails {
  qrFormatValid: boolean;
  idResolved: boolean;
  passportMatch: boolean;
  historyMatch: boolean;
  impactMatch: boolean;
  verified: boolean;
}

export interface WatchedMaterialRecord {
  material_unit_id: string;
  serial_number: string;
  condition: string;
  component_id: string;
  sla_exposure: number;
  estimated_delay_days: number;
  lastVerifiedAt: string;
}

export interface MaterialDelta {
  conditionChanged: boolean;
  prevCondition?: string;
  newCondition?: string;
  slaChanged: boolean;
  prevSla?: number;
  newSla?: number;
  delayChanged: boolean;
  prevDelay?: number;
  newDelay?: number;
}

export const SidePanelApp: React.FC = () => {
  // Context, Incident & Material Traceability State
  const [context, setContext] = useState<EntityContext | null>(null);
  const [incident, setIncident] = useState<IncidentContext | null>(null);
  const [material, setMaterial] = useState<FullMaterialTraceabilityAggregate | null>(null);
  const [backendStatus, setBackendStatus] = useState<BackendConnectionStatus>('UNAVAILABLE');
  const [loadingContext, setLoadingContext] = useState(false);
  const [loadingMaterial, setLoadingMaterial] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [resolutionLifecycleStage, setResolutionLifecycleStage] = useState<ResolutionLifecycleStage>('IDLE');

  // Extension 2.0 Material Watch & What Changed State
  const [watchedMaterials, setWatchedMaterials] = useState<WatchedMaterialRecord[]>([]);
  const [materialDelta, setMaterialDelta] = useState<MaterialDelta | null>(null);

  // Staged Identity Verification Experience State
  const [isVerifyingIdentity, setIsVerifyingIdentity] = useState(false);
  const [verificationStage, setVerificationStage] = useState<number>(0);
  const [verificationDetails, setVerificationDetails] = useState<VerificationDetails | null>(null);

  // Hero Action "WHY?" Deterministic Explainability Toggle State
  const [showWhyExplainability, setShowWhyExplainability] = useState<boolean>(true);
  const [activeExplainableStep, setActiveExplainableStep] = useState<number | null>(1);

  // Material Comparison State
  const [comparingMaterial, setComparingMaterial] = useState(false);
  const [materialB, setMaterialB] = useState<FullMaterialTraceabilityAggregate | null>(null);

  // Recent Materials local cache (Max 5, newest first)
  const [recentMaterials, setRecentMaterials] = useState<RecentMaterialItem[]>([]);

  // Manual QR Resolver State
  const [qrInput, setQrInput] = useState('CMP-001-00427');
  const [qrError, setQrError] = useState<string | null>(null);

  // Camera & Real-Time Local QR Detector State
  const [showScanner, setShowScanner] = useState(false);
  const [cameraState, setCameraState] = useState<CameraScannerState>('IDLE');
  const [cameraErrorMsg, setCameraErrorMsg] = useState<string | null>(null);
  const [scannedMaterialId, setScannedMaterialId] = useState<string | null>(null);
  const [isLocalFallbackActive, setIsLocalFallbackActive] = useState<boolean>(false);

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isResolvingRef = useRef<boolean>(false);
  const lastDetectedQrRef = useRef<string | null>(null);
  const requestSequenceRef = useRef<number>(0);

  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Safe helper to parse HH:MM:SS from ISO string
  const formatTimeHHMMSS = (isoString?: string): string => {
    try {
      const d = isoString ? new Date(isoString) : new Date();
      return d.toTimeString().split(' ')[0];
    } catch {
      return new Date().toTimeString().split(' ')[0];
    }
  };

  // Safe load of Recent Materials & Watched Materials from chrome.storage.local on mount
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      try {
        chrome.storage.local.get(['recent_materials', 'watched_materials'], (result) => {
          if (chrome.runtime?.lastError) return;
          if (result && Array.isArray(result.recent_materials)) {
            setRecentMaterials(result.recent_materials);
          }
          if (result && Array.isArray(result.watched_materials)) {
            setWatchedMaterials(result.watched_materials);
          }
        });
      } catch (e) {
        console.warn('[NEXUS] Local storage read exception handled safely:', e);
      }
    }
  }, []);

  // Hydrate context on mount
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      setLoadingContext(true);
      const msg: ExtensionMessage = { type: 'GET_CURRENT_CONTEXT' };
      chrome.runtime.sendMessage(
        msg,
        (
          res: ExtensionResponse<{
            context: EntityContext | null;
            incident: IncidentContext | null;
            material: FullMaterialTraceabilityAggregate | null;
            backendStatus: BackendConnectionStatus;
          }>
        ) => {
          setLoadingContext(false);
          if (res && res.success && res.data) {
            if (res.data.backendStatus) setBackendStatus(res.data.backendStatus);
            if (res.data.context) setContext(res.data.context);
            if (res.data.material) {
              setMaterial(res.data.material);
              setLastSyncTime(formatTimeHHMMSS(res.data.material.resolvedAt));
            }
            if (res.data.incident) setIncident(res.data.incident);
          }
        }
      );
    }
  }, []);

  // Listen for broadcast state updates
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;

    const listener = (msg: unknown) => {
      if (typeof msg === 'object' && msg !== null && 'type' in msg) {
        const extMsg = msg as Record<string, any>;
        if (extMsg.type === 'ENTITY_CONTEXT_UPDATED' && extMsg.payload?.context) {
          setContext(extMsg.payload.context as EntityContext);
          setBackendStatus('CONNECTED');
        } else if (extMsg.type === 'INCIDENT_CONTEXT_UPDATED' && extMsg.payload?.incident) {
          setIncident(extMsg.payload.incident as IncidentContext);
        } else if (extMsg.type === 'MATERIAL_PASSPORT_UPDATED' && extMsg.payload?.material) {
          const matData = extMsg.payload.material as FullMaterialTraceabilityAggregate;
          setMaterial(matData);
          setLastSyncTime(formatTimeHHMMSS(matData.resolvedAt));
          updateRecentMaterialsList(matData);
        }
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  // Helper to persist recent materials locally (max 5)
  const updateRecentMaterialsList = (matData: FullMaterialTraceabilityAggregate) => {
    const newItem: RecentMaterialItem = {
      material_unit_id: matData.passport.material_unit_id,
      serial_number: matData.passport.identity.serial_number,
      condition: matData.passport.current_state.condition,
      component_id: matData.passport.identity.component_id,
      resolvedAt: matData.resolvedAt || new Date().toISOString(),
    };

    setRecentMaterials((prev) => {
      const filtered = prev.filter((r) => r.material_unit_id !== newItem.material_unit_id);
      const updated = [newItem, ...filtered].slice(0, 5);
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        try {
          chrome.storage.local.set({ recent_materials: updated });
        } catch (e) {
          console.warn('[NEXUS] Local storage write exception handled safely:', e);
        }
      }
      return updated;
    });
  };

  /**
   * TOGGLE LOCAL MATERIAL WATCHLIST (EXTENSION 2.0)
   */
  const toggleWatchMaterial = (matData: FullMaterialTraceabilityAggregate) => {
    const id = matData.passport.material_unit_id;
    const isAlreadyWatched = watchedMaterials.some((w) => w.material_unit_id === id);

    let updatedWatchlist: WatchedMaterialRecord[];
    if (isAlreadyWatched) {
      updatedWatchlist = watchedMaterials.filter((w) => w.material_unit_id !== id);
    } else {
      const newWatchRecord: WatchedMaterialRecord = {
        material_unit_id: id,
        serial_number: matData.passport.identity.serial_number,
        condition: matData.passport.current_state.condition,
        component_id: matData.passport.identity.component_id,
        sla_exposure: matData.passport.risk.sla_exposure,
        estimated_delay_days: matData.passport.risk.estimated_delay_days,
        lastVerifiedAt: new Date().toISOString(),
      };
      updatedWatchlist = [newWatchRecord, ...watchedMaterials.filter((w) => w.material_unit_id !== id)];
    }

    setWatchedMaterials(updatedWatchlist);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      try {
        chrome.storage.local.set({ watched_materials: updatedWatchlist });
      } catch (e) {
        console.warn('[NEXUS] Local storage write exception handled safely:', e);
      }
    }
  };

  /**
   * CALCULATE WHAT CHANGED DELTA (EXTENSION 2.0)
   */
  const checkMaterialDelta = (matData: FullMaterialTraceabilityAggregate) => {
    const id = matData.passport.material_unit_id;
    const existingWatchRecord = watchedMaterials.find((w) => w.material_unit_id === id);

    if (!existingWatchRecord) {
      setMaterialDelta(null);
      return;
    }

    const conditionChanged = existingWatchRecord.condition !== matData.passport.current_state.condition;
    const slaChanged = existingWatchRecord.sla_exposure !== matData.passport.risk.sla_exposure;
    const delayChanged = existingWatchRecord.estimated_delay_days !== matData.passport.risk.estimated_delay_days;

    if (conditionChanged || slaChanged || delayChanged) {
      setMaterialDelta({
        conditionChanged,
        prevCondition: existingWatchRecord.condition,
        newCondition: matData.passport.current_state.condition,
        slaChanged,
        prevSla: existingWatchRecord.sla_exposure,
        newSla: matData.passport.risk.sla_exposure,
        delayChanged,
        prevDelay: existingWatchRecord.estimated_delay_days,
        newDelay: matData.passport.risk.estimated_delay_days,
      });

      // Update watched record with latest inspection data
      const updatedWatchlist = watchedMaterials.map((w) =>
        w.material_unit_id === id
          ? {
              ...w,
              condition: matData.passport.current_state.condition,
              sla_exposure: matData.passport.risk.sla_exposure,
              estimated_delay_days: matData.passport.risk.estimated_delay_days,
              lastVerifiedAt: new Date().toISOString(),
            }
          : w
      );
      setWatchedMaterials(updatedWatchlist);
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        try {
          chrome.storage.local.set({ watched_materials: updatedWatchlist });
        } catch (e) {
          console.warn('[NEXUS] Local storage write exception handled safely:', e);
        }
      }
    } else {
      setMaterialDelta(null);
    }
  };

  /**
   * STOP CAMERA CLEANUP
   */
  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    isResolvingRef.current = false;
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  /**
   * START CAMERA FEED WITH audio: false ENFORCED
   */
  const startCamera = async () => {
    stopCamera();
    setCameraErrorMsg(null);
    setCameraState('REQUESTING_PERMISSION');
    setShowScanner(true);
    isResolvingRef.current = false;
    lastDetectedQrRef.current = null;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access API (getUserMedia) is not supported in this browser environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      streamRef.current = stream;
      setCameraState('CAMERA_ACTIVE');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      startRealTimeQrDetection();
    } catch (err: unknown) {
      setCameraState('CAMERA_ERROR');
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraErrorMsg('Camera access is required for physical QR scanning.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraErrorMsg('NO CAMERA DEVICE DETECTED');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setCameraErrorMsg('Camera is currently in use by another application.');
        } else if (err.name === 'SecurityError') {
          setCameraErrorMsg('Camera access blocked due to browser security restrictions.');
        } else {
          setCameraErrorMsg(`Camera acquisition failed: ${err.message}`);
        }
      } else {
        setCameraErrorMsg('An unknown error occurred while accessing the camera.');
      }
    }
  };

  /**
   * REAL-TIME LOCAL QR DETECTION LOOP
   */
  const startRealTimeQrDetection = () => {
    setCameraState('SCANNING');

    const hasNativeBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    let detectorInstance: InstanceType<NonNullable<typeof window.BarcodeDetector>> | null = null;

    if (hasNativeBarcodeDetector && window.BarcodeDetector) {
      try {
        detectorInstance = new window.BarcodeDetector({ formats: ['qr_code'] });
        setIsLocalFallbackActive(false);
      } catch (e) {
        detectorInstance = null;
        setIsLocalFallbackActive(true);
      }
    } else {
      setIsLocalFallbackActive(true);
    }

    scanIntervalRef.current = setInterval(async () => {
      if (isResolvingRef.current) return;
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      try {
        if (detectorInstance) {
          const detectedBarcodes = await detectorInstance.detect(videoRef.current);
          if (detectedBarcodes && detectedBarcodes.length > 0) {
            for (const barcode of detectedBarcodes) {
              if (barcode.rawValue) {
                processDetectedQrPayload(barcode.rawValue);
                break;
              }
            }
          }
        } else {
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth || 320;
          canvas.height = videoRef.current.videoHeight || 240;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const decodedPayload = decodeQrFromImageData(imageData);
            if (decodedPayload) {
              processDetectedQrPayload(decodedPayload);
            }
          }
        }
      } catch (e) {
        // Frame capture error ignored silently
      }
    }, 250);
  };

  /**
   * SHARED CONVERGENCE QR PROCESSING FUNCTION
   */
  const processDetectedQrPayload = (rawPayload: string) => {
    if (isResolvingRef.current) return;
    if (lastDetectedQrRef.current === rawPayload) return;

    lastDetectedQrRef.current = rawPayload;
    setCameraState('QR_DETECTED');

    if (!isValidMaterialQR(rawPayload)) {
      setCameraState('INVALID_QR');
      setCameraErrorMsg('Invalid QR Payload. Expected format: NEXUS-MAT:<material_unit_id>');
      setTimeout(() => {
        setCameraState('SCANNING');
        lastDetectedQrRef.current = null;
      }, 2000);
      return;
    }

    const materialId = decodeMaterialQR(rawPayload);
    if (!materialId) {
      setCameraState('INVALID_QR');
      setCameraErrorMsg('Failed to extract valid material ID from payload.');
      setTimeout(() => {
        setCameraState('SCANNING');
        lastDetectedQrRef.current = null;
      }, 2000);
      return;
    }

    isResolvingRef.current = true;
    setScannedMaterialId(materialId);
    setCameraState('VALIDATING');

    setTimeout(() => {
      setCameraState('RESOLVING');
      executeMaterialResolution(materialId);
    }, 400);
  };

  /**
   * IDENTITY INVARIANT SAFETY VERIFICATION
   */
  const verifyIdentityInvariant = (data: FullMaterialTraceabilityAggregate, targetId: string): VerificationDetails => {
    const passportId = data.passport.material_unit_id;
    const impactId = data.impact.material_unit_id;
    const historyValid = data.history.every((h) => h.material_unit_id === targetId);

    const isMatch = passportId === targetId && impactId === targetId && historyValid;
    return {
      qrFormatValid: true,
      idResolved: true,
      passportMatch: passportId === targetId,
      historyMatch: historyValid,
      impactMatch: impactId === targetId,
      verified: isMatch,
    };
  };

  /**
   * EXECUTE MATERIAL TRACEABILITY RESOLUTION PIPELINE WITH REQUEST CANCELLATION & STAGED VERIFICATION
   */
  const executeMaterialResolution = (materialId: string) => {
    let cleanId = materialId.trim();
    if (cleanId.startsWith('NEXUS-MAT:')) {
      cleanId = cleanId.replace('NEXUS-MAT:', '');
    }

    // Increment request token to discard any stale in-flight responses
    const currentRequestId = ++requestSequenceRef.current;

    setLoadingMaterial(true);
    setQrError(null);
    setResolutionLifecycleStage('INITIALIZING');

    setTimeout(() => {
      if (requestSequenceRef.current === currentRequestId) {
        setResolutionLifecycleStage('RESOLVING IDENTITY');
      }
    }, 100);

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      const msg: ExtensionMessage = {
        type: 'RESOLVE_MATERIAL_QR',
        payload: { materialId: cleanId },
      };

      chrome.runtime.sendMessage(msg, (res: ExtensionResponse<FullMaterialTraceabilityAggregate>) => {
        // Discard stale response if a newer scan was initiated while in flight
        if (requestSequenceRef.current !== currentRequestId) {
          console.log(`[NEXUS] Discarded stale request token #${currentRequestId} (latest token is #${requestSequenceRef.current})`);
          return;
        }

        setLoadingMaterial(false);
        if (res && res.success && res.data) {
          const matData: FullMaterialTraceabilityAggregate = res.data;
          setResolutionLifecycleStage('VERIFYING IDENTITY');

          const vDetails = verifyIdentityInvariant(matData, cleanId);
          if (!vDetails.verified) {
            setQrError('MATERIAL IDENTITY VERIFICATION FAILED');
            setCameraState('CAMERA_ERROR');
            setCameraErrorMsg('Mismatched identity detected across passport/history/impact data.');
            isResolvingRef.current = false;
            setResolutionLifecycleStage('IDLE');
            return;
          }

          checkMaterialDelta(matData);
          setVerificationDetails(vDetails);
          setIsVerifyingIdentity(true);
          setVerificationStage(1);

          const formattedTime = formatTimeHHMMSS(matData.resolvedAt);

          if (prefersReducedMotion) {
            setVerificationStage(5);
            setMaterial(matData);
            setLastSyncTime(formattedTime);
            updateRecentMaterialsList(matData);
            setCameraState('RESOLVED');
            setResolutionLifecycleStage('MATERIAL READY');
            setIsVerifyingIdentity(false);
            stopCamera();
            setShowScanner(false);
          } else {
            setTimeout(() => {
              if (requestSequenceRef.current === currentRequestId) setVerificationStage(2);
            }, 150);
            setTimeout(() => {
              if (requestSequenceRef.current === currentRequestId) setVerificationStage(3);
            }, 300);
            setTimeout(() => {
              if (requestSequenceRef.current === currentRequestId) setVerificationStage(4);
            }, 450);
            setTimeout(() => {
              if (requestSequenceRef.current === currentRequestId) {
                setVerificationStage(5);
                setMaterial(matData);
                setLastSyncTime(formattedTime);
                updateRecentMaterialsList(matData);
                setCameraState('RESOLVED');
                setResolutionLifecycleStage('MATERIAL READY');
              }
            }, 600);

            setTimeout(() => {
              if (requestSequenceRef.current === currentRequestId) {
                setIsVerifyingIdentity(false);
                stopCamera();
                setShowScanner(false);
              }
            }, 750);
          }
        } else {
          const rawError = res?.error || `MATERIAL NOT FOUND`;
          const formattedError = rawError.includes('not found')
            ? `MATERIAL NOT FOUND: No traceability record exists for ${cleanId}`
            : rawError;

          setQrError(formattedError);
          setCameraState('CAMERA_ERROR');
          setCameraErrorMsg(formattedError);
          setResolutionLifecycleStage('IDLE');
          isResolvingRef.current = false;
        }
      });
    }
  };

  const executeMaterialBResolution = (materialIdB: string) => {
    let cleanIdB = materialIdB.trim();
    if (cleanIdB.startsWith('NEXUS-MAT:')) {
      cleanIdB = cleanIdB.replace('NEXUS-MAT:', '');
    }

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      const msg: ExtensionMessage = {
        type: 'RESOLVE_MATERIAL_QR',
        payload: { materialId: cleanIdB },
      };

      chrome.runtime.sendMessage(msg, (res: ExtensionResponse<FullMaterialTraceabilityAggregate>) => {
        if (res && res.success && res.data) {
          const matData: FullMaterialTraceabilityAggregate = res.data;
          const vDetails = verifyIdentityInvariant(matData, cleanIdB);
          if (vDetails.verified) {
            setMaterialB(matData);
          }
        }
      });
    }
  };

  const resetMaterialState = () => {
    // Invalidate any active in-flight request
    requestSequenceRef.current++;
    setMaterial(null);
    setMaterialB(null);
    setComparingMaterial(false);
    setQrError(null);
    setScannedMaterialId(null);
    setIsVerifyingIdentity(false);
    setVerificationStage(0);
    setVerificationDetails(null);
    setShowWhyExplainability(true);
    setActiveExplainableStep(1);
    setLastSyncTime(null);
    setMaterialDelta(null);
    setResolutionLifecycleStage('IDLE');
    setCameraState('IDLE');
    setCameraErrorMsg(null);
    stopCamera();
    setShowScanner(false);
  };

  const resolveMaterialIdentity = () => {
    const id = qrInput.trim();
    if (!id) return;
    executeMaterialResolution(id);
  };

  const fetchContextForEntity = (forceRefresh: boolean = false) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
    setLoadingContext(true);

    const msg: ExtensionMessage = {
      type: forceRefresh ? 'REFRESH_CONTEXT' : 'FETCH_CONTEXT',
      payload: { forceRefresh },
    };

    chrome.runtime.sendMessage(msg, (res: ExtensionResponse<EntityContext>) => {
      setLoadingContext(false);
      if (res && res.success && res.data) {
        setContext(res.data);
        if (res.data.backendStatus) setBackendStatus(res.data.backendStatus);
      }
    });
  };

  const openDeepLink = (path: string) => {
    const url = `${EXTENSION_CONSTANTS.DEFAULT_FRONTEND_URL}${path}`;
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  const isConnected = backendStatus === 'CONNECTED';
  const isCurrentWatched = material ? watchedMaterials.some((w) => w.material_unit_id === material.passport.material_unit_id) : false;

  return (
    <div style={{ backgroundColor: '#F5F3FF', color: '#1B082C', minHeight: '100vh', padding: '12px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
      {/* 1. BRANDING & TECHNICAL CONTROL ROOM HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #DDD5EA', paddingBottom: '10px', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '900', color: '#834DFB', letterSpacing: '0.08em', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span>NEXUS</span>
            <span style={{ fontSize: '9px', color: '#1B082C', fontWeight: 'bold' }}>FIELD INTELLIGENCE 2.0</span>
          </div>
          <div style={{ fontSize: '9px', color: '#81758F', marginTop: '2px', letterSpacing: '0.04em' }}>
            PHYSICAL MATERIAL TRACEABILITY ENGINE
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ height: '7px', width: '7px', borderRadius: '50%', backgroundColor: isConnected ? '#3A9B68' : '#D94B5B', display: 'inline-block' }} />
          <span style={{ fontSize: '9px', fontWeight: 'bold', color: isConnected ? '#3A9B68' : '#D94B5B', letterSpacing: '0.04em' }}>
            {isConnected ? 'CONNECTED' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {!isConnected && (
        <div style={{ backgroundColor: '#FFEBEE', border: '1px solid #FFCDD2', borderRadius: '6px', padding: '8px 10px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#C62828' }}>
              ⚠️ TRACEABILITY SERVICE OFFLINE
            </div>
            {material && (
              <div style={{ fontSize: '8px', color: '#1B082C', fontWeight: 'bold', marginTop: '2px' }}>
                LOCAL CACHED VIEW
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => fetchContextForEntity(true)}
              style={{ padding: '3px 6px', backgroundColor: '#D94B5B', color: '#F5F3FF', border: 'none', borderRadius: '3px', fontSize: '8px', fontWeight: 'extrabold', cursor: 'pointer' }}
            >
              [ RETRY ]
            </button>
          </div>
        </div>
      )}

      {/* RESOLUTION LIFECYCLE TELEMETRY BAR */}
      {resolutionLifecycleStage !== 'IDLE' && resolutionLifecycleStage !== 'MATERIAL READY' && (
        <div style={{ backgroundColor: '#EEE8FF', border: '1px solid #834DFB', borderRadius: '4px', padding: '6px 8px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '8px' }}>
          <span style={{ color: '#834DFB', fontWeight: 'bold' }}>LIFECYCLE: {resolutionLifecycleStage}</span>
          <span style={{ color: '#1B082C', fontWeight: 'extrabold' }}>● IN FLIGHT</span>
        </div>
      )}

      {/* 2. INITIAL SCANNER LANDING SCREEN */}
      {!material && !isVerifyingIdentity && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD5EA', borderRadius: '8px', padding: '14px', marginBottom: '12px', textAlign: 'center', boxShadow: '0 1px 3px rgba(27, 8, 44, 0.05)' }}>
          <div style={{ fontSize: '10px', fontWeight: '900', color: '#834DFB', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
            SCAN A PHYSICAL MATERIAL
          </div>
          <div style={{ fontSize: '9px', color: '#81758F', marginBottom: '12px' }}>
            Target identity-only QR payload (NEXUS-MAT:&lt;material_unit_id&gt;)
          </div>

          <div style={{ position: 'relative', width: '100%', height: '190px', backgroundColor: '#F5F3FF', border: '1px solid #C9BDD9', borderRadius: '6px', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(131, 77, 251, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(131, 77, 251, 0.1) 1px, transparent 1px)', backgroundSize: '16px 16px', opacity: 0.8, pointerEvents: 'none' }} />

            <video
              ref={videoRef}
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: showScanner && (cameraState === 'CAMERA_ACTIVE' || cameraState === 'SCANNING' || cameraState === 'QR_DETECTED' || cameraState === 'VALIDATING' || cameraState === 'RESOLVING') ? 'block' : 'none' }}
            />

            <div style={{ position: 'absolute', inset: '16px', border: '1px solid rgba(131, 77, 251, 0.5)', borderRadius: '6px', pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', top: '-1px', left: '-1px', width: '14px', height: '14px', borderTop: '2px solid #834DFB', borderLeft: '2px solid #834DFB' }} />
              <div style={{ position: 'absolute', top: '-1px', right: '-1px', width: '14px', height: '14px', borderTop: '2px solid #834DFB', borderRight: '2px solid #834DFB' }} />
              <div style={{ position: 'absolute', bottom: '-1px', left: '-1px', width: '14px', height: '14px', borderBottom: '2px solid #834DFB', borderLeft: '2px solid #834DFB' }} />
              <div style={{ position: 'absolute', bottom: '-1px', right: '-1px', width: '14px', height: '14px', borderBottom: '2px solid #834DFB', borderRight: '2px solid #834DFB' }} />

              <div style={{ fontSize: '18px', color: '#834DFB', fontWeight: 'bold', opacity: 0.8 }}>+</div>

              <div style={{ position: 'absolute', top: '6px', left: '8px', fontSize: '7px', color: '#834DFB', fontWeight: 'bold', letterSpacing: '0.06em' }}>
                LOCAL OPTICAL INPUT
              </div>
              <div style={{ position: 'absolute', bottom: '6px', right: '8px', fontSize: '7px', color: '#1B082C', fontWeight: 'bold', letterSpacing: '0.06em' }}>
                QR MATRIX / IDENTITY ONLY
              </div>
            </div>

            {!showScanner && (
              <div style={{ zIndex: 2, textAlign: 'center', padding: '12px' }}>
                <div style={{ fontSize: '9px', fontWeight: 'extrabold', color: '#3A9B68', letterSpacing: '0.06em', marginBottom: '4px' }}>
                  ● CAMERA READY
                </div>
                <div style={{ fontSize: '8px', color: '#81758F', marginBottom: '8px' }}>
                  LOCAL FRAME PROCESSING
                </div>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#1B082C' }}>
                  SCAN A MATERIAL QR TO BEGIN
                </div>
              </div>
            )}

            {showScanner && cameraState === 'SCANNING' && (
              <div style={{ position: 'absolute', bottom: '10px', zIndex: 2, fontSize: '8px', color: '#834DFB', fontWeight: 'bold', letterSpacing: '0.06em', backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '2px 8px', borderRadius: '4px', border: '1px solid #834DFB' }}>
                ● SEARCHING FOR QR MATRIX
              </div>
            )}

            {cameraState === 'QR_DETECTED' && (
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255, 251, 209, 0.85)', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#1B082C', padding: '10px' }}>
                <div style={{ fontWeight: 'extrabold', fontSize: '11px', color: '#1B082C', marginBottom: '2px' }}>TARGET QR DETECTED</div>
                <div style={{ fontSize: '10px', color: '#834DFB', fontWeight: 'bold' }}>NEXUS-MAT:{scannedMaterialId || '...'}</div>
                <div style={{ fontSize: '8px', color: '#594B69', marginTop: '2px' }}>IDENTITY POINTER RESOLVING...</div>
              </div>
            )}

            {cameraState === 'VALIDATING' && (
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(238, 232, 255, 0.9)', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1B082C', fontWeight: 'bold', fontSize: '10px' }}>
                ✓ ● IDENTITY VALID ({scannedMaterialId})
              </div>
            )}

            {cameraState === 'RESOLVING' && (
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(238, 232, 255, 0.9)', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#834DFB', fontWeight: 'bold', fontSize: '10px' }}>
                ⚡ ↳ VERIFYING MATERIAL...
              </div>
            )}

            {cameraErrorMsg && (
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255, 255, 255, 0.95)', zIndex: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px', color: '#D94B5B', fontSize: '9px', textAlign: 'center' }}>
                <div style={{ fontWeight: 'extrabold', fontSize: '10px', marginBottom: '4px' }}>
                  {cameraErrorMsg.includes('required') ? 'CAMERA ACCESS DENIED' : cameraErrorMsg}
                </div>
                <div style={{ color: '#594B69', fontSize: '8px', marginBottom: '8px' }}>
                  Camera access is required for physical QR scanning.
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={startCamera} style={{ padding: '4px 8px', backgroundColor: '#D94B5B', color: '#F5F3FF', border: 'none', borderRadius: '3px', fontSize: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                    [ TRY AGAIN ]
                  </button>
                  <button onClick={() => setShowScanner(false)} style={{ padding: '4px 8px', backgroundColor: '#FBFAFF', color: '#834DFB', border: '1px solid #C9BDD9', borderRadius: '3px', fontSize: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                    [ USE MANUAL MATERIAL ID ]
                  </button>
                </div>
              </div>
            )}
          </div>

          {isLocalFallbackActive && (
            <div style={{ fontSize: '8px', color: '#1B082C', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <span>⚡ LOCAL QR FALLBACK ACTIVE</span>
              <span style={{ color: '#81758F' }}>(jsQR canvas decoder)</span>
            </div>
          )}

          <div style={{ marginBottom: '12px' }}>
            {!showScanner ? (
              <button
                onClick={startCamera}
                style={{ width: '100%', padding: '12px', backgroundColor: '#834DFB', color: '#F5F3FF', border: 'none', borderRadius: '5px', fontSize: '11px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.06em' }}
              >
                [ SCAN MATERIAL QR ]
              </button>
            ) : (
              <button
                onClick={stopCamera}
                style={{ width: '100%', padding: '8px', backgroundColor: '#D94B5B', color: '#F5F3FF', border: 'none', borderRadius: '5px', fontSize: '10px', fontWeight: 'extrabold', cursor: 'pointer' }}
              >
                [ STOP CAMERA SCANNER ]
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '8px', color: '#81758F', borderTop: '1px solid #DDD5EA', paddingTop: '8px' }}>
            <span>🔒 LOCAL PROCESSING</span>
            <span>•</span>
            <span>🚫 NO FRAME UPLOAD</span>
            <span>•</span>
            <span>📖 READ-ONLY INTELLIGENCE</span>
          </div>
        </div>
      )}

      {/* EXTENSION 2.0 LOCAL WATCHLIST PANEL */}
      {watchedMaterials.length > 0 && !material && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #834DFB', borderRadius: '6px', padding: '10px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(27, 8, 44, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '9px', fontWeight: 'extrabold', color: '#834DFB', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              LOCAL WATCHLIST ({watchedMaterials.length})
            </span>
            <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#1B082C', padding: '2px 4px', backgroundColor: '#FFFBD1', border: '1px solid #F0E100', borderRadius: '3px' }}>
              FIELD OPERATOR WATCH
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {watchedMaterials.map((wm) => (
              <div key={wm.material_unit_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px', backgroundColor: '#FBFAFF', border: '1px solid #DDD5EA', borderRadius: '4px' }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#834DFB' }}>
                    {wm.material_unit_id} <span style={{ color: '#81758F', fontSize: '8px' }}>({wm.serial_number})</span>
                  </div>
                  <div style={{ fontSize: '8px', color: '#594B69', marginTop: '2px' }}>
                    SLA: {formatCurrency(wm.sla_exposure)} | Delay: +{wm.estimated_delay_days.toFixed(1)}d
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '8px', fontWeight: 'extrabold', color: wm.condition === 'AT_RISK' ? '#1B082C' : wm.condition === 'QUARANTINED' ? '#1B082C' : '#3A9B68' }}>
                    ● {wm.condition}
                  </span>
                  <button
                    onClick={() => executeMaterialResolution(wm.material_unit_id)}
                    style={{ padding: '3px 6px', backgroundColor: '#834DFB', color: '#F5F3FF', border: 'none', borderRadius: '3px', fontSize: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    INSPECT
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. PAGE CONTEXT & INCIDENT STATE */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD5EA', borderRadius: '6px', padding: '10px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#834DFB', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            PAGE CONTEXT
          </span>
          <button
            onClick={() => fetchContextForEntity(true)}
            disabled={loadingContext}
            style={{ background: 'none', border: 'none', color: '#834DFB', fontSize: '9px', cursor: 'pointer', padding: 0 }}
          >
            {loadingContext ? 'SCANNING...' : '↻ SYNC'}
          </button>
        </div>

        {context ? (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#1B082C' }}>
              {context.entity?.entityType} <span style={{ color: '#834DFB' }}>{context.entity?.identifier}</span>
            </div>
            <div style={{ fontSize: '9px', color: '#81758F', marginTop: '2px', wordBreak: 'break-all' }}>
              {context.entity?.rawValue || 'Active Page Context'}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '10px', color: '#81758F', fontStyle: 'italic' }}>
            No active entity context detected on current tab.
          </div>
        )}
      </div>

      {/* 4. MANUAL MATERIAL ID INPUT FALLBACK */}
      {!material && !showScanner && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD5EA', borderRadius: '6px', padding: '10px', marginBottom: '12px' }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#834DFB', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em' }}>
            MANUAL MATERIAL ID RESOLVER
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              placeholder="e.g. CMP-001-00427, CMP-005-01001"
              style={{ flex: 1, backgroundColor: '#FBFAFF', border: '1px solid #C9BDD9', borderRadius: '5px', padding: '5px 8px', color: '#1B082C', fontSize: '10px' }}
            />
            <button
              onClick={resolveMaterialIdentity}
              disabled={loadingMaterial}
              style={{ padding: '5px 10px', backgroundColor: '#834DFB', color: '#F5F3FF', border: 'none', borderRadius: '5px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {loadingMaterial ? 'RESOLVING...' : '[ RESOLVE ]'}
            </button>
          </div>
          {qrError && (
            <div style={{ backgroundColor: '#FFEBEE', border: '1px solid #FFCDD2', borderRadius: '6px', padding: '8px', marginTop: '8px', fontSize: '9px' }}>
              <div style={{ color: '#C62828', fontWeight: 'bold', marginBottom: '4px' }}>⚠️ {qrError}</div>
              <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                <button
                  onClick={resetMaterialState}
                  style={{ flex: 1, padding: '4px', backgroundColor: '#D94B5B', color: '#F5F3FF', border: 'none', borderRadius: '3px', fontSize: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  [ SCAN AGAIN ]
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RECENT MATERIALS QUICK STRIP */}
      {recentMaterials.length > 0 && !material && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD5EA', borderRadius: '6px', padding: '8px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#81758F', textTransform: 'uppercase' }}>
              RECENT MATERIALS (MAX 5)
            </span>
            <span style={{ fontSize: '8px', color: '#834DFB', fontWeight: 'bold' }}>LOCAL CACHED VIEW</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {recentMaterials.map((rm) => (
              <button
                key={rm.material_unit_id}
                onClick={() => executeMaterialResolution(rm.material_unit_id)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', backgroundColor: '#FBFAFF', border: '1px solid #DDD5EA', borderRadius: '4px', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ fontSize: '9px', color: '#834DFB', fontWeight: 'bold' }}>
                  {rm.material_unit_id} <span style={{ color: '#81758F' }}>({rm.serial_number})</span>
                </div>
                <span style={{ fontSize: '8px', fontWeight: 'extrabold', color: rm.condition === 'AT_RISK' ? '#1B082C' : rm.condition === 'QUARANTINED' ? '#1B082C' : '#3A9B68' }}>
                  ● {rm.condition}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. STAGED IDENTITY VERIFICATION VISUAL SCREEN */}
      {isVerifyingIdentity && verificationDetails && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #834DFB', borderRadius: '8px', padding: '12px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(27, 8, 44, 0.05)' }}>
          <div style={{ fontSize: '10px', fontWeight: 'extrabold', color: '#834DFB', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em' }}>
            MATERIAL IDENTITY ACQUISITION
          </div>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#1B082C', marginBottom: '8px' }}>
            QR PAYLOAD: NEXUS-MAT:{scannedMaterialId || qrInput}
          </div>

          <div style={{ fontSize: '9px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {verificationStage >= 1 && <div style={{ color: '#3A9B68' }}>✓ QR FORMAT VALID</div>}
            {verificationStage >= 2 && <div style={{ color: '#3A9B68' }}>✓ MATERIAL ID RESOLVED</div>}
            {verificationStage >= 3 && (
              <div style={{ color: verificationDetails.passportMatch ? '#3A9B68' : '#D94B5B' }}>
                {verificationDetails.passportMatch ? '✓ PASSPORT ID MATCH' : '✕ PASSPORT ID MISMATCH'}
              </div>
            )}
            {verificationStage >= 4 && (
              <div style={{ color: verificationDetails.historyMatch ? '#3A9B68' : '#D94B5B' }}>
                {verificationDetails.historyMatch ? '✓ HISTORY ID MATCH' : '✕ HISTORY ID MISMATCH'}
              </div>
            )}
            {verificationStage >= 5 && (
              <div style={{ color: verificationDetails.impactMatch ? '#3A9B68' : '#D94B5B' }}>
                {verificationDetails.impactMatch ? '✓ IMPACT ID MATCH' : '✕ IMPACT ID MISMATCH'}
              </div>
            )}
          </div>

          {verificationStage >= 5 && (
            <div style={{ marginTop: '8px', padding: '6px', backgroundColor: '#E8F5E9', border: '1px solid #A5D6A7', borderRadius: '4px', textAlign: 'center', fontSize: '10px', color: '#2E7D32', fontWeight: '900', letterSpacing: '0.05em' }}>
              ✓ IDENTITY VERIFIED — {scannedMaterialId || qrInput}
            </div>
          )}
        </div>
      )}

      {/* 6. MATERIAL PASSPORT 2.0 HERO & DIGITAL TWIN */}
      {material && !isVerifyingIdentity && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD5EA', borderRadius: '8px', padding: '12px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(27, 8, 44, 0.05)' }}>
          {/* EXTENSION 2.0 WHAT CHANGED DELTA ALERT BOX */}
          {materialDelta ? (
            <div style={{ backgroundColor: '#FFFBD1', border: '1px solid #F0E100', borderRadius: '6px', padding: '8px 10px', marginBottom: '12px' }}>
              <div style={{ fontSize: '9px', fontWeight: 'extrabold', color: '#1B082C', letterSpacing: '0.06em', marginBottom: '4px' }}>
                ⚡ WHAT CHANGED (SINCE LAST INSPECTION)
              </div>
              <div style={{ fontSize: '8px', color: '#1B082C', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {materialDelta.conditionChanged && (
                  <div>CONDITION: <span style={{ color: '#1B082C', fontWeight: 'bold' }}>{materialDelta.prevCondition} ➔ {materialDelta.newCondition}</span></div>
                )}
                {materialDelta.slaChanged && (
                  <div>SLA EXPOSURE: <span style={{ color: '#1B082C', fontWeight: 'bold' }}>{formatCurrency(materialDelta.prevSla || 0)} ➔ {formatCurrency(materialDelta.newSla || 0)}</span></div>
                )}
                {materialDelta.delayChanged && (
                  <div>ESTIMATED DELAY: <span style={{ color: '#1B082C', fontWeight: 'bold' }}>+{materialDelta.prevDelay?.toFixed(1)}d ➔ +{materialDelta.newDelay?.toFixed(1)}d</span></div>
                )}
              </div>
            </div>
          ) : isCurrentWatched ? (
            <div style={{ backgroundColor: '#E8F5E9', border: '1px solid #A5D6A7', borderRadius: '6px', padding: '6px 8px', marginBottom: '12px', fontSize: '8px', color: '#2E7D32', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>✓ NO MATERIAL CHANGE DETECTED</span>
              <span>WATCHED SNAPSHOT SYNCED</span>
            </div>
          ) : null}

          {/* PHYSICAL MATERIAL TWIN ASSET RECORD */}
          <div style={{ backgroundColor: '#FFFFFF', border: `2px solid ${material.passport.current_state.condition === 'AT_RISK' ? '#F0E100' : material.passport.current_state.condition === 'QUARANTINED' ? '#F0E100' : '#834DFB'}`, borderRadius: '8px', padding: '12px', marginBottom: '12px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '9px', fontWeight: 'extrabold', color: '#834DFB', letterSpacing: '0.08em' }}>
                PHYSICAL MATERIAL TWIN
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '9px', fontWeight: 'extrabold', color: material.passport.current_state.condition === 'AT_RISK' ? '#1B082C' : material.passport.current_state.condition === 'QUARANTINED' ? '#1B082C' : '#3A9B68' }}>
                  ● {material.passport.current_state.condition === 'QUARANTINED' ? 'QUALITY QUARANTINE' : material.passport.current_state.condition === 'AT_RISK' ? 'OPERATIONAL RISK DETECTED' : 'MATERIAL HEALTHY'}
                </span>
                <button
                  onClick={() => toggleWatchMaterial(material)}
                  style={{ padding: '2px 6px', backgroundColor: isCurrentWatched ? '#834DFB' : '#F5F3FF', color: isCurrentWatched ? '#F5F3FF' : '#834DFB', border: '1px solid #834DFB', borderRadius: '3px', fontSize: '8px', fontWeight: 'extrabold', cursor: 'pointer' }}
                >
                  {isCurrentWatched ? '★ WATCHED' : '[ WATCH MATERIAL ]'}
                </button>
              </div>
            </div>

            <div style={{ fontSize: '18px', fontWeight: '900', color: '#834DFB', letterSpacing: '0.05em', marginBottom: '2px' }}>
              {material.passport.material_unit_id}
            </div>
            <div style={{ fontSize: '11px', color: '#1B082C', fontWeight: 'bold', marginBottom: '8px' }}>
              {material.passport.identity.component_name}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '9px', color: '#594B69', backgroundColor: '#FBFAFF', padding: '8px', borderRadius: '4px', border: '1px solid #DDD5EA' }}>
              <div>SERIAL: <strong style={{ color: '#834DFB' }}>{material.passport.identity.serial_number}</strong></div>
              <div>BATCH: <strong style={{ color: '#1B082C' }}>{material.passport.identity.batch_id}</strong></div>
              <div>WAREHOUSE: <strong style={{ color: '#594B69' }}>{material.passport.current_state.warehouse_id}</strong></div>
              <div>STATUS: <strong style={{ color: '#594B69' }}>{material.passport.current_state.operational_status}</strong></div>
            </div>

            <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #DDD5EA', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '7px', color: '#81758F' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>● LIVE TRACEABILITY</span>
                <span>LAST VERIFIED: <strong style={{ color: '#834DFB' }}>{lastSyncTime || 'JUST NOW'}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>PASSPORT: <strong style={{ color: '#3A9B68' }}>✓ SYNCED</strong></span>
                <span>HISTORY: <strong style={{ color: '#3A9B68' }}>✓ SYNCED</strong></span>
                <span>IMPACT: <strong style={{ color: '#3A9B68' }}>✓ SYNCED</strong></span>
                <span>GRAPH: <strong style={{ color: '#3A9B68' }}>ACTIVE</strong></span>
              </div>
            </div>
          </div>

          {/* DEMO-QUALITY STATUS REVEAL STRIP */}
          <div style={{ backgroundColor: '#FBFAFF', border: `1px solid ${material.passport.current_state.condition === 'AT_RISK' ? '#F0E100' : material.passport.current_state.condition === 'QUARANTINED' ? '#F0E100' : '#A5D6A7'}`, borderRadius: '6px', padding: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-around', fontSize: '9px', textAlign: 'center' }}>
            <div>
              <div style={{ color: '#81758F', fontSize: '8px' }}>CONDITION</div>
              <div style={{ color: material.passport.current_state.condition === 'AT_RISK' ? '#1B082C' : material.passport.current_state.condition === 'QUARANTINED' ? '#1B082C' : '#2E7D32', fontWeight: 'extrabold' }}>
                ● {material.passport.current_state.condition}
              </div>
            </div>
            <div>
              <div style={{ color: '#81758F', fontSize: '8px' }}>ESTIMATED DELAY</div>
              <div style={{ color: material.passport.risk.estimated_delay_days > 0 ? '#1B082C' : '#2E7D32', fontWeight: 'bold' }}>
                +{material.passport.risk.estimated_delay_days.toFixed(1)} DAYS
              </div>
            </div>
            <div>
              <div style={{ color: '#81758F', fontSize: '8px' }}>SLA EXPOSURE</div>
              <div style={{ color: material.passport.risk.sla_exposure > 0 ? '#1B082C' : '#2E7D32', fontWeight: 'extrabold' }}>
                {formatCurrency(material.passport.risk.sla_exposure)}
              </div>
            </div>
            <div>
              <div style={{ color: '#81758F', fontSize: '8px' }}>SIGNALS</div>
              <div style={{ color: material.passport.risk.evidence.length > 0 ? '#1B082C' : '#2E7D32', fontWeight: 'bold' }}>
                {material.passport.risk.evidence.length > 0 ? `${material.passport.risk.evidence.length} VERIFIED SIGNALS` : 'NO ACTIVE RISK SIGNAL'}
              </div>
            </div>
          </div>

          {/* GRAPH-LIKE PROVENANCE DIRECTIONAL CHAIN */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD5EA', borderRadius: '8px', padding: '10px', marginBottom: '12px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '9px', fontWeight: 'extrabold', color: '#834DFB', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                VERIFIED OPERATIONAL PROVENANCE
              </span>
              <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#834DFB', padding: '2px 4px', backgroundColor: '#EEE8FF', border: '1px solid #C9BDD9', borderRadius: '3px' }}>
                [ VERIFIED DATA ]
              </span>
            </div>

            <div style={{ fontSize: '9px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <div style={{ color: '#1B082C', fontWeight: 'bold', backgroundColor: '#FBFAFF', padding: '4px 8px', borderRadius: '4px', border: '1px solid #DDD5EA', width: '90%' }}>
                {material.passport.provenance.supplier_id} (Supplier Node)
              </div>
              <div style={{ color: '#834DFB', fontSize: '8px', margin: '2px 0' }}>│ ▼ SUPPLIES RESOURCE</div>

              <div style={{ color: '#1B082C', backgroundColor: '#FBFAFF', padding: '4px 8px', borderRadius: '4px', border: '1px solid #DDD5EA', width: '90%' }}>
                {material.passport.provenance.purchase_order_id} (Purchase Order)
              </div>
              <div style={{ color: '#834DFB', fontSize: '8px', margin: '2px 0' }}>│ ▼ TRANSPORTED BY</div>

              <div style={{ color: '#1B082C', backgroundColor: '#FBFAFF', padding: '4px 8px', borderRadius: '4px', border: '1px solid #DDD5EA', width: '90%' }}>
                {material.passport.provenance.shipment_id} (Logistics Freight)
              </div>
              <div style={{ color: '#834DFB', fontSize: '8px', margin: '2px 0' }}>│ ▼ FULFILLS PHYSICAL IDENTITY</div>

              <div style={{ width: '100%', backgroundColor: '#FFFFFF', border: `2px solid ${material.passport.current_state.condition === 'AT_RISK' ? '#F0E100' : material.passport.current_state.condition === 'QUARANTINED' ? '#F0E100' : '#834DFB'}`, borderRadius: '6px', padding: '8px', margin: '4px 0' }}>
                <div style={{ fontSize: '8px', color: '#834DFB', fontWeight: 'bold' }}>★ PHYSICAL MATERIAL NODE</div>
                <div style={{ fontSize: '14px', fontWeight: '900', color: '#1B082C' }}>{material.passport.material_unit_id}</div>
                <div style={{ fontSize: '8px', color: material.passport.current_state.condition === 'AT_RISK' ? '#1B082C' : material.passport.current_state.condition === 'QUARANTINED' ? '#1B082C' : '#2E7D32', fontWeight: 'bold', marginTop: '2px' }}>
                  CONDITION: ● {material.passport.current_state.condition}
                </div>
              </div>

              <div style={{ color: '#834DFB', fontSize: '8px', margin: '2px 0' }}>│ ▼ REQUIRED FOR PRODUCTION</div>
              <div style={{ color: '#1B082C', backgroundColor: '#FBFAFF', padding: '4px 8px', borderRadius: '4px', border: '1px solid #DDD5EA', width: '90%' }}>
                {material.passport.production.production_order_id || 'PRD-2026-001'} (Assembly Order)
              </div>

              <div style={{ color: '#834DFB', fontSize: '8px', margin: '2px 0' }}>│ ▼ FULFILLS CONTRACT</div>
              <div style={{ color: material.passport.current_state.condition === 'AT_RISK' ? '#1B082C' : '#2E7D32', fontWeight: 'bold', backgroundColor: '#FBFAFF', padding: '4px 8px', borderRadius: '4px', border: '1px solid #DDD5EA', width: '90%' }}>
                {material.passport.customer.customer_order_id ? `${material.passport.customer.customer_order_id} (Contract SLA)` : 'NONE (QUALITY ISOLATED)'}
              </div>
            </div>
          </div>

          {/* HERO ACTION "WHY?" INTERACTION TRIGGER */}
          <div style={{ marginBottom: '12px' }}>
            <button
              onClick={() => setShowWhyExplainability(!showWhyExplainability)}
              style={{ width: '100%', padding: '10px', backgroundColor: material.passport.current_state.condition === 'AT_RISK' ? '#FFFBD1' : material.passport.current_state.condition === 'QUARANTINED' ? '#FFFBD1' : '#E8F5E9', color: '#1B082C', border: `1px solid ${material.passport.current_state.condition === 'AT_RISK' ? '#F0E100' : '#A5D6A7'}`, borderRadius: '5px', fontSize: '10px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.06em' }}
            >
              {material.passport.current_state.condition === 'AT_RISK'
                ? '❓ WHY IS THIS MATERIAL AT RISK?'
                : material.passport.current_state.condition === 'QUARANTINED'
                ? '❓ WHY IS THIS MATERIAL QUARANTINED?'
                : '❓ WHY IS THIS MATERIAL HEALTHY?'}
            </button>

            {showWhyExplainability && (
              <div style={{ backgroundColor: '#EEE8FF', border: '1px solid #C9BDD9', borderRadius: '6px', padding: '10px', marginTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 'extrabold', color: '#834DFB', textTransform: 'uppercase' }}>
                    DETERMINISTIC CAUSAL TRACE
                  </span>
                  <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#834DFB', padding: '2px 4px', backgroundColor: '#FFFFFF', border: '1px solid #834DFB', borderRadius: '3px' }}>
                    [ NEXUS ANALYSIS ]
                  </span>
                </div>

                {material.passport.current_state.condition === 'AT_RISK' && (
                  <div style={{ fontSize: '9px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {material.passport.risk.evidence.map((ev, idx) => (
                      <div key={idx} onClick={() => setActiveExplainableStep(idx + 1)} style={{ padding: '6px', backgroundColor: activeExplainableStep === idx + 1 ? '#FFFFFF' : '#FBFAFF', borderRadius: '4px', cursor: 'pointer', border: '1px solid #DDD5EA' }}>
                        <div style={{ color: ev.severity === 'CRITICAL' ? '#C62828' : '#1B082C', fontWeight: 'bold' }}>0{idx + 1}. {ev.evidence_type || ev.reason_code}</div>
                        <div style={{ color: '#1B082C', marginTop: '2px' }}>{ev.description}</div>
                        <div style={{ fontSize: '8px', color: '#834DFB', marginTop: '2px' }}>Verified signal derived from operational graph event</div>
                      </div>
                    ))}
                  </div>
                )}

                {material.passport.current_state.condition === 'HEALTHY' && (
                  <div style={{ fontSize: '9px', color: '#594B69', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div><span style={{ color: '#2E7D32', fontWeight: 'bold' }}>✓</span> Quality inspection passed with zero defects</div>
                    <div><span style={{ color: '#2E7D32', fontWeight: 'bold' }}>✓</span> Freight shipment received into active inventory</div>
                    <div><span style={{ color: '#2E7D32', fontWeight: 'bold' }}>✓</span> No active disruption detected across supplier network</div>
                    <div><span style={{ color: '#2E7D32', fontWeight: 'bold' }}>✓</span> No downstream SLA exposure on linked contracts</div>
                    <div style={{ marginTop: '4px', fontSize: '8px', color: '#2E7D32', fontWeight: 'bold' }}>NO RISK PROPAGATION DETECTED | Derived from verified operational graph</div>
                  </div>
                )}

                {material.passport.current_state.condition === 'QUARANTINED' && (
                  <div style={{ fontSize: '9px', color: '#594B69', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div><span style={{ color: '#1B082C', fontWeight: 'bold' }}>●</span> QUALITY_INSPECTION_FAILURE</div>
                    <div>Inspection: <strong style={{ color: '#C62828' }}>FAILED</strong> | Operational Status: <strong style={{ color: '#1B082C' }}>BLOCKED</strong></div>
                    <div>Reason: <em>Automated wafer probe test failed due to clock frequency volatility.</em></div>
                    <div>Customer Allocation: <strong>NONE</strong> | SLA Exposure: <strong style={{ color: '#2E7D32' }}>$0.00</strong></div>
                    <div style={{ marginTop: '4px', fontSize: '8px', color: '#1B082C', fontWeight: 'bold' }}>QUALITY ISOLATION — NO SLA DISRUPTION CLAIM</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* MATERIAL COMPARISON SECTION */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD5EA', borderRadius: '6px', padding: '10px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '9px', fontWeight: 'extrabold', color: '#834DFB', textTransform: 'uppercase' }}>
                MATERIAL COMPARISON (MATERIAL A VS B)
              </span>
              <button
                onClick={() => setComparingMaterial(!comparingMaterial)}
                style={{ padding: '3px 6px', backgroundColor: '#FBFAFF', color: '#834DFB', border: '1px solid #C9BDD9', borderRadius: '4px', fontSize: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {comparingMaterial ? '[ CLOSE COMPARISON ]' : '[ COMPARE MATERIAL ]'}
              </button>
            </div>

            {comparingMaterial && (
              <div>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                  {['CMP-001-00427', 'CMP-001-00428', 'CMP-001-00429', 'CMP-005-01001'].map((id) => (
                    <button
                      key={id}
                      onClick={() => executeMaterialBResolution(id)}
                      style={{ flex: 1, padding: '4px', backgroundColor: materialB?.passport.material_unit_id === id ? '#834DFB' : '#FBFAFF', color: materialB?.passport.material_unit_id === id ? '#F5F3FF' : '#1B082C', border: '1px solid #DDD5EA', borderRadius: '3px', fontSize: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      {id}
                    </button>
                  ))}
                </div>

                {materialB ? (
                  <div>
                    <table style={{ width: '100%', fontSize: '8px', borderCollapse: 'collapse', marginBottom: '8px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #DDD5EA', color: '#81758F' }}>
                          <th style={{ textAlign: 'left', padding: '3px 0' }}>ATTRIBUTE</th>
                          <th style={{ textAlign: 'center', padding: '3px 0', color: '#834DFB' }}>A ({material.passport.material_unit_id})</th>
                          <th style={{ textAlign: 'center', padding: '3px 0', color: '#1B082C' }}>B ({materialB.passport.material_unit_id})</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #FBFAFF' }}>
                          <td style={{ color: '#594B69', padding: '3px 0' }}>Condition</td>
                          <td style={{ textAlign: 'center', color: material.passport.current_state.condition === 'AT_RISK' ? '#1B082C' : material.passport.current_state.condition === 'QUARANTINED' ? '#1B082C' : '#2E7D32', fontWeight: 'bold' }}>{material.passport.current_state.condition}</td>
                          <td style={{ textAlign: 'center', color: materialB.passport.current_state.condition === 'AT_RISK' ? '#1B082C' : materialB.passport.current_state.condition === 'QUARANTINED' ? '#1B082C' : '#2E7D32', fontWeight: 'bold' }}>{materialB.passport.current_state.condition}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #FBFAFF' }}>
                          <td style={{ color: '#594B69', padding: '3px 0' }}>Estimated Delay</td>
                          <td style={{ textAlign: 'center', color: material.passport.risk.estimated_delay_days > 0 ? '#1B082C' : '#2E7D32', fontWeight: 'bold' }}>+{material.passport.risk.estimated_delay_days.toFixed(1)}d</td>
                          <td style={{ textAlign: 'center', color: materialB.passport.risk.estimated_delay_days > 0 ? '#1B082C' : '#2E7D32', fontWeight: 'bold' }}>+{materialB.passport.risk.estimated_delay_days.toFixed(1)}d</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #FBFAFF' }}>
                          <td style={{ color: '#594B69', padding: '3px 0' }}>SLA Exposure</td>
                          <td style={{ textAlign: 'center', color: material.passport.risk.sla_exposure > 0 ? '#1B082C' : '#2E7D32', fontWeight: 'bold' }}>{formatCurrency(material.passport.risk.sla_exposure)}</td>
                          <td style={{ textAlign: 'center', color: materialB.passport.risk.sla_exposure > 0 ? '#1B082C' : '#2E7D32', fontWeight: 'bold' }}>{formatCurrency(materialB.passport.risk.sla_exposure)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ fontSize: '8px', color: '#81758F', textAlign: 'center', padding: '8px' }}>
                    Select Material B above to run side-by-side comparison.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RESET CTA */}
          <button
            onClick={resetMaterialState}
            style={{ width: '100%', padding: '8px', backgroundColor: '#834DFB', color: '#F5F3FF', border: 'none', borderRadius: '5px', fontSize: '10px', fontWeight: 'extrabold', cursor: 'pointer', letterSpacing: '0.05em' }}
          >
            [ SCAN ANOTHER MATERIAL ]
          </button>
        </div>
      )}

      {/* 7. EXECUTIVE WORKSPACE DEEPLINK */}
      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button
          onClick={() => openDeepLink('/impact-workspace')}
          style={{ padding: '8px', backgroundColor: '#FFFFFF', color: '#834DFB', border: '1px solid #C9BDD9', borderRadius: '5px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Open Impact Workspace in NEXUS →
        </button>
      </div>
    </div>
  );
};

export default SidePanelApp;
