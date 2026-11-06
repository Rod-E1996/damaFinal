import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { decryptField, decryptJSON } from '@/lib/crypto';
import { cachePrescriptions, listPrescriptionsLocal } from '@/lib/database';
import { ROLES } from '@/lib/constants';

function decode(id, d) {
  return {
    ...d,
    id,
    diagnosis: decryptField(d.diagnosis, d.patientId),
    medications: decryptJSON(d.medications, d.patientId, []),
    instructions: decryptField(d.instructions, d.patientId),
  };
}

/**
 * Suscripción en tiempo real a las recetas. Para el paciente, además se guarda
 * una copia cifrada en SQLite para consultarlas sin conexión.
 */
export function subscribePrescriptions(uid, role, cb, onError) {
  const field = role === ROLES.DOCTOR ? 'doctorId' : 'patientId';
  if (role !== ROLES.DOCTOR) {
    listPrescriptionsLocal(uid).then((local) => local.length && cb(local, true)).catch(() => {});
  }
  return onSnapshot(
    query(collection(db, 'prescriptions'), where(field, '==', uid)),
    (snap) => {
      const list = snap.docs.map((d) => decode(d.id, d.data())).sort((a, b) => b.createdAt - a.createdAt);
      cb(list, false);
      if (role !== ROLES.DOCTOR) cachePrescriptions(uid, list).catch(() => {});
    },
    onError
  );
}

export async function getPrescription(id, uid) {
  try {
    const snap = await getDoc(doc(db, 'prescriptions', id));
    if (snap.exists()) return decode(snap.id, snap.data());
  } catch {
    // Sin conexión: se intenta con la copia local.
  }
  const local = await listPrescriptionsLocal(uid);
  return local.find((r) => r.id === id) || null;
}

export function isPrescriptionActive(rx) {
  return (rx.validUntil || 0) > Date.now();
}
