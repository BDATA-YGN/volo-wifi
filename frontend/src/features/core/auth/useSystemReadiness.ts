'use client';

import { useCallback, useEffect, useState } from 'react';
import { probeSystemReadiness, type ReadinessState } from './systemReadiness';

export function useSystemReadiness() {
  const [state, setState] = useState<ReadinessState>({ phase: 'loading' });

  const refresh = useCallback(async (): Promise<boolean> => {
    setState({ phase: 'loading' });
    const next = await probeSystemReadiness();
    setState(next);
    return next.phase === 'ready';
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    state,
    refresh,
    isLoading: state.phase === 'loading',
    isReady: state.phase === 'ready',
  };
}
