import {
  EXTENSION_CONSTANTS,
  API_TIMEOUT_MS,
  TRACEABILITY_TIMEOUT_MS,
  ACTION_TIMEOUT_MS,
} from './constants';
import {
  HealthResponse,
  NodeGraphResponse,
  NodeDependenciesResponse,
  BottleneckItem,
  InventoryRiskItem,
  CriticalPathItem,
  DisruptionInput,
  ImpactAnalysisResult,
  MitigationSimulationRequest,
  MitigationSimulationResponse,
  MaterialPassportData,
  MaterialHistoryEventData,
  MaterialImpactData,
} from './types';

async function requestApi<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: unknown,
  timeoutMs: number = API_TIMEOUT_MS
): Promise<T> {
  const baseUrl = EXTENSION_CONSTANTS.DEFAULT_BACKEND_URL;
  const url = `${baseUrl}${endpoint}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    };

    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    clearTimeout(timer);

    if (!response.ok) {
      let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData && errorData.detail) {
          errorMsg = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
        }
      } catch (e) {
        // Ignore json parse error for non-json error responses
      }
      throw new Error(errorMsg);
    }

    return (await response.json()) as T;
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Backend request timed out (${timeoutMs / 1000}s)`);
    }
    throw err;
  }
}

export const extensionApiClient = {
  async fetchHealth(): Promise<HealthResponse> {
    return requestApi<HealthResponse>('/api/v1/health', 'GET', undefined, API_TIMEOUT_MS);
  },

  async fetchNodeGraph(nodeType: string, nodeId: string): Promise<NodeGraphResponse> {
    return requestApi<NodeGraphResponse>(
      `/api/v1/intelligence/graph/${encodeURIComponent(nodeType)}/${encodeURIComponent(nodeId)}`,
      'GET',
      undefined,
      API_TIMEOUT_MS
    );
  },

  async fetchNodeDependencies(nodeType: string, nodeId: string): Promise<NodeDependenciesResponse> {
    return requestApi<NodeDependenciesResponse>(
      `/api/v1/intelligence/dependencies/${encodeURIComponent(nodeType)}/${encodeURIComponent(nodeId)}`,
      'GET',
      undefined,
      API_TIMEOUT_MS
    );
  },

  async fetchBottlenecks(): Promise<BottleneckItem[]> {
    return requestApi<BottleneckItem[]>('/api/v1/intelligence/bottlenecks', 'GET', undefined, API_TIMEOUT_MS);
  },

  async fetchInventoryRisk(): Promise<InventoryRiskItem[]> {
    return requestApi<InventoryRiskItem[]>('/api/v1/intelligence/inventory-risk', 'GET', undefined, API_TIMEOUT_MS);
  },

  async fetchCriticalPaths(sourceNodeId?: string): Promise<CriticalPathItem[]> {
    const query = sourceNodeId ? `?source_node_id=${encodeURIComponent(sourceNodeId)}` : '';
    return requestApi<CriticalPathItem[]>(`/api/v1/intelligence/critical-paths${query}`, 'GET', undefined, API_TIMEOUT_MS);
  },

  async postImpactAnalysis(disruption: DisruptionInput): Promise<ImpactAnalysisResult> {
    return requestApi<ImpactAnalysisResult>(
      '/api/v1/intelligence/impact-analysis',
      'POST',
      disruption,
      ACTION_TIMEOUT_MS
    );
  },

  async postMitigationSimulation(request: MitigationSimulationRequest): Promise<MitigationSimulationResponse> {
    return requestApi<MitigationSimulationResponse>(
      '/api/v1/intelligence/mitigations',
      'POST',
      request,
      ACTION_TIMEOUT_MS
    );
  },

  async fetchMaterialPassport(materialId: string): Promise<MaterialPassportData> {
    return requestApi<MaterialPassportData>(
      `/api/v1/traceability/material/${encodeURIComponent(materialId)}`,
      'GET',
      undefined,
      TRACEABILITY_TIMEOUT_MS
    );
  },

  async fetchMaterialHistory(materialId: string): Promise<MaterialHistoryEventData[]> {
    return requestApi<MaterialHistoryEventData[]>(
      `/api/v1/traceability/material/${encodeURIComponent(materialId)}/history`,
      'GET',
      undefined,
      TRACEABILITY_TIMEOUT_MS
    );
  },

  async fetchMaterialImpact(materialId: string): Promise<MaterialImpactData> {
    return requestApi<MaterialImpactData>(
      `/api/v1/traceability/material/${encodeURIComponent(materialId)}/impact`,
      'GET',
      undefined,
      TRACEABILITY_TIMEOUT_MS
    );
  },
};
