import { useEffect, useState } from 'react';

import { checkHealth } from '@/lib/api';
import type { HealthResponse } from '@/types/api';

export function useHealth() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    checkHealth()
      .then((response) => {
        if (isMounted) {
          setData(response);
          setError(null);
        }
      })
      .catch((requestError: unknown) => {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to reach API');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { data, error, isLoading };
}
