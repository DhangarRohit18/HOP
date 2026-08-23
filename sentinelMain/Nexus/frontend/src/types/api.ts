export interface NormalizedApiError {
  message: string;
  statusCode?: number;
  isTimeout?: boolean;
  isNetworkError?: boolean;
  detail?: string;
}

export interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;      // Default: 10,000 ms
  maxRetries?: number;     // Default: 2
  retryDelayMs?: number;   // Default: 1,000 ms
}

export interface StaleDataContainer<T> {
  data: T | null;
  isStale: boolean;
  loading: boolean;
  error: NormalizedApiError | null;
  lastUpdated: Date | null;
}
