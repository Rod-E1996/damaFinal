// Validaciones y saneamiento de entradas del usuario.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_RE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/;

/** Quita caracteres de control y etiquetas HTML, recorta espacios y limita la longitud. */
export function sanitize(value, max = 500) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, max);
}

/** Escapa texto antes de insertarlo en HTML (por ejemplo, en el PDF de la receta). */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function validateEmail(email) {
  const v = (email || '').trim();
  if (!v) return 'El correo es obligatorio.';
  if (v.length > 120) return 'El correo es demasiado largo.';
  if (!EMAIL_RE.test(v)) return 'Ingresa un correo válido (ejemplo@correo.com).';
  return null;
}

export function passwordStrength(pw = '') {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  if (score <= 2) return { score, label: 'Débil', level: 0 };
  if (score <= 4) return { score, label: 'Aceptable', level: 1 };
  return { score, label: 'Fuerte', level: 2 };
}

export function validatePassword(pw) {
  if (!pw) return 'La contraseña es obligatoria.';
  if (pw.length < 8) return 'Debe tener al menos 8 caracteres.';
  if (pw.length > 64) return 'Máximo 64 caracteres.';
  if (!/[A-Z]/.test(pw)) return 'Incluye al menos una letra mayúscula.';
  if (!/[a-z]/.test(pw)) return 'Incluye al menos una letra minúscula.';
  if (!/\d/.test(pw)) return 'Incluye al menos un número.';
  return null;
}

export function validateName(name) {
  const v = (name || '').trim();
  if (!v) return 'El nombre es obligatorio.';
  if (v.length < 3) return 'El nombre es demasiado corto.';
  if (v.length > 80) return 'Máximo 80 caracteres.';
  if (!NAME_RE.test(v)) return 'Usa solo letras y espacios.';
  return null;
}

/** Teléfono de El Salvador: 8 dígitos que inician con 2, 6 o 7. */
export function validatePhone(phone, required = true) {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return required ? 'El teléfono es obligatorio.' : null;
  if (!/^[267]\d{7}$/.test(digits)) return 'Ingresa un teléfono válido de 8 dígitos (ej. 7123-4567).';
  return null;
}

export function formatPhone(phone) {
  const d = (phone || '').replace(/\D/g, '').slice(0, 8);
  return d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d;
}

export function validateRequired(value, label, { min = 1, max = 500 } = {}) {
  const v = (value || '').trim();
  if (!v) return `${label} es obligatorio.`;
  if (v.length < min) return `${label} debe tener al menos ${min} caracteres.`;
  if (v.length > max) return `${label} admite máximo ${max} caracteres.`;
  return null;
}

/** Número de Junta de Vigilancia de la Profesión Médica (JVPM). */
export function validateLicense(value) {
  const v = (value || '').trim();
  if (!v) return 'El número de JVPM es obligatorio.';
  if (!/^\d{3,6}$/.test(v)) return 'El JVPM debe tener de 3 a 6 dígitos.';
  return null;
}

export function validateNumber(value, label, { min, max, required = true } = {}) {
  const raw = String(value ?? '').replace(',', '.').trim();
  if (!raw) return required ? `${label} es obligatorio.` : null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return `${label} debe ser un número.`;
  if (min !== undefined && n < min) return `${label} debe ser mayor o igual a ${min}.`;
  if (max !== undefined && n > max) return `${label} debe ser menor o igual a ${max}.`;
  return null;
}

export function validateBirthDate(date) {
  if (!date) return 'La fecha de nacimiento es obligatoria.';
  const d = new Date(date);
  const now = new Date();
  if (Number.isNaN(d.getTime())) return 'Fecha inválida.';
  if (d > now) return 'La fecha no puede ser futura.';
  const age = (now - d) / (365.25 * 24 * 3600 * 1000);
  if (age > 120) return 'Revisa la fecha de nacimiento.';
  return null;
}

/** Ejecuta un mapa de validadores y devuelve { campo: mensaje } solo con los errores. */
export function collectErrors(rules) {
  const errors = {};
  Object.entries(rules).forEach(([field, msg]) => {
    if (msg) errors[field] = msg;
  });
  return errors;
}

/** Traduce los códigos de error de Firebase a mensajes comprensibles. */
export function firebaseErrorMessage(error) {
  const code = error?.code || '';
  const map = {
    'auth/invalid-email': 'El correo no es válido.',
    'auth/user-disabled': 'Esta cuenta fue deshabilitada.',
    'auth/user-not-found': 'Correo o contraseña incorrectos.',
    'auth/wrong-password': 'Correo o contraseña incorrectos.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/email-already-in-use': 'Ya existe una cuenta con este correo.',
    'auth/weak-password': 'La contraseña es demasiado débil.',
    'auth/too-many-requests': 'Demasiados intentos. Intenta de nuevo más tarde.',
    'auth/network-request-failed': 'Sin conexión a internet. Revisa tu red.',
    'auth/operation-not-allowed': 'El inicio de sesión con correo no está habilitado en Firebase.',
    'permission-denied': 'No tienes permiso para realizar esta acción.',
    unavailable: 'El servicio no está disponible. Revisa tu conexión.',
  };
  return map[code] || error?.message || 'Ocurrió un error inesperado.';
}
