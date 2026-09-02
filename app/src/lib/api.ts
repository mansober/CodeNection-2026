import type { HealthResponse } from '@/types/api';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function checkHealth() {
  return apiRequest<HealthResponse>('/health');
}
