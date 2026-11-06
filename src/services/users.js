import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { encryptField, decryptField } from '@/lib/crypto';
import { ROLES } from '@/lib/constants';

// Campos personales que se guardan cifrados en Firestore.
const SENSITIVE_FIELDS = ['phone', 'birthDate', 'allergies', 'conditions', 'emergencyContact'];

function encryptProfile(uid, data) {
  const out = { ...data };
  SENSITIVE_FIELDS.forEach((f) => {
    if (out[f] !== undefined) out[f] = encryptField(out[f] || '', uid);
  });
  return out;
}

export function decryptProfile(uid, data) {
  if (!data) return null;
  const out = { ...data, uid };
  SENSITIVE_FIELDS.forEach((f) => {
    if (out[f] !== undefined) out[f] = decryptField(out[f], uid);
  });
  return out;
}

export async function createUserProfile(uid, data) {
  const now = Date.now();
  await setDoc(doc(db, 'users', uid), encryptProfile(uid, { ...data, uid, createdAt: now, updatedAt: now }));
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? decryptProfile(uid, snap.data()) : null;
}

export async function updateUserProfile(uid, partial) {
  // El rol, correo y uid nunca se modifican desde el cliente (también lo bloquean las reglas).
  const { role, email, uid: _uid, createdAt, ...rest } = partial;
  await updateDoc(doc(db, 'users', uid), encryptProfile(uid, { ...rest, updatedAt: Date.now() }));
}

export async function savePushToken(uid, token) {
  if (!token) return;
  await updateDoc(doc(db, 'users', uid), { pushToken: token });
}

export async function listDoctors() {
  const snap = await getDocs(query(collection(db, 'users'), where('role', '==', ROLES.DOCTOR)));
  return snap.docs.map((d) => decryptProfile(d.id, d.data()));
}

export async function getPushTokenOf(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data().pushToken || null : null;
  } catch {
    return null;
  }
}
