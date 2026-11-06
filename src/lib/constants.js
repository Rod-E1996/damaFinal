export const ROLES = { PATIENT: 'paciente', DOCTOR: 'medico' };

export const SPECIALTIES = [
  'Medicina general',
  'Pediatría',
  'Cardiología',
  'Dermatología',
  'Ginecología',
  'Psicología',
  'Nutrición',
  'Endocrinología',
  'Neumología',
  'Oftalmología',
];

export const LANGUAGES = ['Español', 'Inglés', 'Francés', 'Portugués'];

export const CITIES = [
  'San Salvador',
  'Santa Tecla',
  'Antiguo Cuscatlán',
  'Soyapango',
  'Santa Ana',
  'San Miguel',
  'Sonsonate',
  'La Libertad',
];

export const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

export const GENDERS = ['Femenino', 'Masculino', 'Otro'];

// 0 = domingo ... 6 = sábado (igual que Date.getDay()).
export const WEEK_DAYS = [
  { id: 1, short: 'Lun', long: 'Lunes' },
  { id: 2, short: 'Mar', long: 'Martes' },
  { id: 3, short: 'Mié', long: 'Miércoles' },
  { id: 4, short: 'Jue', long: 'Jueves' },
  { id: 5, short: 'Vie', long: 'Viernes' },
  { id: 6, short: 'Sáb', long: 'Sábado' },
  { id: 0, short: 'Dom', long: 'Domingo' },
];

export const HOURS = Array.from({ length: 15 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`);

export const APPOINTMENT_STATUS = {
  pendiente: { label: 'Pendiente', color: '#B26A00', bg: '#FFF4E0', icon: 'time-outline' },
  confirmada: { label: 'Confirmada', color: '#1565C0', bg: '#E3EEFB', icon: 'checkmark-circle-outline' },
  completada: { label: 'Completada', color: '#2E7D32', bg: '#E8F5E9', icon: 'medal-outline' },
  cancelada: { label: 'Cancelada', color: '#D32F2F', bg: '#FDECEC', icon: 'close-circle-outline' },
};

export const APPOINTMENT_MODES = [
  { id: 'video', label: 'Videollamada', icon: 'videocam-outline' },
  { id: 'chat', label: 'Chat', icon: 'chatbubbles-outline' },
];

export const MEASUREMENT_TYPES = {
  presion: { label: 'Presión arterial', unit: 'mmHg', icon: 'heart-outline', dual: true, min: 40, max: 250 },
  glucosa: { label: 'Glucosa', unit: 'mg/dL', icon: 'water-outline', min: 20, max: 600 },
  peso: { label: 'Peso', unit: 'kg', icon: 'barbell-outline', min: 1, max: 350 },
  frecuencia: { label: 'Frecuencia cardiaca', unit: 'lpm', icon: 'pulse-outline', min: 20, max: 250 },
  temperatura: { label: 'Temperatura', unit: '°C', icon: 'thermometer-outline', min: 30, max: 45 },
};

export const RECORD_TYPES = {
  consulta: { label: 'Consulta', icon: 'medkit-outline' },
  prueba: { label: 'Resultado de prueba', icon: 'flask-outline' },
  vacuna: { label: 'Vacuna', icon: 'bandage-outline' },
  nota: { label: 'Nota personal', icon: 'document-text-outline' },
};

export const FORUM_CATEGORIES = ['General', 'Nutrición', 'Salud mental', 'Enfermedades crónicas', 'Maternidad', 'Ejercicio'];

export const HEALTH_TIPS = [
  'Bebe al menos 8 vasos de agua al día para mantenerte hidratado.',
  'Camina 30 minutos diarios: mejora tu salud cardiovascular.',
  'Dormir de 7 a 8 horas fortalece tu sistema inmunológico.',
  'Lava tus manos con frecuencia para prevenir infecciones.',
  'Reduce el consumo de sal para cuidar tu presión arterial.',
  'Incluye frutas y verduras de colores en cada comida.',
  'Toma tus medicamentos a la misma hora todos los días.',
];
