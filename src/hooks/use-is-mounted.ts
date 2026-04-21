import { useRef, useEffect, useCallback } from 'react';

export function useIsMounted() {
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isMounted = useCallback(() => isMountedRef.current, []);

  return isMounted;
}
