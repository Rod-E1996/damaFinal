import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { encryptField, decryptField, newId } from '@/lib/crypto';
import {
  upsertMeasurementLocal,
  listMeasurementsLocal,
  pendingMeasurements,
  markMeasurementSynced,
  deleteMeasurementLocal,
  upsertRecordLocal,
  listRecordsLocal,
  pendingRecords,
  markRecordSynced,
  deleteRecordLocal,
} from '@/lib/database';
import { emit } from '@/lib/events';

/**
 * Historial médico y mediciones con enfoque "offline first":
 * 1. Se guarda primero en SQLite (funciona sin internet).
 * 2. Se intenta subir a Firestore; si funciona, se marca como sincronizado.
 * 3. Un listener en tiempo real trae a SQLite los cambios hechos desde otros
 *    dispositivos (por ejemplo, la consulta registrada por el médico).
 */

export const HEALTH_CHANGED = 'health-changed';

const measurementsCol = (uid) => collection(db, 'users', uid, 'measurements');
const recordsCol = (uid) => collection(db, 'users', uid, 'records');

function measurementToRemote(m) {
  return {
    type: m.type,
    value: m.value,
    value2: m.value2 ?? null,
    unit: m.unit,
    date: m.date,
    note: encryptField(m.note || '', m.userId),
  };
}

function recordToRemote(r) {
  return {
    type: r.type,
    title: r.title,
    description: encryptField(r.description || '', r.userId),
    doctorName: r.doctorName || null,
    createdBy: r.createdBy || r.userId,
    date: r.date,
  };
}

// ---------------- Mediciones ----------------

export async function addMeasurement(uid, data) {
  const m = { id: newId(), userId: uid, date: Date.now(), ...data };
  await upsertMeasurementLocal(m, false);
  emit(HEALTH_CHANGED);
  try {
    await setDoc(doc(measurementsCol(uid), m.id), measurementToRemote(m));
    await markMeasurementSynced(m.id);
    emit(HEALTH_CHANGED);
    return { synced: true };
  } catch {
    return { synced: false };
  }
}

export async function removeMeasurement(uid, id) {
  await deleteDoc(doc(measurementsCol(uid), id));
  await deleteMeasurementLocal(id);
  emit(HEALTH_CHANGED);
}

export const getMeasurements = listMeasurementsLocal;

// ---------------- Historial ----------------

export async function addRecord(uid, data) {
  const r = { id: newId(), userId: uid, date: Date.now(), ...data };
  await upsertRecordLocal(r, false);
  emit(HEALTH_CHANGED);
  try {
    await setDoc(doc(recordsCol(uid), r.id), recordToRemote(r));
    await markRecordSynced(r.id);
    emit(HEALTH_CHANGED);
    return { synced: true };
  } catch {
    return { synced: false };
  }
}

export async function removeRecord(uid, id) {
  await deleteDoc(doc(recordsCol(uid), id));
  await deleteRecordLocal(id);
  emit(HEALTH_CHANGED);
}

export const getRecords = listRecordsLocal;

// ---------------- Sincronización ----------------

/** Sube a Firestore lo que se guardó sin conexión. Devuelve cuántos elementos se sincronizaron. */
export async function pushPending(uid) {
  let count = 0;
  for (const m of await pendingMeasurements(uid)) {
    try {
      await setDoc(doc(measurementsCol(uid), m.id), measurementToRemote(m));
      await markMeasurementSynced(m.id);
      count += 1;
    } catch {
      // Se reintentará en la próxima sincronización.
    }
  }
  for (const r of await pendingRecords(uid)) {
    try {
      await setDoc(doc(recordsCol(uid), r.id), recordToRemote(r));
      await markRecordSynced(r.id);
      count += 1;
    } catch {
      // Se reintentará en la próxima sincronización.
    }
  }
  if (count) emit(HEALTH_CHANGED);
  return count;
}

/** Escucha los cambios remotos y los replica en SQLite. */
export function startHealthSync(uid) {
  const unsubM = onSnapshot(
    measurementsCol(uid),
    async (snap) => {
      for (const ch of snap.docChanges()) {
        const d = ch.doc.data();
        if (ch.type === 'removed') {
          await deleteMeasurementLocal(ch.doc.id);
        } else {
          await upsertMeasurementLocal(
            {
              id: ch.doc.id,
              userId: uid,
              type: d.type,
              value: d.value,
              value2: d.value2,
              unit: d.unit,
              date: d.date,
              note: decryptField(d.note, uid),
            },
            true
          );
        }
      }
      emit(HEALTH_CHANGED);
    },
    () => {}
  );
  const unsubR = onSnapshot(
    recordsCol(uid),
    async (snap) => {
      for (const ch of snap.docChanges()) {
        const d = ch.doc.data();
        if (ch.type === 'removed') {
          await deleteRecordLocal(ch.doc.id);
        } else {
          await upsertRecordLocal(
            {
              id: ch.doc.id,
              userId: uid,
              type: d.type,
              title: d.title,
              description: decryptField(d.description, uid),
              doctorName: d.doctorName,
              date: d.date,
            },
            true
          );
        }
      }
      emit(HEALTH_CHANGED);
    },
    () => {}
  );
  pushPending(uid).catch(() => {});
  return () => {
    unsubM();
    unsubR();
  };
}

// ---------------- Vista del médico (solo lectura remota) ----------------

export async function fetchPatientHealth(patientId) {
  const [mSnap, rSnap] = await Promise.all([getDocs(measurementsCol(patientId)), getDocs(recordsCol(patientId))]);
  const measurements = mSnap.docs
    .map((d) => ({ id: d.id, ...d.data(), note: decryptField(d.data().note, patientId) }))
    .sort((a, b) => b.date - a.date);
  const records = rSnap.docs
    .map((d) => ({ id: d.id, ...d.data(), description: decryptField(d.data().description, patientId) }))
    .sort((a, b) => b.date - a.date);
  return { measurements, records };
}
