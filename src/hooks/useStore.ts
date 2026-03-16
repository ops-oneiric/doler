import { useState, useEffect, useCallback } from 'react';
import { subscribe } from '../store';

/**
 * Forces a re-render whenever the store notifies.
 */
export function useStore(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);
  return tick;
}
