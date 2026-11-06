import { useEffect, useState } from 'react';

/**
 * Hora actual que se actualiza periódicamente. Mantiene el render "puro"
 * (sin llamar Date.now() al dibujar) y refresca estados como "próximas citas".
 */
export function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
