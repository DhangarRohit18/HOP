export interface DependencyStatus {
  database: string;
  redis: string;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy' | string;
  service: string;
  version: string;
  environment: string;
  dependencies: DependencyStatus;
}

export interface HealthFetchState {
  data: HealthResponse | null;
  loading: boolean;
  error: string | null;
  lastChecked: Date | null;
}
