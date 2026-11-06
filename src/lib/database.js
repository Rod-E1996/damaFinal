import * as SQLite from 'expo-sqlite';
import { encryptLocal, decryptLocal, initDeviceKey } from './crypto';

/**
 * Base de datos local (SQLite).
 *
 * Seguridad:
 * - Todas las consultas usan parámetros (?) — nunca se concatena texto del
 *   usuario dentro del SQL, lo que evita la inyección SQL.
 * - Las columnas con datos personales o médicos (*_enc) se guardan cifradas
 *   con AES usando la llave del dispositivo.
 */

const DB_NAME = 'telesalud.db';
const DB_VERSION = 1;

let dbPromise = null;

async function migrate(db) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current >= DB_VERSION) return;

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS perfil (
      uid TEXT PRIMARY KEY NOT NULL,
      datos_enc TEXT NOT NULL,
      actualizado INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS mediciones (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      tipo TEXT NOT NULL,
      valor REAL NOT NULL,
      valor2 REAL,
      unidad TEXT NOT NULL,
      fecha INTEGER NOT NULL,
      nota_enc TEXT,
      sincronizado INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_mediciones_user ON mediciones (user_id, tipo, fecha);
    CREATE TABLE IF NOT EXISTS historial (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      tipo TEXT NOT NULL,
      titulo TEXT NOT NULL,
      descripcion_enc TEXT,
      medico TEXT,
      fecha INTEGER NOT NULL,
      sincronizado INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_historial_user ON historial (user_id, fecha);
    CREATE TABLE IF NOT EXISTS recetas (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      datos_enc TEXT NOT NULL,
      fecha INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS recordatorios (
      cita_id TEXT PRIMARY KEY NOT NULL,
      notificaciones TEXT NOT NULL,
      inicio INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS bitacora (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      accion TEXT NOT NULL,
      fecha INTEGER NOT NULL
    );
  `);
  await db.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
}

export function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      await initDeviceKey();
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await migrate(db);
      return db;
    })().catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

// ---------------- Perfil (caché sin conexión) ----------------

export async function saveProfileLocal(uid, profile) {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO perfil (uid, datos_enc, actualizado) VALUES (?, ?, ?)',
    uid,
    encryptLocal(JSON.stringify(profile)),
    Date.now()
  );
}

export async function getProfileLocal(uid) {
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT datos_enc FROM perfil WHERE uid = ?', uid);
  if (!row) return null;
  try {
    return JSON.parse(decryptLocal(row.datos_enc));
  } catch {
    return null;
  }
}

// ---------------- Mediciones ----------------

function mapMeasurement(r) {
  return {
    id: r.id,
    userId: r.user_id,
    type: r.tipo,
    value: r.valor,
    value2: r.valor2,
    unit: r.unidad,
    date: r.fecha,
    note: decryptLocal(r.nota_enc),
    synced: r.sincronizado === 1,
  };
}

export async function upsertMeasurementLocal(m, synced) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO mediciones
      (id, user_id, tipo, valor, valor2, unidad, fecha, nota_enc, sincronizado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    m.id,
    m.userId,
    m.type,
    m.value,
    m.value2 ?? null,
    m.unit,
    m.date,
    encryptLocal(m.note || ''),
    synced ? 1 : 0
  );
}

export async function listMeasurementsLocal(userId, type = null) {
  const db = await getDb();
  const rows = type
    ? await db.getAllAsync('SELECT * FROM mediciones WHERE user_id = ? AND tipo = ? ORDER BY fecha DESC', userId, type)
    : await db.getAllAsync('SELECT * FROM mediciones WHERE user_id = ? ORDER BY fecha DESC', userId);
  return rows.map(mapMeasurement);
}

export async function pendingMeasurements(userId) {
  const db = await getDb();
  const rows = await db.getAllAsync('SELECT * FROM mediciones WHERE user_id = ? AND sincronizado = 0', userId);
  return rows.map(mapMeasurement);
}

export async function markMeasurementSynced(id) {
  const db = await getDb();
  await db.runAsync('UPDATE mediciones SET sincronizado = 1 WHERE id = ?', id);
}

export async function deleteMeasurementLocal(id) {
  const db = await getDb();
  await db.runAsync('DELETE FROM mediciones WHERE id = ?', id);
}

// ---------------- Historial médico ----------------

function mapRecord(r) {
  return {
    id: r.id,
    userId: r.user_id,
    type: r.tipo,
    title: r.titulo,
    description: decryptLocal(r.descripcion_enc),
    doctorName: r.medico,
    date: r.fecha,
    synced: r.sincronizado === 1,
  };
}

export async function upsertRecordLocal(rec, synced) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO historial
      (id, user_id, tipo, titulo, descripcion_enc, medico, fecha, sincronizado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    rec.id,
    rec.userId,
    rec.type,
    rec.title,
    encryptLocal(rec.description || ''),
    rec.doctorName || null,
    rec.date,
    synced ? 1 : 0
  );
}

export async function listRecordsLocal(userId) {
  const db = await getDb();
  const rows = await db.getAllAsync('SELECT * FROM historial WHERE user_id = ? ORDER BY fecha DESC', userId);
  return rows.map(mapRecord);
}

export async function pendingRecords(userId) {
  const db = await getDb();
  const rows = await db.getAllAsync('SELECT * FROM historial WHERE user_id = ? AND sincronizado = 0', userId);
  return rows.map(mapRecord);
}

export async function markRecordSynced(id) {
  const db = await getDb();
  await db.runAsync('UPDATE historial SET sincronizado = 1 WHERE id = ?', id);
}

export async function deleteRecordLocal(id) {
  const db = await getDb();
  await db.runAsync('DELETE FROM historial WHERE id = ?', id);
}

// ---------------- Recetas (caché para verlas sin conexión) ----------------

export async function cachePrescriptions(userId, list) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM recetas WHERE user_id = ?', userId);
    for (const rx of list) {
      await db.runAsync(
        'INSERT OR REPLACE INTO recetas (id, user_id, datos_enc, fecha) VALUES (?, ?, ?, ?)',
        rx.id,
        userId,
        encryptLocal(JSON.stringify(rx)),
        rx.createdAt || Date.now()
      );
    }
  });
}

export async function listPrescriptionsLocal(userId) {
  const db = await getDb();
  const rows = await db.getAllAsync('SELECT datos_enc FROM recetas WHERE user_id = ? ORDER BY fecha DESC', userId);
  return rows
    .map((r) => {
      try {
        return JSON.parse(decryptLocal(r.datos_enc));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// ---------------- Recordatorios de citas ----------------

export async function getReminder(appointmentId) {
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT * FROM recordatorios WHERE cita_id = ?', appointmentId);
  return row ? { ids: JSON.parse(row.notificaciones), startsAt: row.inicio } : null;
}

export async function saveReminder(appointmentId, ids, startsAt) {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO recordatorios (cita_id, notificaciones, inicio) VALUES (?, ?, ?)',
    appointmentId,
    JSON.stringify(ids),
    startsAt
  );
}

export async function deleteReminder(appointmentId) {
  const db = await getDb();
  await db.runAsync('DELETE FROM recordatorios WHERE cita_id = ?', appointmentId);
}

// ---------------- Bitácora de seguridad ----------------

export async function logAction(userId, action) {
  try {
    const db = await getDb();
    await db.runAsync('INSERT INTO bitacora (user_id, accion, fecha) VALUES (?, ?, ?)', userId || null, action, Date.now());
  } catch {
    // La bitácora nunca debe interrumpir el flujo principal.
  }
}

export async function listActions(userId, limit = 20) {
  const db = await getDb();
  return db.getAllAsync('SELECT * FROM bitacora WHERE user_id = ? ORDER BY fecha DESC LIMIT ?', userId, limit);
}

/** Borra los datos locales del usuario al cerrar sesión. */
export async function clearUserData(userId) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM perfil WHERE uid = ?', userId);
    await db.runAsync('DELETE FROM mediciones WHERE user_id = ?', userId);
    await db.runAsync('DELETE FROM historial WHERE user_id = ?', userId);
    await db.runAsync('DELETE FROM recetas WHERE user_id = ?', userId);
    await db.runAsync('DELETE FROM recordatorios');
  });
}
