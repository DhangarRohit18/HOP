import { EntityType, DetectedEntity } from './types';

export const API_TIMEOUT_MS = 5000;
export const TRACEABILITY_TIMEOUT_MS = 10000;
export const ACTION_TIMEOUT_MS = 10000;

export const EXTENSION_CONSTANTS = {
  NAME: 'NEXUS Contextual Operational Intelligence',
  VERSION: '1.0.0',
  DEFAULT_BACKEND_URL: 'http://localhost:8000',
  DEFAULT_FRONTEND_URL: 'http://localhost:5173',
  API: {
    TIMEOUT_MS: API_TIMEOUT_MS,
    TRACEABILITY_TIMEOUT_MS: TRACEABILITY_TIMEOUT_MS,
    ACTION_TIMEOUT_MS: ACTION_TIMEOUT_MS,
  },
  STATUS: {
    SHELL_READY: 'Extension Shell Ready',
    ENTITY_DETECTED_LOCAL: 'Entity detected locally',
    NOT_CONNECTED: 'Not connected yet',
    CONNECTED: 'CONNECTED',
    UNAVAILABLE: 'OFFLINE',
  },
} as const;

export const ENTITY_PATTERNS = [
  { type: 'SUPPLIER' as EntityType, pattern: /(?<![\w\-])SUP-\d{3,6}\b/gi },
  { type: 'PURCHASE_ORDER' as EntityType, pattern: /(?<![\w\-])PO-\d{4}-\d{3,6}\b/gi },
  { type: 'SHIPMENT' as EntityType, pattern: /(?<![\w\-])SHP-\d{4}-\d{3,6}\b/gi },
  { type: 'COMPONENT' as EntityType, pattern: /(?<![\w\-])CMP-\d{3,6}\b/gi },
  { type: 'PRODUCTION_ORDER' as EntityType, pattern: /(?<![\w\-])PRD-\d{4}-\d{3,6}\b/gi },
  { type: 'CUSTOMER_ORDER' as EntityType, pattern: /(?<![\w\-])SO-\d{4}-\d{3,6}\b/gi },
  { type: 'ENTITY' as EntityType, pattern: /(?<![\w\-])ENTITY:([a-f0-9\-]{36})\b/gi },
  { type: 'RESOURCE' as EntityType, pattern: /(?<![\w\-])RESOURCE:([a-f0-9\-]{36})\b/gi },
];

export const KNOWN_BUSINESS_CODE_MAP: Record<string, { nodeType: string; nodeId: string; fullKey: string }> = {
  'SUP-001': { nodeType: 'ENTITY', nodeId: 'de52b8c0-0c2e-57aa-8595-0d99964e8519', fullKey: 'ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519' },
  'PO-2026-001': { nodeType: 'ENTITY', nodeId: '70c39687-7fb8-585d-9d74-98283066cbeb', fullKey: 'ENTITY:70c39687-7fb8-585d-9d74-98283066cbeb' },
  'SHP-2026-001': { nodeType: 'ENTITY', nodeId: '4ad15350-a041-5989-9820-c6aadf4b25e0', fullKey: 'ENTITY:4ad15350-a041-5989-9820-c6aadf4b25e0' },
  'CMP-001': { nodeType: 'RESOURCE', nodeId: '92f1b4cc-6721-5c52-9a05-833f45eeaccc', fullKey: 'RESOURCE:92f1b4cc-6721-5c52-9a05-833f45eeaccc' },
  'PRD-2026-001': { nodeType: 'ENTITY', nodeId: '99feeb26-3d93-5dac-9fc1-0e4c909b175e', fullKey: 'ENTITY:99feeb26-3d93-5dac-9fc1-0e4c909b175e' },
  'SO-2026-001': { nodeType: 'ENTITY', nodeId: '2127a82b-518e-5301-83d5-c4cbf919aefc', fullKey: 'ENTITY:2127a82b-518e-5301-83d5-c4cbf919aefc' },
};

export function resolveNodeParams(entity: DetectedEntity): { nodeType: string; nodeId: string; fullKey: string } {
  const code = entity.identifier.trim();
  if (KNOWN_BUSINESS_CODE_MAP[code]) {
    return KNOWN_BUSINESS_CODE_MAP[code];
  }

  if (entity.entityType === 'RESOURCE') {
    return { nodeType: 'RESOURCE', nodeId: code, fullKey: code.includes(':') ? code : `RESOURCE:${code}` };
  }

  const primaryType = entity.entityType === 'COMPONENT' ? 'RESOURCE' : 'ENTITY';
  return { nodeType: primaryType, nodeId: code, fullKey: code.includes(':') ? code : `${primaryType}:${code}` };
}

export function parseTextForEntities(text: string, foundAt?: string): DetectedEntity[] {
  if (!text || typeof text !== 'string') return [];
  const results: DetectedEntity[] = [];
  const seenMatches = new Set<string>();

  for (const { type, pattern } of ENTITY_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const rawValue = match[0];
      if (seenMatches.has(rawValue)) continue;
      seenMatches.add(rawValue);

      let identifier = rawValue;
      if (type === 'ENTITY' && match[1]) {
        identifier = match[1];
      } else if (type === 'RESOURCE' && match[1]) {
        identifier = match[1];
      }

      results.push({
        rawValue,
        entityType: type,
        identifier,
        foundAt,
      });
    }
  }

  return results;
}
