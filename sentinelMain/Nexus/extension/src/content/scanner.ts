import { DetectedEntity, ExtensionMessage, IncidentContext, IncidentSeverity, IncidentStatus } from '../shared/types';
import { parseTextForEntities } from '../shared/constants';
import { injectNEXUSBadge, clearAllNEXUSBadges } from './badge_overlay';

const scannedNodes = new WeakSet<Node>();
let mutationObserver: MutationObserver | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastActiveContextId: string | null = null;
let lastActiveIncidentId: string | null = null;

const FORBIDDEN_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEXTAREA',
  'INPUT',
  'SELECT',
  'OPTION',
  'NEXUS-BADGE-HOST',
]);

export function detectActivePortalContext(root: Node = document.body): DetectedEntity | null {
  if (typeof document === 'undefined' || !root) return null;

  const activeView = (typeof document !== 'undefined' && document.querySelector
    ? document.querySelector('.tab-view.active') || document.querySelector('.active-content-view') || root
    : root) as Node;

  if (!activeView) return null;

  const textWalker = document.createTreeWalker(activeView, NodeFilter.SHOW_TEXT, {
    acceptNode(node: Node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (FORBIDDEN_TAGS.has(parent.tagName.toUpperCase())) return NodeFilter.FILTER_REJECT;
      if (parent.closest('nexus-badge-host')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let currentNode: Node | null = textWalker.nextNode();
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  while (currentNode) {
    if (currentNode.nodeType === Node.TEXT_NODE && currentNode.nodeValue?.trim()) {
      const entities = parseTextForEntities(currentNode.nodeValue, currentUrl);
      if (entities.length > 0) {
        return entities[0];
      }
    }
    currentNode = textWalker.nextNode();
  }

  return null;
}

export function detectActiveIncident(root: Node = document.body): IncidentContext | null {
  if (typeof document === 'undefined' || !root) return null;

  const incidentEl = document.querySelector('.incident-panel[data-incident-id]') ||
                     document.querySelector('[data-incident-id]');

  if (!incidentEl) return null;

  const incidentId = incidentEl.getAttribute('data-incident-id') || 'INC-2026-001';
  const entityId = incidentEl.getAttribute('data-entity-id') || 'SUP-001';
  const eventType = incidentEl.getAttribute('data-event-type') || 'SUPPLIER_OUTAGE';
  const severity = (incidentEl.getAttribute('data-severity') || 'CRITICAL') as IncidentSeverity;
  const durationHours = Number(incidentEl.getAttribute('data-duration') || '200');
  const status = (incidentEl.getAttribute('data-status') || 'ACTIVE') as IncidentStatus;

  return {
    incidentId,
    entityId,
    eventType,
    severity,
    durationHours,
    status,
    source: 'enterprise_portal',
  };
}

export function notifyContextChangeIfUpdated(): void {
  const activeEntity = detectActivePortalContext();
  if (activeEntity && activeEntity.identifier !== lastActiveContextId) {
    lastActiveContextId = activeEntity.identifier;
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      const msg: ExtensionMessage = {
        type: 'ENTITY_CONTEXT_CHANGED',
        payload: {
          entity: activeEntity,
          source: 'enterprise_portal',
        },
      };
      chrome.runtime.sendMessage(msg, (response) => {
        console.log('[NEXUS Content Script] Entity Context Changed response:', response);
      });
    }
  }

  const activeIncident = detectActiveIncident();
  if (activeIncident && activeIncident.incidentId !== lastActiveIncidentId) {
    lastActiveIncidentId = activeIncident.incidentId;
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      const msg: ExtensionMessage = {
        type: 'INCIDENT_DETECTED',
        payload: {
          incident: activeIncident,
          source: 'enterprise_portal',
        },
      };
      chrome.runtime.sendMessage(msg, (response) => {
        console.log('[NEXUS Content Script] Incident Detected response:', response);
      });
    }
  }
}

export function scanDOM(root: Node = document.body): DetectedEntity[] {
  if (!root || typeof document === 'undefined') return [];

  const detected: DetectedEntity[] = [];
  const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node: Node) {
      if (scannedNodes.has(node)) {
        return NodeFilter.FILTER_REJECT;
      }
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (FORBIDDEN_TAGS.has(parent.tagName.toUpperCase())) {
        return NodeFilter.FILTER_REJECT;
      }
      if (parent.closest('nexus-badge-host')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodesToProcess: Text[] = [];
  let currentNode: Node | null = textWalker.nextNode();
  while (currentNode) {
    if (currentNode.nodeType === Node.TEXT_NODE && currentNode.nodeValue?.trim()) {
      nodesToProcess.push(currentNode as Text);
    }
    currentNode = textWalker.nextNode();
  }

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  for (const textNode of nodesToProcess) {
    scannedNodes.add(textNode);
    const content = textNode.nodeValue || '';
    const entities = parseTextForEntities(content, currentUrl);

    if (entities.length > 0) {
      for (const entity of entities) {
        detected.push(entity);
        injectNEXUSBadge(textNode, entity);
      }
    }
  }

  notifyContextChangeIfUpdated();

  return detected;
}

export function startMutationObserver(): void {
  if (typeof document === 'undefined' || mutationObserver) return;

  mutationObserver = new MutationObserver((mutations) => {
    let shouldScan = false;

    for (const mutation of mutations) {
      if (mutation.type === 'childList' || mutation.type === 'attributes') {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const added = mutation.addedNodes[i];
          if (added.nodeName.toUpperCase() === 'NEXUS-BADGE-HOST') {
            continue; // Ignore our own injected badges
          }
          if (added.nodeType === Node.ELEMENT_NODE || added.nodeType === Node.TEXT_NODE) {
            shouldScan = true;
            break;
          }
        }
        if (mutation.type === 'attributes' || mutation.target) {
          shouldScan = true;
        }
      }
      if (shouldScan) break;
    }

    if (shouldScan) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        scanDOM();
        notifyContextChangeIfUpdated();
      }, 250);
    }
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style'],
  });
}

export function stopMutationObserver(): void {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

export function clearScanner(): void {
  stopMutationObserver();
  clearAllNEXUSBadges();
  lastActiveContextId = null;
  lastActiveIncidentId = null;
}

// Explicit activation listener (triggered via activeTab or extension popup)
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === 'ACTIVATE_SCANNER') {
      const entities = scanDOM();
      startMutationObserver();
      notifyContextChangeIfUpdated();
      sendResponse({
        success: true,
        type: 'SCANNER_ACTIVATED',
        data: { count: entities.length, entities },
        timestamp: new Date().toISOString(),
      });
      return true;
    }
    return false;
  });
}
