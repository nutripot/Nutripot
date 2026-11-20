// ============================================================================
// BusinessHub Enterprise - useApi Hook
// Standardized client fetch wrapper with error envelope handling and typing
// ============================================================================

import { useState, useCallback } from 'react';
import { ApiResponse } from '@/types';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: { code: string; message: string } | null;
}

export function useApi<T>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (
    url: string,
    options: RequestInit = {}
  ): Promise<T | null> => {
    setState({ data: null, loading: true, error: null });

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        credentials: 'include' as RequestCredentials,
      });

      const json: ApiResponse<T> = await response.json();

      if (!response.ok || !json.success) {
        const error = json.error || {
          code: 'API_ERROR',
          message: response.statusText || 'An error occurred during request',
        };
        setState({ data: null, loading: false, error });
        return null;
      }

      setState({ data: json.data || null, loading: false, error: null });
      return json.data || null;
    } catch (err: any) {
      const error = {
        code: 'NETWORK_ERROR',
        message: err.message || 'Network request failed',
      };
      setState({ data: null, loading: false, error });
      return null;
    }
  }, []);

  return { ...state, execute };
}
