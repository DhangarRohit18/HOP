export const QR_PREFIX = 'NEXUS-MAT:';
export const VALID_MATERIAL_ID_REGEX = /^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+$/i;

export function encodeMaterialQR(materialUnitId: string): string {
  if (!materialUnitId || typeof materialUnitId !== 'string') {
    throw new Error('Invalid material unit ID for encoding');
  }
  const cleanId = materialUnitId.trim().toUpperCase();
  if (!VALID_MATERIAL_ID_REGEX.test(cleanId)) {
    throw new Error(`Malformed material unit ID format: ${materialUnitId}`);
  }
  return `${QR_PREFIX}${cleanId}`;
}

export function isValidMaterialQR(payload: string): boolean {
  if (!payload || typeof payload !== 'string') return false;
  const cleanPayload = payload.trim();

  // Reject URLs, JavaScript, HTML, tags, or malformed characters
  if (
    cleanPayload.includes('://') ||
    cleanPayload.toLowerCase().startsWith('javascript:') ||
    cleanPayload.includes('<') ||
    cleanPayload.includes('>') ||
    cleanPayload.toLowerCase().includes('data:')
  ) {
    return false;
  }

  // Check prefix case-insensitively
  if (!cleanPayload.toUpperCase().startsWith(QR_PREFIX)) {
    return false;
  }

  const rawId = cleanPayload.substring(QR_PREFIX.length).trim();
  if (!rawId) return false;

  return VALID_MATERIAL_ID_REGEX.test(rawId);
}

export function decodeMaterialQR(payload: string): string | null {
  if (!isValidMaterialQR(payload)) {
    return null;
  }
  const cleanPayload = payload.trim();
  return cleanPayload.substring(QR_PREFIX.length).trim().toUpperCase();
}
