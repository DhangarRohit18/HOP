import { describe, it, expect } from 'vitest';
import {
  fetchHealthStatus,
  postImpactAnalysis,
  fetchInventoryRisk,
  fetchBottlenecks,
  fetchCriticalPaths
} from './services/api';

describe('NEXUS Frontend API Client Foundations', () => {
  it('exports typed API service endpoints for Step 1', () => {
    expect(fetchHealthStatus).toBeDefined();
    expect(postImpactAnalysis).toBeDefined();
    expect(fetchInventoryRisk).toBeDefined();
    expect(fetchBottlenecks).toBeDefined();
    expect(fetchCriticalPaths).toBeDefined();
  });
});
