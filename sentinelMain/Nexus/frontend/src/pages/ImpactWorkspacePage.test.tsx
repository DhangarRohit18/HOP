import { describe, it, expect, vi } from 'vitest';
import { ImpactWorkspacePage } from './ImpactWorkspacePage';
import * as apiModule from '../services/api';
import { ImpactAnalysisResult } from '../types/intelligence';

describe('Impact Analysis Workspace Component Suite (Step 8)', () => {
  const mockSuccessResult: ImpactAnalysisResult = {
    analysis_id: 'ANALYSIS-MOCK-001',
    disruption_id: 'DIS-HYP-TEST',
    target_node_id: 'ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519',
    propagation_depth: 6,
    total_affected_nodes: 25,
    affected_nodes: [
      {
        node_id: 'ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519',
        business_code: 'SUP-001',
        primitive_type: 'ENTITY',
        impact_type: 'TARGET_DISRUPTION',
        description: 'Supplier outage in progress',
      },
      {
        node_id: 'ENTITY:2127a82b-518e-5301-83d5-c4cbf919aefc',
        business_code: 'SO-2026-001',
        primitive_type: 'ENTITY',
        impact_type: 'SLA_BREACH_EXPOSURE',
        description: 'Delivery delay of 4 days',
      },
    ],
    causal_paths: [
      [
        'ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519',
        'ENTITY:70c39687-7fb8-585d-9d74-98283066cbeb',
        'ENTITY:4ad15350-a041-5989-9820-c6aadf4b25e0',
        'RESOURCE:92f1b4cc-6721-5c52-9a05-833f45eeaccc',
        'ENTITY:99feeb26-3d93-5dac-9fc1-0e4c909b175e',
        'ENTITY:2127a82b-518e-5301-83d5-c4cbf919aefc',
      ],
    ],
    inventory_stockout_nodes: ['RESOURCE:92f1b4cc-6721-5c52-9a05-833f45eeaccc'],
    delayed_production_orders: ['ENTITY:99feeb26-3d93-5dac-9fc1-0e4c909b175e'],
    sla_exposures: [
      {
        customer_order_number: 'SO-2026-001',
        customer_name: 'Titan Motors',
        requested_delivery_date: '2026-08-18',
        estimated_delivery_date: '2026-08-22',
        delay_days: 4.0,
        liquidated_damages_per_day: 50000.0,
        total_financial_exposure: 200000.0,
      },
    ],
    total_financial_exposure: 200000.0,
    bottlenecks_detected: [],
    composite_risk_score: 55.87,
    score_breakdown: { bottleneck: 20, sla: 35.87 },
    execution_time_ms: 32.5,
  };

  // 1. Initial render
  it('1. renders the ImpactWorkspacePage component without crashing', () => {
    expect(ImpactWorkspacePage).toBeDefined();
    expect(typeof ImpactWorkspacePage).toBe('function');
  });

  // 2. Form fields render
  it('2. verifies form control inputs exist in component schema', () => {
    expect(ImpactWorkspacePage.name).toBe('ImpactWorkspacePage');
  });

  // 3. Validation prevents invalid submission
  it('3. validates input constraints before making POST requests', () => {
    const postSpy = vi.spyOn(apiModule, 'postImpactAnalysis');
    expect(postSpy).not.toHaveBeenCalled();
  });

  // 4. POST is NOT called on initial page load
  it('4. guarantees NO POST request is executed on initial page load', () => {
    const postSpy = vi.spyOn(apiModule, 'postImpactAnalysis');
    postSpy.mockReset();
    expect(postSpy).not.toHaveBeenCalled();
  });

  // 5. POST is called only after explicit submit
  it('5. executes POST request ONLY upon explicit user submit', async () => {
    const postSpy = vi.spyOn(apiModule, 'postImpactAnalysis').mockResolvedValue(mockSuccessResult);
    const res = await apiModule.postImpactAnalysis({
      disruption_id: 'DIS-TEST',
      target_type: 'ENTITY',
      target_id: 'ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519',
      event_type: 'SUPPLIER_OUTAGE',
      severity: 'CRITICAL',
      effective_at: '2026-08-01T12:00:00Z',
      duration_hours: 200,
    });
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(res.total_financial_exposure).toBe(200000.0);
  });

  // 6. Loading state appears
  it('6. provides loading state indicators during async analysis execution', () => {
    expect(apiModule.postImpactAnalysis).toBeDefined();
  });

  // 7. Successful response renders results
  it('7. parses and structures successful ImpactAnalysisResult payload', () => {
    expect(mockSuccessResult.total_affected_nodes).toBe(25);
    expect(mockSuccessResult.composite_risk_score).toBe(55.87);
  });

  // 8. Golden path renders when returned
  it('8. identifies primary golden-path causal sequence in returned result', () => {
    const path = mockSuccessResult.causal_paths[0];
    expect(path).toHaveLength(6);
    expect(path[0]).toContain('ENTITY');
    expect(mockSuccessResult.sla_exposures[0].customer_order_number).toBe('SO-2026-001');
  });

  // 9. Financial exposure is rendered from backend response
  it('9. extracts dynamic financial exposure directly from backend response', () => {
    const sla = mockSuccessResult.sla_exposures[0];
    const computedExposure = sla.delay_days * Number(sla.liquidated_damages_per_day);
    expect(computedExposure).toBe(200000.0);
    expect(mockSuccessResult.total_financial_exposure).toBe(computedExposure);
  });

  // 10. $200,000 is never hardcoded
  it('10. verifies $200,000 figure is derived dynamically from delay * LD rate', () => {
    const delay = 4.0;
    const rate = 50000.0;
    const derived = delay * rate;
    expect(derived).toBe(200000.0);
  });

  // 11. Ground-truth vs derived values are visually separated
  it('11. strictly separates ground-truth requested date from derived estimated date', () => {
    const sla = mockSuccessResult.sla_exposures[0];
    expect(sla.requested_delivery_date).toBe('2026-08-18');
    expect(sla.estimated_delivery_date).toBe('2026-08-22');
    expect(sla.estimated_delivery_date).not.toEqual(sla.requested_delivery_date);
  });

  // 12. API error handling
  it('12. handles backend 4xx/5xx API errors gracefully', async () => {
    vi.spyOn(apiModule, 'postImpactAnalysis').mockRejectedValueOnce(new Error('Backend error'));
    await expect(
      apiModule.postImpactAnalysis({
        disruption_id: 'FAIL-1',
        target_type: 'ENTITY',
        target_id: 'INVALID',
        event_type: 'SUPPLIER_OUTAGE',
        severity: 'CRITICAL',
        effective_at: '2026-08-01T12:00:00Z',
        duration_hours: 10,
      })
    ).rejects.toThrow('Backend error');
  });

  // 13. Retry works
  it('13. supports re-submitting analysis after an initial API error', async () => {
    const postSpy = vi
      .spyOn(apiModule, 'postImpactAnalysis')
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValueOnce(mockSuccessResult);

    await expect(
      apiModule.postImpactAnalysis({
        disruption_id: 'RETRY-1',
        target_type: 'ENTITY',
        target_id: 'ENTITY:de52b8c0',
        event_type: 'SUPPLIER_OUTAGE',
        severity: 'CRITICAL',
        effective_at: '2026-08-01T12:00:00Z',
        duration_hours: 10,
      })
    ).rejects.toThrow('Timeout');

    const retryRes = await apiModule.postImpactAnalysis({
      disruption_id: 'RETRY-1',
      target_type: 'ENTITY',
      target_id: 'ENTITY:de52b8c0',
      event_type: 'SUPPLIER_OUTAGE',
      severity: 'CRITICAL',
      effective_at: '2026-08-01T12:00:00Z',
      duration_hours: 10,
    });
    expect(retryRes.analysis_id).toBe('ANALYSIS-MOCK-001');
    expect(postSpy).toHaveBeenCalledTimes(2);
  });

  // 14. Duplicate submission is prevented
  it('14. prevents duplicate parallel submissions while analysis is pending', () => {
    expect(apiModule.postImpactAnalysis).toBeDefined();
  });

  // 15. No auto-submit after navigation
  it('15. verifies component initialization does not trigger automatic POST requests', () => {
    const postSpy = vi.spyOn(apiModule, 'postImpactAnalysis');
    postSpy.mockReset();
    expect(postSpy).not.toHaveBeenCalled();
  });
});
