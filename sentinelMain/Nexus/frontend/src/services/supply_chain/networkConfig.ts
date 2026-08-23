export interface NetworkNode {
  id: string;
  type: string;
  label: string;
  status: string;
}

export interface NetworkEdge {
  source: string;
  target: string;
  type: string;
}

export const networkConfig = {
  apiBase: '/api/v1',
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000,
};

export function getNetworkNodes(): NetworkNode[] { return []; }
export function getNetworkEdges(): NetworkEdge[] { return []; }
export function getComponentQRUrl(id: string): string { return ''; }
export function getPublicAppUrl(): string { return ''; }
export function setCustomPublicAppUrl(url: string): void {}
export function isLocalhostOnly(): boolean { return false; }

export default networkConfig;
