const API_BASE = '';

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const url = API_BASE + path;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || response.statusText);
  }
  return response.json() as Promise<T>;
}

export default { fetchApi };
