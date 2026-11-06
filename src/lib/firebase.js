import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.warn('Faltan variables EXPO_PUBLIC_FIREBASE_* en el archivo .env');
}

// En recargas rápidas (Fast Refresh) evitamos inicializar dos veces.
const firstInit = getApps().length === 0;
export const app = firstInit ? initializeApp(firebaseConfig) : getApp();

// Persistencia de sesión con AsyncStorage para que el usuario no tenga que
// iniciar sesión cada vez que abre la app.
export const auth = firstInit
  ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
  : getAuth(app);

// Long polling mejora la estabilidad de las conexiones en tiempo real en Android.
export const db = firstInit
  ? initializeFirestore(app, { experimentalForceLongPolling: true })
  : getFirestore(app);
