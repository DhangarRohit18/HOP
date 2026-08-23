import { EXTENSION_CONSTANTS } from '../shared/constants';
import { ExtensionMessage } from '../shared/types';

document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('ext-status');
  const scannerStatusEl = document.getElementById('scanner-status');
  const activateBtn = document.getElementById('btn-activate');

  if (statusEl) {
    statusEl.textContent = 'READY';
  }

  if (activateBtn) {
    activateBtn.addEventListener('click', async () => {
      if (typeof chrome === 'undefined' || !chrome.tabs) return;

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      // Programmatically execute scanner script if needed
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/scanner.js'],
        });
      } catch (e) {
        console.log('[NEXUS Popup] Content script already injected or activeTab scope:', e);
      }

      // Send activation message to content script
      const msg: ExtensionMessage = { type: 'ACTIVATE_SCANNER' };
      chrome.tabs.sendMessage(tab.id, msg, (response) => {
        if (response && response.success) {
          if (scannerStatusEl) {
            scannerStatusEl.textContent = `ACTIVE (${response.data?.count || 0} Found)`;
          }
        }
      });
    });
  }

  console.log(`[NEXUS Popup] Loaded popup for ${EXTENSION_CONSTANTS.NAME}`);
});
