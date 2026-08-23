/**
 * SupplyShield 3D — Centralized Public URL & Mobile QR Network Configuration Resolver
 * Ensures QR codes generate reachable URLs on mobile devices on the same Wi-Fi / LAN or in Production.
 */

const STORAGE_KEY = 'supplyshield_custom_lan_url';
const DEFAULT_DETECTED_LAN_URL = 'http://10.20.23.50:3000';

export function getPublicAppUrl(): string {
  // 1. Environment-configured production/staging URL
  const envUrl = (import.meta as any).env?.VITE_PUBLIC_APP_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/$/, '');
  }

  // 2. User-overridden custom LAN URL from localStorage
  if (typeof window !== 'undefined') {
    const customLan = localStorage.getItem(STORAGE_KEY);
    if (customLan && customLan.trim() !== '') {
      return customLan.trim().replace(/\/$/, '');
    }

    // 3. If browser is accessed directly via LAN IP or public domain (e.g. http://192.168.1.50:3000 or https://supplyshield.app)
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return window.location.origin;
    }
  }

  // 4. Default detected development LAN IP (reachable by mobile devices on same Wi-Fi)
  return DEFAULT_DETECTED_LAN_URL;
}

export function setCustomPublicAppUrl(url: string): void {
  if (typeof window !== 'undefined') {
    if (!url || url.trim() === '') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, url.trim().replace(/\/$/, ''));
    }
  }
}

export function getComponentQRUrl(partId: string): string {
  const base = getPublicAppUrl();
  return `${base}/component/${partId.toUpperCase().trim()}`;
}

export function isLocalhostOnly(): boolean {
  if (typeof window === 'undefined') return false;
  const publicUrl = getPublicAppUrl();
  return publicUrl.includes('localhost') || publicUrl.includes('127.0.0.1');
}
