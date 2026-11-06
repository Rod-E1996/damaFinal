import {
  collection,
  doc,
  writeBatch,
  query,
  where,
  onSnapshot,
  getDocs,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { encryptField, decryptField, encryptJSON, newId, verificationCode } from '@/lib/crypto';
import { fromDateKey } from '@/lib/dates';
import { ROLES } from '@/lib/constants';

export const slotId = (doctorId, date, time) => `${doctorId}_${date}_${time.replace(':', '')}`;

function decode(id, data) {
  return { ...data, id, reason: decryptField(data.reason, data.patientId) };
}

/**
 * Reserva una cita. Se escribe a la vez (lote atómico) la cita y el "slot"
 * del horario. Si otro paciente ya tomó ese horario, las reglas de Firestore
 * rechazan la escritura y no se crea nada.
 */
export async function bookAppointment({ patient, doctor, date, time, mode, reason }) {
  const id = newId();
  const now = Date.now();
  const batch = writeBatch(db);
  const sId = slotId(doctor.uid, date, time);
  batch.set(doc(db, 'slots', sId), {
    doctorId: doctor.uid,
    patientId: patient.uid,
    appointmentId: id,
    date,
    time,
  });
  const appt = {
    patientId: patient.uid,
    patientName: patient.name,
    doctorId: doctor.uid,
    doctorName: doctor.name,
    specialty: doctor.specialty,
    date,
    time,
    startsAt: fromDateKey(date, time).getTime(),
    mode,
    reason: encryptField(reason, patient.uid),
    status: 'pendiente',
    slotId: sId,
    createdAt: now,
    updatedAt: now,
  };
  batch.set(doc(db, 'appointments', id), appt);
  await batch.commit();
  return { id, ...appt, reason };
}

export async function takenSlots(doctorId, date) {
  const snap = await getDocs(
    query(collection(db, 'slots'), where('doctorId', '==', doctorId), where('date', '==', date))
  );
  return snap.docs.map((d) => d.data().time);
}

export function subscribeAppointments(uid, role, cb, onError) {
  const field = role === ROLES.DOCTOR ? 'doctorId' : 'patientId';
  return onSnapshot(
    query(collection(db, 'appointments'), where(field, '==', uid)),
    (snap) => {
      const list = snap.docs.map((d) => decode(d.id, d.data())).sort((a, b) => a.startsAt - b.startsAt);
      cb(list);
    },
    onError
  );
}

export function subscribeAppointment(id, cb, onError) {
  return onSnapshot(
    doc(db, 'appointments', id),
    (snap) => cb(snap.exists() ? decode(snap.id, snap.data()) : null),
    onError
  );
}

export async function changeStatus(appt, status) {
  await updateDoc(doc(db, 'appointments', appt.id), { status, updatedAt: Date.now() });
  if (status === 'cancelada' && appt.slotId) {
    // Liberamos el horario para que otro paciente pueda reservarlo.
    await deleteDoc(doc(db, 'slots', appt.slotId)).catch(() => {});
  }
}

/**
 * El médico finaliza la consulta: se crea el registro en el historial del
 * paciente, la receta (opcional) y la cita pasa a "completada".
 */
export async function completeConsult(appt, doctor, { diagnosis, notes, medications, instructions, issuePrescription }) {
  const now = Date.now();
  const batch = writeBatch(db);
  const p = appt.patientId;

  const recordId = newId();
  const summary = [`Diagnóstico: ${diagnosis}`, notes ? `Notas: ${notes}` : '', medications.length ? `Medicamentos: ${medications.map((m) => m.name).join(', ')}` : '']
    .filter(Boolean)
    .join('\n');
  batch.set(doc(db, 'users', p, 'records', recordId), {
    type: 'consulta',
    title: `Consulta de ${appt.specialty || 'medicina'}`,
    description: encryptField(summary, p),
    doctorName: doctor.name,
    createdBy: doctor.uid,
    date: now,
  });

  let prescriptionId = null;
  if (issuePrescription && medications.length) {
    prescriptionId = newId();
    batch.set(doc(db, 'prescriptions', prescriptionId), {
      patientId: p,
      patientName: appt.patientName,
      doctorId: doctor.uid,
      doctorName: doctor.name,
      doctorLicense: doctor.license || '',
      specialty: doctor.specialty || '',
      appointmentId: appt.id,
      diagnosis: encryptField(diagnosis, p),
      medications: encryptJSON(medications, p),
      instructions: encryptField(instructions || '', p),
      code: verificationCode(prescriptionId),
      createdAt: now,
      validUntil: now + 30 * 24 * 3600 * 1000,
    });
  }

  batch.update(doc(db, 'appointments', appt.id), {
    status: 'completada',
    updatedAt: now,
    prescriptionId,
  });
  await batch.commit();
  return { prescriptionId };
}
