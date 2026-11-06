import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { encryptField, decryptField } from '@/lib/crypto';

/** El id del chat combina paciente y médico, así siempre existe un único chat entre ambos. */
export const chatIdFor = (patientId, doctorId) => `${patientId}_${doctorId}`;

export async function ensureChat(patient, doctor) {
  const id = chatIdFor(patient.uid, doctor.uid);
  // merge: crea el chat si no existe o actualiza los nombres si ya existe.
  await setDoc(
    doc(db, 'chats', id),
    {
      participants: [patient.uid, doctor.uid],
      patientId: patient.uid,
      doctorId: doctor.uid,
      patientName: patient.name,
      doctorName: doctor.name,
      specialty: doctor.specialty || '',
    },
    { merge: true }
  );
  return id;
}

function decodeChat(id, d) {
  return { ...d, id, lastMessage: decryptField(d.lastMessage, id) };
}

export function subscribeChats(uid, cb, onError) {
  return onSnapshot(
    query(collection(db, 'chats'), where('participants', 'array-contains', uid)),
    (snap) => {
      const list = snap.docs.map((d) => decodeChat(d.id, d.data())).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      cb(list);
    },
    onError
  );
}

export function subscribeChat(chatId, cb, onError) {
  return onSnapshot(doc(db, 'chats', chatId), (snap) => cb(snap.exists() ? decodeChat(snap.id, snap.data()) : null), onError);
}

export function subscribeMessages(chatId, cb, onError) {
  return onSnapshot(
    query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'desc'), limit(150)),
    (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data(), text: decryptField(d.data().text, chatId) })));
    },
    onError
  );
}

/** Los mensajes se cifran con una llave propia de cada conversación. */
export async function sendMessage(chatId, senderId, text) {
  const now = Date.now();
  const enc = encryptField(text, chatId);
  await addDoc(collection(db, 'chats', chatId, 'messages'), { senderId, text: enc, createdAt: now });
  await updateDoc(doc(db, 'chats', chatId), { lastMessage: enc, lastSenderId: senderId, updatedAt: now });
}
