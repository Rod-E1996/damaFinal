import { useCallback, useEffect, useState } from 'react';
import { listDoctors } from '@/services/users';
import { firebaseErrorMessage } from '@/lib/validators';

async function fetchSorted() {
  const list = await listDoctors();
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export function useDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const apply = useCallback((promise) => {
    return promise
      .then((list) => {
        setDoctors(list);
        setError(null);
      })
      .catch((e) => setError(firebaseErrorMessage(e)))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    apply(fetchSorted());
  }, [apply]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    return apply(fetchSorted());
  }, [apply]);

  return { doctors, loading, refreshing, error, refresh };
}
