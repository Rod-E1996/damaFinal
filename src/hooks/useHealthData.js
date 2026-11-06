import { useCallback, useEffect, useState } from 'react';
import { getMeasurements, getRecords, HEALTH_CHANGED } from '@/services/health';
import { on } from '@/lib/events';

/** Lee mediciones e historial desde SQLite y se actualiza cuando cambian. */
export function useHealthData(uid) {
  const [measurements, setMeasurements] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const [m, r] = await Promise.all([getMeasurements(uid), getRecords(uid)]);
      setMeasurements(m);
      setRecords(r);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    load();
    return on(HEALTH_CHANGED, load);
  }, [load]);

  return { measurements, records, loading, reload: load };
}
