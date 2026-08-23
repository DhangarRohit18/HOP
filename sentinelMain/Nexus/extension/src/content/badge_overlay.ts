import { DetectedEntity, ExtensionMessage, ExtensionResponse } from '../shared/types';

const processedNodes = new WeakSet<Node>();

export interface BadgeOverlayConfig {
  onSelectEntity?: (entity: DetectedEntity) => void;
}

export function injectNEXUSBadge(
  textNode: Text,
  entity: DetectedEntity,
  config?: BadgeOverlayConfig
): HTMLElement | null {
  if (!textNode || !textNode.parentNode || processedNodes.has(textNode)) {
    return null;
  }

  // Prevent injecting into script/style/input/textarea or inside NEXUS badge hosts
  const parentElement = textNode.parentElement;
  if (!parentElement) return null;

  const forbiddenTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'NEXUS-BADGE-HOST'];
  if (forbiddenTags.includes(parentElement.tagName.toUpperCase())) {
    return null;
  }

  if (parentElement.closest('nexus-badge-host')) {
    return null;
  }

  processedNodes.add(textNode);

  // Create badge host element
  const host = document.createElement('nexus-badge-host');
  host.style.display = 'inline-block';
  host.style.margin = '0 3px';
  host.style.verticalAlign = 'middle';

  // Attach closed Shadow DOM for zero style leakage
  const shadow = host.attachShadow({ mode: 'closed' });

  // Create badge button element inside Shadow DOM
  const badgeBtn = document.createElement('button');
  badgeBtn.setAttribute('type', 'button');
  badgeBtn.setAttribute('tabindex', '0');
  badgeBtn.setAttribute('role', 'button');
  badgeBtn.setAttribute('aria-label', `NEXUS Contextual Intelligence for ${entity.identifier} (${entity.entityType})`);

  badgeBtn.innerHTML = `
    <span style="font-weight: 800; color: #a5b4fc;">NEXUS</span>
    <span style="font-size: 8px; opacity: 0.8; margin-left: 2px;">❖</span>
  `;

  // Apply isolated internal styles inside Shadow DOM
  badgeBtn.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  badgeBtn.style.fontSize = '9px';
  badgeBtn.style.fontStyle = 'normal';
  badgeBtn.style.fontWeight = '700';
  badgeBtn.style.lineHeight = '1';
  badgeBtn.style.letterSpacing = '0.04em';
  badgeBtn.style.color = '#818cf8';
  badgeBtn.style.backgroundColor = 'rgba(99, 102, 241, 0.15)';
  badgeBtn.style.border = '1px solid rgba(129, 140, 248, 0.4)';
  badgeBtn.style.borderRadius = '4px';
  badgeBtn.style.padding = '2px 5px';
  badgeBtn.style.cursor = 'pointer';
  badgeBtn.style.transition = 'all 0.15s ease-in-out';
  badgeBtn.style.outline = 'none';
  badgeBtn.style.userSelect = 'none';

  // Hover and Focus States
  badgeBtn.addEventListener('mouseenter', () => {
    badgeBtn.style.backgroundColor = 'rgba(99, 102, 241, 0.3)';
    badgeBtn.style.borderColor = 'rgba(129, 140, 248, 0.8)';
    badgeBtn.style.color = '#ffffff';
  });

  badgeBtn.addEventListener('mouseleave', () => {
    badgeBtn.style.backgroundColor = 'rgba(99, 102, 241, 0.15)';
    badgeBtn.style.borderColor = 'rgba(129, 140, 248, 0.4)';
    badgeBtn.style.color = '#818cf8';
  });

  badgeBtn.addEventListener('focus', () => {
    badgeBtn.style.boxShadow = '0 0 0 2px rgba(129, 140, 248, 0.5)';
  });

  badgeBtn.addEventListener('blur', () => {
    badgeBtn.style.boxShadow = 'none';
  });

  // Action Handler: Dispatch ENTITY_SELECTED message
  const triggerSelect = (e: Event) => {
    e.stopPropagation();
    e.preventDefault();

    if (config?.onSelectEntity) {
      config.onSelectEntity(entity);
    }

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      const msg: ExtensionMessage = {
        type: 'ENTITY_SELECTED',
        payload: { entity },
      };
      chrome.runtime.sendMessage(msg, (response: ExtensionResponse) => {
        console.log('[NEXUS Content Script] Entity Selected response:', response);
      });
    }
  };

  badgeBtn.addEventListener('click', triggerSelect);
  badgeBtn.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      triggerSelect(e);
    }
  });

  shadow.appendChild(badgeBtn);

  // Insert badge immediately after the text node
  if (textNode.nextSibling) {
    parentElement.insertBefore(host, textNode.nextSibling);
  } else {
    parentElement.appendChild(host);
  }

  return host;
}

export function clearAllNEXUSBadges(): void {
  const hosts = document.querySelectorAll('nexus-badge-host');
  hosts.forEach((h) => h.remove());
}
