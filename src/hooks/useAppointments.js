import { useEffect, useState } from 'react';
import { subscribeAppointments } from '@/services/appointments';
import { useAuth } from '@/context/AuthContext';
import { firebaseErrorMessage } from '@/lib/validators';

/** Citas del usuario actual en tiempo real. */
export function useAppointments() {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!profile) return;
    return subscribeAppointments(
      profile.uid,
      profile.role,
      (list) => {
        setAppointments(list);
        setLoading(false);
        setError(null);
      },
      (e) => {
        setError(firebaseErrorMessage(e));
        setLoading(false);
      }
    );
  }, [profile?.uid, profile?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  return { appointments, loading, error };
}
