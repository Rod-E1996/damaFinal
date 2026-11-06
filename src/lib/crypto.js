import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * Cifrado de datos sensibles (AES-256-CBC + HMAC-SHA256).
 *
 * - Firestore: la llave se deriva del secreto de la app y de un "ámbito"
 *   (el uid del paciente o el id del chat). Así, cada paciente tiene su propia
 *   llave y el médico que lo atiende puede leer sus recetas desde otro dispositivo.
 * - SQLite: se usa una llave aleatoria propia del dispositivo, guardada en el
 *   almacén seguro del sistema (Android Keystore / iOS Keychain).
 *
 * Formato del texto cifrado: enc1:<iv base64>:<cifrado base64>:<hmac hex>
 */

const PREFIX = 'enc1';
const APP_SECRET = process.env.EXPO_PUBLIC_ENCRYPTION_SECRET || 'telesalud-dev-secret';
const DEVICE_KEY_NAME = 'telesalud_device_key_v1';

const keyCache = new Map();

function randomWordArray(bytes) {
  const raw = Crypto.getRandomBytes(bytes);
  let hex = '';
  for (let i = 0; i < raw.length; i += 1) hex += raw[i].toString(16).padStart(2, '0');
  return CryptoJS.enc.Hex.parse(hex);
}

function deriveKeys(material) {
  if (keyCache.has(material)) return keyCache.get(material);
  const keys = {
    enc: CryptoJS.SHA256(`enc|${material}`),
    mac: CryptoJS.SHA256(`mac|${material}`),
  };
  keyCache.set(material, keys);
  return keys;
}

function encryptWith(plain, keys) {
  if (plain === null || plain === undefined || plain === '') return '';
  const iv = randomWordArray(16);
  const encrypted = CryptoJS.AES.encrypt(String(plain), keys.enc, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const ivB64 = CryptoJS.enc.Base64.stringify(iv);
  const ctB64 = CryptoJS.enc.Base64.stringify(encrypted.ciphertext);
  const mac = CryptoJS.HmacSHA256(`${ivB64}:${ctB64}`, keys.mac).toString(CryptoJS.enc.Hex);
  return `${PREFIX}:${ivB64}:${ctB64}:${mac}`;
}

function decryptWith(payload, keys) {
  if (!payload || typeof payload !== 'string') return '';
  // Datos antiguos o no sensibles que no estén cifrados se devuelven tal cual.
  if (!payload.startsWith(`${PREFIX}:`)) return payload;
  const [, ivB64, ctB64, mac] = payload.split(':');
  const expected = CryptoJS.HmacSHA256(`${ivB64}:${ctB64}`, keys.mac).toString(CryptoJS.enc.Hex);
  if (expected !== mac) {
    // El dato fue alterado o la llave no corresponde.
    return '[dato protegido]';
  }
  try {
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(ctB64) },
      keys.enc,
      { iv: CryptoJS.enc.Base64.parse(ivB64), mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
    );
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch {
    return '[dato protegido]';
  }
}

// ---------- Firestore (llave por ámbito) ----------

export function encryptField(value, scope) {
  return encryptWith(value, deriveKeys(`${APP_SECRET}|${scope}`));
}

export function decryptField(value, scope) {
  return decryptWith(value, deriveKeys(`${APP_SECRET}|${scope}`));
}

export function encryptJSON(obj, scope) {
  return encryptField(JSON.stringify(obj ?? null), scope);
}

export function decryptJSON(value, scope, fallback = null) {
  try {
    const txt = decryptField(value, scope);
    return txt ? JSON.parse(txt) : fallback;
  } catch {
    return fallback;
  }
}

// ---------- SQLite (llave del dispositivo) ----------

let deviceKeys = null;

export async function initDeviceKey() {
  if (deviceKeys) return;
  let stored = await SecureStore.getItemAsync(DEVICE_KEY_NAME);
  if (!stored) {
    stored = randomWordArray(32).toString(CryptoJS.enc.Hex);
    await SecureStore.setItemAsync(DEVICE_KEY_NAME, stored);
  }
  deviceKeys = deriveKeys(`device|${stored}`);
}

function requireDeviceKeys() {
  if (!deviceKeys) throw new Error('La llave del dispositivo no está inicializada');
  return deviceKeys;
}

export function encryptLocal(value) {
  return encryptWith(value, requireDeviceKeys());
}

export function decryptLocal(value) {
  return decryptWith(value, requireDeviceKeys());
}

export function newId() {
  return Crypto.randomUUID();
}

// Código corto para verificar la autenticidad de una receta en farmacia.
export function verificationCode(seed) {
  return CryptoJS.SHA256(`${APP_SECRET}|rx|${seed}`).toString(CryptoJS.enc.Hex).slice(0, 8).toUpperCase();
}
