import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUserProfile } from './users';
import { logAction } from '@/lib/database';

/**
 * Firebase Authentication nunca guarda la contraseña en texto plano: la
 * almacena con un hash (scrypt) en sus servidores. La app tampoco la guarda.
 */
export async function registerUser({ email, password, profile }) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  try {
    await updateProfile(cred.user, { displayName: profile.name });
    await createUserProfile(cred.user.uid, { ...profile, email: cred.user.email });
  } catch (e) {
    // Si no se pudo crear el perfil, eliminamos la cuenta para no dejarla incompleta.
    await cred.user.delete().catch(() => {});
    throw e;
  }
  sendEmailVerification(cred.user).catch(() => {});
  await logAction(cred.user.uid, 'Registro de cuenta');
  return cred.user;
}

export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  await logAction(cred.user.uid, 'Inicio de sesión');
  return cred.user;
}

export async function logoutUser() {
  const uid = auth.currentUser?.uid;
  await logAction(uid, 'Cierre de sesión');
  await signOut(auth);
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

export async function resendVerification() {
  if (auth.currentUser) await sendEmailVerification(auth.currentUser);
}
