import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserProfile } from '@/services/users';
import { getProfileLocal, saveProfileLocal, clearUserData } from '@/lib/database';
import { pushPending } from '@/services/health';
import { logoutUser } from '@/services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // usuario de Firebase Auth
  const [profile, setProfile] = useState(null); // perfil (con rol) guardado en Firestore
  const [initializing, setInitializing] = useState(true);
  const [profileError, setProfileError] = useState(null);
  // Mientras se registra una cuenta, el perfil todavía no existe en Firestore.
  const registering = useRef(false);

  const loadProfile = useCallback(async (firebaseUser) => {
    setProfileError(null);
    try {
      const remote = await getUserProfile(firebaseUser.uid);
      if (remote) {
        setProfile(remote);
        saveProfileLocal(firebaseUser.uid, remote).catch(() => {});
      } else {
        setProfile(null);
        if (!registering.current) setProfileError(new Error('No se encontró el perfil de esta cuenta.'));
      }
    } catch (e) {
      // Sin conexión: usamos la copia cifrada guardada en SQLite.
      const local = await getProfileLocal(firebaseUser.uid).catch(() => null);
      if (local) setProfile(local);
      else if (!registering.current) setProfileError(e);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) await loadProfile(fbUser);
      else {
        setProfile(null);
        setProfileError(null);
      }
      setInitializing(false);
    });
    return unsub;
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (auth.currentUser) await loadProfile(auth.currentUser);
  }, [loadProfile]);

  const setRegistering = useCallback((value) => {
    registering.current = value;
  }, []);

  const logout = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      await pushPending(uid).catch(() => {});
      await clearUserData(uid).catch(() => {});
    }
    await logoutUser();
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      initializing,
      profileError,
      isDoctor: profile?.role === 'medico',
      refreshProfile,
      setProfile,
      setRegistering,
      logout,
    }),
    [user, profile, initializing, profileError, refreshProfile, setRegistering, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
