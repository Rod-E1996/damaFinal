import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, ChipGroup, Input, Screen, Banner, textStyles } from '@/components/ui';
import DateField from '@/components/DateField';
import { colors, spacing, radius } from '@/theme';
import { registerUser } from '@/services/auth';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  sanitize,
  validateEmail,
  validatePassword,
  validateName,
  validatePhone,
  validateBirthDate,
  validateLicense,
  validateRequired,
  validateNumber,
  passwordStrength,
  formatPhone,
  collectErrors,
  firebaseErrorMessage,
} from '@/lib/validators';
import { CITIES, GENDERS, LANGUAGES, ROLES, SPECIALTIES, WEEK_DAYS, HOURS } from '@/lib/constants';

const STRENGTH_COLORS = [colors.danger, colors.warning, colors.success];

export default function RegisterScreen() {
  const { refreshProfile, setRegistering } = useAuth();
  const toast = useToast();
  const [role, setRole] = useState(ROLES.PATIENT);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
    birthDate: null,
    gender: null,
    specialty: null,
    license: '',
    clinic: '',
    city: null,
    address: '',
    languages: ['Español'],
    availableDays: [1, 2, 3, 4, 5],
    startHour: '08:00',
    endHour: '17:00',
    fee: '',
  });
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: null }));
  };

  const isDoctor = role === ROLES.DOCTOR;
  const strength = passwordStrength(form.password);

  const validate = () => {
    const base = {
      name: validateName(form.name),
      email: validateEmail(form.email),
      phone: validatePhone(form.phone),
      password: validatePassword(form.password),
      confirm: form.confirm !== form.password ? 'Las contraseñas no coinciden.' : null,
      terms: accepted ? null : 'Debes aceptar el aviso de privacidad.',
    };
    const extra = isDoctor
      ? {
          specialty: form.specialty ? null : 'Selecciona una especialidad.',
          license: validateLicense(form.license),
          clinic: validateRequired(form.clinic, 'La clínica', { min: 3, max: 80 }),
          city: form.city ? null : 'Selecciona una ciudad.',
          address: validateRequired(form.address, 'La dirección', { min: 5, max: 150 }),
          languages: form.languages.length ? null : 'Selecciona al menos un idioma.',
          availableDays: form.availableDays.length ? null : 'Selecciona al menos un día.',
          endHour: form.endHour > form.startHour ? null : 'La hora final debe ser mayor a la inicial.',
          fee: validateNumber(form.fee, 'La tarifa', { min: 0, max: 500 }),
        }
      : {
          birthDate: validateBirthDate(form.birthDate),
          gender: form.gender ? null : 'Selecciona una opción.',
        };
    return collectErrors({ ...base, ...extra });
  };

  const onSubmit = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) {
      setNotice('Revisa los campos marcados en rojo.');
      return;
    }
    setNotice(null);
    setLoading(true);
    setRegistering(true);

    const profile = {
      role,
      name: sanitize(form.name, 80),
      phone: formatPhone(form.phone),
      ...(isDoctor
        ? {
            specialty: form.specialty,
            license: form.license.trim(),
            clinic: sanitize(form.clinic, 80),
            city: form.city,
            address: sanitize(form.address, 150),
            languages: form.languages,
            availableDays: form.availableDays,
            startHour: form.startHour,
            endHour: form.endHour,
            fee: Number(String(form.fee).replace(',', '.')),
            bio: '',
            location: null,
          }
        : {
            birthDate: form.birthDate,
            gender: form.gender,
            bloodType: '',
            allergies: '',
            conditions: '',
            emergencyContact: '',
          }),
    };

    try {
      await registerUser({ email: form.email, password: form.password, profile });
      await refreshProfile();
      toast('Cuenta creada con éxito');
      Alert.alert(
        '¡Registro exitoso!',
        'Te enviamos un correo para verificar tu cuenta. Ya puedes usar TeleSalud.'
      );
    } catch (e) {
      setNotice(firebaseErrorMessage(e));
      Alert.alert('No se pudo crear la cuenta', firebaseErrorMessage(e));
    } finally {
      setRegistering(false);
      setLoading(false);
    }
  };

  return (
    <Screen keyboard>
      <Text style={[textStyles.muted, { marginBottom: spacing.md }]}>¿Cómo usarás TeleSalud?</Text>
      <View style={styles.roles}>
        {[
          { id: ROLES.PATIENT, label: 'Soy paciente', icon: 'person-outline' },
          { id: ROLES.DOCTOR, label: 'Soy médico', icon: 'medkit-outline' },
        ].map((r) => (
          <Pressable
            key={r.id}
            onPress={() => setRole(r.id)}
            style={[styles.role, role === r.id && styles.roleActive]}
            accessibilityRole="radio"
            accessibilityState={{ checked: role === r.id }}
          >
            <Ionicons name={r.icon} size={28} color={role === r.id ? colors.white : colors.primary} />
            <Text style={[styles.roleText, role === r.id && { color: colors.white }]}>{r.label}</Text>
          </Pressable>
        ))}
      </View>

      {notice && <Banner type="error" message={notice} />}

      <Card>
        <Text style={[textStyles.subtitle, styles.section]}>Datos personales</Text>
        <Input label="Nombre completo" required icon="person-outline" value={form.name} onChangeText={set('name')} error={errors.name} placeholder="Ej. Ana María López" maxLength={80} autoCapitalize="words" />
        <Input label="Correo electrónico" required icon="mail-outline" value={form.email} onChangeText={set('email')} error={errors.email} keyboardType="email-address" autoCapitalize="none" placeholder="ejemplo@correo.com" maxLength={120} />
        <Input
          label="Teléfono"
          required
          icon="call-outline"
          value={form.phone}
          onChangeText={(t) => set('phone')(formatPhone(t))}
          error={errors.phone}
          keyboardType="phone-pad"
          placeholder="7123-4567"
          maxLength={9}
        />
        {!isDoctor && (
          <>
            <DateField label="Fecha de nacimiento" required value={form.birthDate} onChange={set('birthDate')} error={errors.birthDate} maximumDate={new Date()} />
            <ChipGroup label="Sexo" options={GENDERS} value={form.gender} onChange={set('gender')} error={errors.gender} />
          </>
        )}
      </Card>

      {isDoctor && (
        <Card>
          <Text style={[textStyles.subtitle, styles.section]}>Información profesional</Text>
          <ChipGroup label="Especialidad *" options={SPECIALTIES} value={form.specialty} onChange={set('specialty')} error={errors.specialty} />
          <Input label="Número de JVPM" required icon="ribbon-outline" value={form.license} onChangeText={(t) => set('license')(t.replace(/\D/g, ''))} error={errors.license} keyboardType="number-pad" maxLength={6} placeholder="Ej. 12345" />
          <Input label="Clínica u hospital" required icon="business-outline" value={form.clinic} onChangeText={set('clinic')} error={errors.clinic} maxLength={80} />
          <ChipGroup label="Ciudad *" options={CITIES} value={form.city} onChange={set('city')} error={errors.city} />
          <Input label="Dirección del consultorio" required icon="location-outline" value={form.address} onChangeText={set('address')} error={errors.address} maxLength={150} />
          <ChipGroup label="Idiomas *" options={LANGUAGES} value={form.languages} onChange={set('languages')} multiple error={errors.languages} />
          <ChipGroup
            label="Días de atención *"
            options={WEEK_DAYS.map((d) => ({ id: d.id, label: d.short }))}
            value={form.availableDays}
            onChange={set('availableDays')}
            multiple
            error={errors.availableDays}
          />
          <ChipGroup label="Hora de inicio" options={HOURS} value={form.startHour} onChange={(v) => v && set('startHour')(v)} scroll />
          <ChipGroup label="Hora de fin" options={HOURS} value={form.endHour} onChange={(v) => v && set('endHour')(v)} scroll error={errors.endHour} />
          <Input label="Tarifa por consulta (USD)" required icon="cash-outline" value={form.fee} onChangeText={set('fee')} error={errors.fee} keyboardType="decimal-pad" maxLength={6} placeholder="25.00" />
        </Card>
      )}

      <Card>
        <Text style={[textStyles.subtitle, styles.section]}>Seguridad</Text>
        <Input
          label="Contraseña"
          required
          icon="lock-closed-outline"
          secure
          value={form.password}
          onChangeText={set('password')}
          error={errors.password}
          autoCapitalize="none"
          maxLength={64}
          hint="Mínimo 8 caracteres, con mayúscula, minúscula y número."
        />
        {!!form.password && (
          <View style={styles.strength} accessibilityLabel={`Seguridad de la contraseña: ${strength.label}`}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.bar, { backgroundColor: i <= strength.level ? STRENGTH_COLORS[strength.level] : colors.border }]} />
            ))}
            <Text style={[styles.strengthText, { color: STRENGTH_COLORS[strength.level] }]}>{strength.label}</Text>
          </View>
        )}
        <Input label="Confirmar contraseña" required icon="lock-closed-outline" secure value={form.confirm} onChangeText={set('confirm')} error={errors.confirm} autoCapitalize="none" maxLength={64} />
      </Card>

      <Pressable
        onPress={() => {
          setAccepted((a) => !a);
          setErrors((e) => ({ ...e, terms: null }));
        }}
        style={styles.terms}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
      >
        <Ionicons name={accepted ? 'checkbox' : 'square-outline'} size={24} color={errors.terms ? colors.danger : colors.primary} />
        <Text style={[textStyles.muted, { flex: 1 }]}>
          Acepto el aviso de privacidad y autorizo el tratamiento de mis datos personales y de salud, que se almacenan cifrados y solo se comparten con los médicos que me atienden.
        </Text>
      </Pressable>
      {errors.terms && <Text style={styles.error}>{errors.terms}</Text>}

      <Button title="Crear cuenta" icon="person-add-outline" onPress={onSubmit} loading={loading} style={{ marginTop: spacing.md, marginBottom: spacing.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  roles: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  role: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  roleActive: { backgroundColor: colors.primary },
  roleText: { fontWeight: '700', color: colors.primary, fontSize: 15 },
  section: { marginBottom: spacing.md },
  strength: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -6, marginBottom: spacing.md },
  bar: { flex: 1, height: 6, borderRadius: 3 },
  strengthText: { fontSize: 13, fontWeight: '700', width: 72, textAlign: 'right' },
  terms: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', paddingVertical: spacing.sm },
  error: { color: colors.danger, fontSize: 13, marginLeft: 32 },
});
