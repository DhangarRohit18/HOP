import { fetchApi } from './apiClient';
import { HealthResponse } from '../types/health';
import {
  DisruptionInput,
  ImpactAnalysisResult,
  InventoryRiskResponse,
  BottleneckItem,
  CriticalPathItem,
  NodeGraphResponse,
  NodeDependenciesResponse,
  MitigationSimulationRequest,
  MitigationSimulationResponse
} from '../types/intelligence';

export async function fetchHealthStatus(): Promise<HealthResponse> {
  return fetchApi<HealthResponse>('/api/v1/health');
}

export async function postImpactAnalysis(disruption: DisruptionInput): Promise<ImpactAnalysisResult> {
  return fetchApi<ImpactAnalysisResult>('/api/v1/intelligence/impact-analysis', {
    method: 'POST',
    body: JSON.stringify(disruption),
  });
}

export async function fetchInventoryRisk(): Promise<InventoryRiskResponse> {
  return fetchApi<InventoryRiskResponse>('/api/v1/intelligence/inventory-risk');
}

export async function fetchBottlenecks(): Promise<BottleneckItem[]> {
  return fetchApi<BottleneckItem[]>('/api/v1/intelligence/bottlenecks');
}

export async function fetchCriticalPaths(sourceNodeId?: string): Promise<CriticalPathItem[]> {
  const query = sourceNodeId ? `?source_node_id=${encodeURIComponent(sourceNodeId)}` : '';
  return fetchApi<CriticalPathItem[]>(`/api/v1/intelligence/critical-paths${query}`);
}

export async function fetchNodeGraph(nodeType: string, nodeId: string): Promise<NodeGraphResponse> {
  const cleanType = encodeURIComponent(nodeType);
  const cleanId = encodeURIComponent(nodeId);
  return fetchApi<NodeGraphResponse>(`/api/v1/intelligence/graph/${cleanType}/${cleanId}`);
}

export async function fetchNodeDependencies(nodeType: string, nodeId: string): Promise<NodeDependenciesResponse> {
  const cleanType = encodeURIComponent(nodeType);
  const cleanId = encodeURIComponent(nodeId);
  return fetchApi<NodeDependenciesResponse>(`/api/v1/intelligence/dependencies/${cleanType}/${cleanId}`);
}

export async function postMitigationSimulation(request: MitigationSimulationRequest): Promise<MitigationSimulationResponse> {
  return fetchApi<MitigationSimulationResponse>('/api/v1/intelligence/mitigations', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

