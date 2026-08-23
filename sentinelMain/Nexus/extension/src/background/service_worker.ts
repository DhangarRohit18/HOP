import {
  ExtensionMessage,
  ExtensionResponse,
  DetectedEntity,
  EntityContext,
  BackendConnectionStatus,
  DisruptionInput,
  MitigationSimulationRequest,
  ImpactAnalysisResult,
  MitigationSimulationResponse,
  IncidentContext,
  FullMaterialTraceabilityAggregate,
} from '../shared/types';
import { EXTENSION_CONSTANTS, resolveNodeParams } from '../shared/constants';
import { extensionApiClient } from '../shared/api_client';
import { decodeMaterialQR, isValidMaterialQR } from '../shared/qr_helpers';

let currentContextStore: EntityContext | null = null;
let currentIncidentStore: IncidentContext | null = null;
let currentMaterialStore: FullMaterialTraceabilityAggregate | null = null;
let currentBackendStatus: BackendConnectionStatus = 'UNAVAILABLE';
const CACHE_TTL_MS = 30000;

console.log(`[NEXUS Service Worker] ${EXTENSION_CONSTANTS.NAME} v${EXTENSION_CONSTANTS.VERSION} initialized.`);

async function checkBackendHealth(): Promise<BackendConnectionStatus> {
  try {
    const health = await extensionApiClient.fetchHealth();
    if (health.status === 'healthy' || health.status === 'ok') {
      currentBackendStatus = 'CONNECTED';
      return 'CONNECTED';
    } else {
      currentBackendStatus = 'DEGRADED';
      return 'DEGRADED';
    }
  } catch (err) {
    currentBackendStatus = 'UNAVAILABLE';
    return 'UNAVAILABLE';
  }
}

async function hydrateStateFromStorage(): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    try {
      const stored = await new Promise<{ [key: string]: unknown }>((res) => {
        chrome.storage.local.get(
          ['latest_entity_context', 'latest_incident_context', 'latest_material_passport'],
          res
        );
      });
      if (stored['latest_entity_context']) {
        currentContextStore = stored['latest_entity_context'] as EntityContext;
      }
      if (stored['latest_incident_context']) {
        currentIncidentStore = stored['latest_incident_context'] as IncidentContext;
      }
      if (stored['latest_material_passport']) {
        currentMaterialStore = stored['latest_material_passport'] as FullMaterialTraceabilityAggregate;
      }
    } catch (e) {
      console.warn('[NEXUS Service Worker] Hydration read error:', e);
    }
  }
}

async function persistStateToStorage(): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    try {
      await chrome.storage.local.set({
        latest_entity_context: currentContextStore,
        latest_incident_context: currentIncidentStore,
        latest_material_passport: currentMaterialStore,
        latest_backend_status: currentBackendStatus,
      });
    } catch (e) {
      console.warn('[NEXUS Service Worker] Hydration write error:', e);
    }
  }
}

async function resolveEntityContext(
  entity: DetectedEntity,
  forceRefresh: boolean = false
): Promise<EntityContext> {
  const cacheKey = `nexus_context_${entity.identifier}`;

  if (!forceRefresh && typeof chrome !== 'undefined' && chrome.storage?.local) {
    try {
      const cached = await new Promise<{ [key: string]: { context: EntityContext; timestamp: number } }>((res) => {
        chrome.storage.local.get(cacheKey, res);
      });
      if (cached[cacheKey] && Date.now() - cached[cacheKey].timestamp < CACHE_TTL_MS) {
        currentContextStore = {
          ...cached[cacheKey].context,
          incident: currentIncidentStore,
        };
        await checkBackendHealth();
        currentContextStore.backendStatus = currentBackendStatus;
        await persistStateToStorage();
        return currentContextStore;
      }
    } catch (e) {
      // Ignore cache error
    }
  }

  const backendStatus = await checkBackendHealth();

  if (backendStatus === 'UNAVAILABLE') {
    const fallbackContext: EntityContext = {
      entity,
      backendStatus: 'UNAVAILABLE',
      incident: currentIncidentStore,
      fetchedAt: new Date().toISOString(),
      errorDetails: 'Backend server unreachable at http://localhost:8000',
    };
    currentContextStore = fallbackContext;
    await persistStateToStorage();
    return fallbackContext;
  }

  const { nodeType, nodeId, fullKey } = resolveNodeParams(entity);

  const [graphRes, depRes, btnRes, invRes, pathRes] = await Promise.allSettled([
    extensionApiClient.fetchNodeGraph(nodeType, nodeId),
    extensionApiClient.fetchNodeDependencies(nodeType, nodeId),
    extensionApiClient.fetchBottlenecks(),
    extensionApiClient.fetchInventoryRisk(),
    extensionApiClient.fetchCriticalPaths(fullKey),
  ]);

  const nodeGraph = graphRes.status === 'fulfilled' ? graphRes.value : null;
  const dependencies = depRes.status === 'fulfilled' ? depRes.value : null;
  const bottlenecks = btnRes.status === 'fulfilled' ? btnRes.value : null;
  const inventoryRisk = invRes.status === 'fulfilled' ? invRes.value : null;
  const criticalPaths = pathRes.status === 'fulfilled' ? pathRes.value : null;

  const fullContext: EntityContext = {
    entity,
    backendStatus,
    nodeGraph,
    dependencies,
    bottlenecks,
    inventoryRisk,
    criticalPaths,
    incident: currentIncidentStore,
    fetchedAt: new Date().toISOString(),
  };

  currentContextStore = fullContext;

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    try {
      chrome.storage.local.set({ [cacheKey]: { context: fullContext, timestamp: Date.now() } });
    } catch (e) {
      // Ignore cache write error
    }
  }

  await persistStateToStorage();
  return fullContext;
}

async function resolveMaterialTraceability(materialId: string): Promise<FullMaterialTraceabilityAggregate> {
  const [passport, history, impact] = await Promise.all([
    extensionApiClient.fetchMaterialPassport(materialId),
    extensionApiClient.fetchMaterialHistory(materialId),
    extensionApiClient.fetchMaterialImpact(materialId),
  ]);

  // STRICT IDENTITY CONSISTENCY INVARIANT ASSERTION
  const targetId = materialId.trim().toUpperCase();
  if (passport.material_unit_id.toUpperCase() !== targetId) {
    throw new Error(
      `MATERIAL IDENTITY VERIFICATION FAILED: Passport ID '${passport.material_unit_id}' does not match target '${targetId}'`
    );
  }

  for (const evt of history) {
    if (evt.material_unit_id.toUpperCase() !== targetId) {
      throw new Error(
        `MATERIAL IDENTITY VERIFICATION FAILED: History event ID '${evt.material_unit_id}' does not match target '${targetId}'`
      );
    }
  }

  if (impact.material_unit_id.toUpperCase() !== targetId) {
    throw new Error(
      `MATERIAL IDENTITY VERIFICATION FAILED: Impact ID '${impact.material_unit_id}' does not match target '${targetId}'`
    );
  }

  const aggregate: FullMaterialTraceabilityAggregate = {
    passport,
    history,
    impact,
    resolvedAt: new Date().toLocaleTimeString(),
  };

  currentMaterialStore = aggregate;
  await persistStateToStorage();
  return aggregate;
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[NEXUS Service Worker] Extension installed successfully.');
});

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtensionResponse) => void
  ) => {
    console.log('[NEXUS Service Worker] Message received:', message.type, message);

    if (message.type === 'PING' || message.type === 'GET_STATUS') {
      checkBackendHealth().then((status) => {
        sendResponse({
          success: true,
          type: 'PONG',
          data: {
            status: EXTENSION_CONSTANTS.STATUS.SHELL_READY,
            version: EXTENSION_CONSTANTS.VERSION,
            currentContext: currentContextStore,
            currentIncident: currentIncidentStore,
            currentMaterial: currentMaterialStore,
            backendStatus: status,
          },
          timestamp: new Date().toISOString(),
        });
      });
      return true;
    }

    if (message.type === 'GET_CURRENT_CONTEXT' || message.type === 'GET_SELECTED_ENTITY') {
      (async () => {
        if (!currentContextStore || !currentIncidentStore || !currentMaterialStore) {
          await hydrateStateFromStorage();
        }
        const status = await checkBackendHealth();
        if (currentContextStore) {
          currentContextStore.backendStatus = status;
        }

        const response: ExtensionResponse<{
          context: EntityContext | null;
          incident: IncidentContext | null;
          material: FullMaterialTraceabilityAggregate | null;
          backendStatus: BackendConnectionStatus;
        }> = {
          success: true,
          type: 'CURRENT_CONTEXT_HYDRATED',
          data: {
            context: currentContextStore,
            incident: currentIncidentStore,
            material: currentMaterialStore,
            backendStatus: status,
          },
          timestamp: new Date().toISOString(),
        };
        sendResponse(response);
      })();
      return true;
    }

    if (message.type === 'RESOLVE_MATERIAL_QR') {
      const qrPayload = (message.payload?.qrPayload as string) || '';
      const directMaterialId = (message.payload?.materialId as string) || '';

      let materialId: string | null = directMaterialId ? directMaterialId.trim().toUpperCase() : null;

      if (!materialId && qrPayload) {
        if (!isValidMaterialQR(qrPayload)) {
          sendResponse({
            success: false,
            type: 'INVALID_QR_PAYLOAD',
            error: `Malformed or unsupported QR payload: '${qrPayload}'. Must follow 'NEXUS-MAT:<material_unit_id>'`,
            timestamp: new Date().toISOString(),
          });
          return true;
        }
        materialId = decodeMaterialQR(qrPayload);
      }

      if (!materialId) {
        sendResponse({
          success: false,
          type: 'MISSING_MATERIAL_ID',
          error: 'No valid material unit ID provided for traceability resolution',
          timestamp: new Date().toISOString(),
        });
        return true;
      }

      resolveMaterialTraceability(materialId)
        .then((aggregate) => {
          const response: ExtensionResponse<FullMaterialTraceabilityAggregate> = {
            success: true,
            type: 'MATERIAL_PASSPORT_UPDATED',
            data: aggregate,
            timestamp: new Date().toISOString(),
          };
          try {
            chrome.runtime.sendMessage(response).catch(() => {});
          } catch (e) {}
          sendResponse(response);
        })
        .catch((err: unknown) => {
          sendResponse({
            success: false,
            type: 'MATERIAL_RESOLUTION_ERROR',
            error: err instanceof Error ? err.message : 'Failed to resolve material passport',
            timestamp: new Date().toISOString(),
          });
        });

      return true;
    }

    if (message.type === 'INCIDENT_DETECTED') {
      const incident = message.payload?.incident as IncidentContext;
      if (incident) {
        currentIncidentStore = incident;
        if (currentContextStore) {
          currentContextStore.incident = incident;
        }
        persistStateToStorage();

        const response: ExtensionResponse<IncidentContext> = {
          success: true,
          type: 'INCIDENT_CONTEXT_UPDATED',
          data: incident,
          timestamp: new Date().toISOString(),
        };

        try {
          chrome.runtime.sendMessage(response).catch(() => {});
        } catch (e) {}

        sendResponse(response);
        return true;
      }
    }

    if (message.type === 'ENTITY_SELECTED' || message.type === 'FETCH_CONTEXT' || message.type === 'REFRESH_CONTEXT') {
      const entity = (message.payload?.entity as DetectedEntity) || currentContextStore?.entity;
      const forceRefresh = message.type === 'REFRESH_CONTEXT' || Boolean(message.payload?.forceRefresh);

      if (!entity) {
        sendResponse({
          success: false,
          type: 'NO_ENTITY_SPECIFIED',
          error: 'No active entity specified for backend context fetch',
          timestamp: new Date().toISOString(),
        });
        return true;
      }

      resolveEntityContext(entity, forceRefresh)
        .then((context) => {
          const response: ExtensionResponse<EntityContext> = {
            success: true,
            type: 'ENTITY_CONTEXT_UPDATED',
            data: context,
            timestamp: new Date().toISOString(),
          };
          try {
            chrome.runtime.sendMessage(response).catch(() => {});
          } catch (e) {}
          sendResponse(response);
        })
        .catch((err: unknown) => {
          sendResponse({
            success: false,
            type: 'CONTEXT_ERROR',
            error: err instanceof Error ? err.message : 'Context resolution error',
            timestamp: new Date().toISOString(),
          });
        });

      return true;
    }

    if (message.type === 'ENTITY_CONTEXT_CHANGED') {
      const entity = message.payload?.entity as DetectedEntity;
      if (entity) {
        if (!currentContextStore || currentContextStore.entity.identifier !== entity.identifier) {
          resolveEntityContext(entity, false)
            .then((context) => {
              const response: ExtensionResponse<EntityContext> = {
                success: true,
                type: 'ENTITY_CONTEXT_UPDATED',
                data: context,
                timestamp: new Date().toISOString(),
              };
              try {
                chrome.runtime.sendMessage(response).catch(() => {});
              } catch (e) {}
              sendResponse(response);
            })
            .catch((err: unknown) => {
              sendResponse({
                success: false,
                type: 'CONTEXT_ERROR',
                error: err instanceof Error ? err.message : 'Context resolution error',
                timestamp: new Date().toISOString(),
              });
            });
          return true;
        }
      }
      sendResponse({
        success: true,
        type: 'ENTITY_CONTEXT_UNCHANGED',
        data: { context: currentContextStore },
        timestamp: new Date().toISOString(),
      });
      return true;
    }

    if (message.type === 'RUN_IMPACT_ANALYSIS') {
      const disruption = message.payload?.disruption as DisruptionInput;
      if (!disruption) {
        sendResponse({
          success: false,
          type: 'INVALID_DISRUPTION_INPUT',
          error: 'Missing disruption payload for impact analysis',
          timestamp: new Date().toISOString(),
        });
        return true;
      }

      extensionApiClient
        .postImpactAnalysis(disruption)
        .then((result: ImpactAnalysisResult) => {
          const response: ExtensionResponse<ImpactAnalysisResult> = {
            success: true,
            type: 'IMPACT_ANALYSIS_RESULT',
            data: result,
            timestamp: new Date().toISOString(),
          };
          sendResponse(response);
        })
        .catch((err: unknown) => {
          sendResponse({
            success: false,
            type: 'IMPACT_ANALYSIS_ERROR',
            error: err instanceof Error ? err.message : 'Impact analysis execution failed',
            timestamp: new Date().toISOString(),
          });
        });

      return true;
    }

    if (message.type === 'RUN_MITIGATION_SIMULATION') {
      const req = message.payload?.mitigationRequest as MitigationSimulationRequest;
      if (!req) {
        sendResponse({
          success: false,
          type: 'INVALID_MITIGATION_INPUT',
          error: 'Missing mitigation payload for simulation request',
          timestamp: new Date().toISOString(),
        });
        return true;
      }

      extensionApiClient
        .postMitigationSimulation(req)
        .then((result: MitigationSimulationResponse) => {
          const response: ExtensionResponse<MitigationSimulationResponse> = {
            success: true,
            type: 'MITIGATION_SIMULATION_RESULT',
            data: result,
            timestamp: new Date().toISOString(),
          };
          sendResponse(response);
        })
        .catch((err: unknown) => {
          sendResponse({
            success: false,
            type: 'MITIGATION_SIMULATION_ERROR',
            error: err instanceof Error ? err.message : 'Mitigation evaluation failed',
            timestamp: new Date().toISOString(),
          });
        });

      return true;
    }

    sendResponse({
      success: false,
      type: 'UNKNOWN_MESSAGE',
      error: `Unsupported message type: ${message.type}`,
      timestamp: new Date().toISOString(),
    });
    return true;
  }
);
