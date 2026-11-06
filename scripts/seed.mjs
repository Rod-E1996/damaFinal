/**
 * Carga datos de demostración: 5 médicos y algunas publicaciones del foro.
 * Uso:  npm run seed
 * Requiere que en Firebase estén activos Authentication (correo/contraseña) y Firestore.
 */
import { randomBytes } from 'node:crypto';
import CryptoJS from 'crypto-js';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc } from 'firebase/firestore';

const env = process.env;
const app = initializeApp({
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const db = getFirestore(app);
const SECRET = env.EXPO_PUBLIC_ENCRYPTION_SECRET;

// Mismo esquema de cifrado que src/lib/crypto.js
function encryptField(plain, scope) {
  if (!plain) return '';
  const material = `${SECRET}|${scope}`;
  const enc = CryptoJS.SHA256(`enc|${material}`);
  const mac = CryptoJS.SHA256(`mac|${material}`);
  const iv = CryptoJS.enc.Hex.parse(randomBytes(16).toString('hex'));
  const ct = CryptoJS.AES.encrypt(plain, enc, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }).ciphertext;
  const ivB64 = CryptoJS.enc.Base64.stringify(iv);
  const ctB64 = CryptoJS.enc.Base64.stringify(ct);
  const tag = CryptoJS.HmacSHA256(`${ivB64}:${ctB64}`, mac).toString(CryptoJS.enc.Hex);
  return `enc1:${ivB64}:${ctB64}:${tag}`;
}

const PASSWORD = 'Medico2026';

const DOCTORS = [
  { name: 'Dra. Ana Martínez', email: 'ana.martinez@telesalud.demo', specialty: 'Medicina general', license: '10234', clinic: 'Clínica Vida', city: 'San Salvador', address: 'Colonia Escalón, Paseo General Escalón #3500', location: { latitude: 13.7015, longitude: -89.2370 }, languages: ['Español', 'Inglés'], availableDays: [1, 2, 3, 4, 5], startHour: '08:00', endHour: '16:00', fee: 25, phone: '2263-1000', bio: 'Médica general con 12 años de experiencia en atención primaria y telemedicina.' },
  { name: 'Dr. Carlos Hernández', email: 'carlos.hernandez@telesalud.demo', specialty: 'Cardiología', license: '8456', clinic: 'Hospital de Diagnóstico', city: 'San Salvador', address: 'Colonia Médica, Diagonal Dr. Arturo Romero', location: { latitude: 13.7080, longitude: -89.2085 }, languages: ['Español'], availableDays: [1, 3, 5], startHour: '09:00', endHour: '15:00', fee: 45, phone: '2226-5000', bio: 'Cardiólogo especialista en hipertensión y prevención cardiovascular.' },
  { name: 'Dra. Sofía Ramírez', email: 'sofia.ramirez@telesalud.demo', specialty: 'Pediatría', license: '11872', clinic: 'Centro Pediátrico Santa Tecla', city: 'Santa Tecla', address: 'Paseo El Carmen, 2a Avenida Norte', location: { latitude: 13.6745, longitude: -89.2860 }, languages: ['Español', 'Inglés'], availableDays: [1, 2, 3, 4, 5, 6], startHour: '07:00', endHour: '13:00', fee: 30, phone: '2288-4400', bio: 'Pediatra dedicada al control de niño sano y enfermedades respiratorias.' },
  { name: 'Dr. Luis Portillo', email: 'luis.portillo@telesalud.demo', specialty: 'Psicología', license: '9321', clinic: 'Bienestar Integral', city: 'Antiguo Cuscatlán', address: 'Calle La Reforma, Plaza Merliot', location: { latitude: 13.6800, longitude: -89.2560 }, languages: ['Español', 'Francés'], availableDays: [2, 4, 6], startHour: '10:00', endHour: '18:00', fee: 35, phone: '2243-7788', bio: 'Psicólogo clínico, manejo de ansiedad, estrés y depresión.' },
  { name: 'Dra. Gabriela Flores', email: 'gabriela.flores@telesalud.demo', specialty: 'Endocrinología', license: '12045', clinic: 'Clínica Oriente', city: 'San Miguel', address: 'Avenida Roosevelt Sur #45', location: { latitude: 13.4790, longitude: -88.1780 }, languages: ['Español', 'Portugués'], availableDays: [1, 2, 4, 5], startHour: '08:00', endHour: '14:00', fee: 40, phone: '2661-2020', bio: 'Endocrinóloga enfocada en diabetes, tiroides y control metabólico.' },
];

const POSTS = [
  { doctor: 0, category: 'General', title: '¿Cuándo es necesario acudir a emergencias?', body: 'Dolor de pecho intenso, dificultad para respirar, desmayos o sangrado abundante requieren atención inmediata. Para todo lo demás, una consulta virtual puede orientarte. ¡Pregunten sus dudas!' },
  { doctor: 4, category: 'Enfermedades crónicas', title: 'Consejos para controlar la glucosa', body: 'Registra tu glucosa en la app al menos 3 veces por semana. Evita bebidas azucaradas, camina 30 minutos al día y no suspendas tu tratamiento sin indicación médica.' },
  { doctor: 3, category: 'Salud mental', title: 'Técnicas sencillas para manejar la ansiedad', body: 'La respiración 4-7-8 ayuda mucho: inhala 4 segundos, sostén 7 y exhala 8. Repite 4 veces. ¿Qué técnicas les han funcionado a ustedes?' },
];

async function upsertDoctor(d) {
  let cred;
  try {
    cred = await createUserWithEmailAndPassword(auth, d.email, PASSWORD);
    await updateProfile(cred.user, { displayName: d.name });
    console.log(`  + creado ${d.email}`);
  } catch (e) {
    if (e.code !== 'auth/email-already-in-use') throw e;
    cred = await signInWithEmailAndPassword(auth, d.email, PASSWORD);
    console.log(`  = ya existía ${d.email}`);
  }
  const uid = cred.user.uid;
  const ref = doc(db, 'users', uid);
  const now = Date.now();
  const { phone, ...rest } = d;
  const data = { ...rest, uid, role: 'medico', email: d.email, phone: encryptField(phone, uid), updatedAt: now };
  const existing = await getDoc(ref);
  if (existing.exists()) {
    const { role, email, ...update } = data;
    await setDoc(ref, update, { merge: true });
  } else {
    await setDoc(ref, { ...data, createdAt: now });
  }
  return { uid, name: d.name };
}

async function main() {
  if (!env.EXPO_PUBLIC_FIREBASE_API_KEY) throw new Error('No se encontró el archivo .env');
  console.log('Creando médicos de demostración...');
  const created = [];
  for (const d of DOCTORS) {
    created.push(await upsertDoctor(d));
    await signOut(auth);
  }
  console.log('Creando publicaciones del foro...');
  for (const p of POSTS) {
    const d = DOCTORS[p.doctor];
    const cred = await signInWithEmailAndPassword(auth, d.email, PASSWORD);
    await addDoc(collection(db, 'forumPosts'), {
      authorId: cred.user.uid,
      authorName: d.name,
      authorRole: 'medico',
      title: p.title,
      body: p.body,
      category: p.category,
      commentCount: 0,
      createdAt: Date.now(),
    });
    await signOut(auth);
  }
  console.log(`\nListo. Contraseña de todos los médicos: ${PASSWORD}`);
  created.forEach((c, i) => console.log(`  ${DOCTORS[i].email}  (${c.name})`));
  process.exit(0);
}

main().catch((e) => {
  console.error('\nError:', e.code || '', e.message);
  if (e.code === 'auth/operation-not-allowed' || e.code === 'auth/configuration-not-found') {
    console.error('Activa "Correo electrónico/contraseña" en Firebase > Authentication > Método de acceso.');
  }
  if (e.code === 'permission-denied') {
    console.error('Publica las reglas de firestore.rules en Firebase > Firestore > Reglas.');
  }
  process.exit(1);
});
