import * as SecureStore from 'expo-secure-store';

/**
 * Bloqueo temporal tras varios intentos fallidos de inicio de sesión
 * (protección contra ataques de fuerza bruta). Se guarda en el almacén seguro.
 */
const KEY = 'telesalud_login_attempts';
const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;

async function read() {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? JSON.parse(raw) : { count: 0, lockedUntil: 0 };
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

async function write(state) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(state));
}

/** Devuelve los segundos restantes de bloqueo (0 si no está bloqueado). */
export async function lockRemaining() {
  const s = await read();
  const remaining = s.lockedUntil - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/** Registra un fallo y devuelve cuántos intentos quedan. */
export async function registerFailure() {
  const s = await read();
  const count = (s.lockedUntil && s.lockedUntil < Date.now() ? 0 : s.count) + 1;
  if (count >= MAX_ATTEMPTS) {
    await write({ count: 0, lockedUntil: Date.now() + LOCK_MS });
    return 0;
  }
  await write({ count, lockedUntil: 0 });
  return MAX_ATTEMPTS - count;
}

export async function resetAttempts() {
  await write({ count: 0, lockedUntil: 0 });
}
