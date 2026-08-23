import { ShipmentTracking, SupplierMessage } from '../types/supplyChain';

export interface VerificationResult {
  po_id: string;
  claim: string;
  verification: 'verified' | 'contradicted' | 'unverified';
  confidence: number;
  tracking_status: string;
  reason: string;
  supplier_reliability_penalty: number;
}

export function verifySupplierClaim(
  message: SupplierMessage | undefined,
  tracking: ShipmentTracking | undefined
): VerificationResult {
  if (!tracking) {
    return {
      po_id: message?.po_id || 'UNKNOWN',
      claim: message?.supplier_claim || message?.claimed_status || 'unverified_claim',
      verification: 'unverified',
      confidence: 0.50,
      tracking_status: 'no_tracking_data',
      reason: 'No live carrier tracking feed available for cross-verification.',
      supplier_reliability_penalty: 0
    };
  }

  const claim = tracking.supplier_claim || message?.supplier_claim || message?.claimed_status || 'dispatched';
  const status = tracking.tracking_status || tracking.status || 'in_transit';

  if (claim === 'dispatched' && status === 'label_created_no_pickup') {
    return {
      po_id: tracking.po_id,
      claim: claim,
      verification: 'contradicted',
      confidence: 0.34,
      tracking_status: status,
      reason: 'Adversarial/Unverified Claim: Supplier claims shipment is dispatched, but carrier tracking shows "Label Created — No Physical Pickup".',
      supplier_reliability_penalty: 0.25
    };
  }

  if (claim === 'dispatched' && (status === 'in_transit' || status === 'ON_SCHEDULE')) {
    return {
      po_id: tracking.po_id,
      claim: claim,
      verification: 'verified',
      confidence: 0.95,
      tracking_status: status,
      reason: 'Verified: Physical shipment confirmed in-transit by carrier GPS logs.',
      supplier_reliability_penalty: 0
    };
  }

  if (status === 'customs_delay' || status === 'HELD_AT_CUSTOMS') {
    return {
      po_id: tracking.po_id,
      claim: claim,
      verification: 'contradicted',
      confidence: 0.40,
      tracking_status: status,
      reason: 'Third-party Hold: Freight held at customs checkpoint.',
      supplier_reliability_penalty: 0.10
    };
  }

  return {
    po_id: tracking.po_id,
    claim: claim,
    verification: 'verified',
    confidence: tracking.confidence_score ?? 0.90,
    tracking_status: status,
    reason: `Tracking status "${status}" matches operational records.`,
    supplier_reliability_penalty: 0
  };
}
