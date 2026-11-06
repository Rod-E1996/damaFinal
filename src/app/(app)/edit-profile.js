import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { updateUserProfile } from '@/services/users';
import { saveProfileLocal } from '@/lib/database';
import { Banner, Button, Card, ChipGroup, Input, Screen, textStyles } from '@/components/ui';
import DateField from '@/components/DateField';
import { spacing } from '@/theme';
import { BLOOD_TYPES, CITIES, GENDERS, HOURS, LANGUAGES, WEEK_DAYS } from '@/lib/constants';
import {
  sanitize,
  validateName,
  validatePhone,
  validateBirthDate,
  validateRequired,
  validateNumber,
  formatPhone,
  collectErrors,
  firebaseErrorMessage,
} from '@/lib/validators';

export default function EditProfileScreen() {
  const { profile, isDoctor, setProfile } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ ...profile, fee: profile.fee !== undefined ? String(profile.fee) : '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: null }));
  };

  // Ubicación del consultorio: GPS actual o geocodificación de la dirección escrita.
  const locate = async (useGps) => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Activa el permiso de ubicación para usar esta función.');
        return;
      }
      let coords;
      if (useGps) {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } else {
        const results = await Location.geocodeAsync(`${form.address}, ${form.city}, El Salvador`);
        if (!results.length) {
          Alert.alert('Sin resultados', 'No encontramos esa dirección. Prueba con tu ubicación actual.');
          return;
        }
        coords = { latitude: results[0].latitude, longitude: results[0].longitude };
      }
      set('location')(coords);
      toast('Ubicación del consultorio actualizada', 'info');
    } catch (e) {
      Alert.alert('Error de ubicación', e?.message || 'No se pudo obtener la ubicación.');
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    const errs = collectErrors({
      name: validateName(form.name),
      phone: validatePhone(form.phone),
      ...(isDoctor
        ? {
            clinic: validateRequired(form.clinic, 'La clínica', { min: 3, max: 80 }),
            address: validateRequired(form.address, 'La dirección', { min: 5, max: 150 }),
            city: form.city ? null : 'Selecciona una ciudad.',
            languages: form.languages?.length ? null : 'Selecciona al menos un idioma.',
            availableDays: form.availableDays?.length ? null : 'Selecciona al menos un día.',
            endHour: form.endHour > form.startHour ? null : 'La hora final debe ser mayor a la inicial.',
            fee: validateNumber(form.fee, 'La tarifa', { min: 0, max: 500 }),
            bio: (form.bio || '').length > 400 ? 'Máximo 400 caracteres.' : null,
          }
        : {
            birthDate: validateBirthDate(form.birthDate),
            emergencyContact: (form.emergencyContact || '').length > 120 ? 'Máximo 120 caracteres.' : null,
          }),
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const data = {
      name: sanitize(form.name, 80),
      phone: formatPhone(form.phone),
      ...(isDoctor
        ? {
            clinic: sanitize(form.clinic, 80),
            address: sanitize(form.address, 150),
            city: form.city,
            languages: form.languages,
            availableDays: form.availableDays,
            startHour: form.startHour,
            endHour: form.endHour,
            fee: Number(String(form.fee).replace(',', '.')),
            bio: sanitize(form.bio, 400),
            location: form.location || null,
          }
        : {
            birthDate: form.birthDate,
            gender: form.gender || '',
            bloodType: form.bloodType || '',
            allergies: sanitize(form.allergies, 300),
            conditions: sanitize(form.conditions, 300),
            emergencyContact: sanitize(form.emergencyContact, 120),
          }),
    };

    setSaving(true);
    try {
      await updateUserProfile(profile.uid, data);
      const updated = { ...profile, ...data };
      setProfile(updated);
      saveProfileLocal(profile.uid, updated).catch(() => {});
      toast('Perfil actualizado');
      router.back();
    } catch (e) {
      Alert.alert('No se pudo guardar', firebaseErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen keyboard>
      <Card>
        <Input label="Nombre completo" required value={form.name} onChangeText={set('name')} error={errors.name} maxLength={80} />
        <Input label="Teléfono" required value={form.phone} onChangeText={(t) => set('phone')(formatPhone(t))} error={errors.phone} keyboardType="phone-pad" maxLength={9} />
      </Card>

      {isDoctor ? (
        <>
          <Card>
            <Input label="Clínica u hospital" required value={form.clinic} onChangeText={set('clinic')} error={errors.clinic} maxLength={80} />
            <ChipGroup label="Ciudad" options={CITIES} value={form.city} onChange={set('city')} error={errors.city} scroll />
            <Input label="Dirección" required value={form.address} onChangeText={set('address')} error={errors.address} maxLength={150} />
            <Text style={[textStyles.small, { marginBottom: spacing.sm }]}>
              Ubicación en el mapa: {form.location ? `${form.location.latitude.toFixed(4)}, ${form.location.longitude.toFixed(4)}` : 'sin configurar'}
            </Text>
            <Button title="Usar mi ubicación actual" icon="locate-outline" variant="secondary" small loading={locating} onPress={() => locate(true)} style={{ marginBottom: spacing.sm }} />
            <Button title="Ubicar por dirección" icon="search-outline" variant="outline" small loading={locating} onPress={() => locate(false)} />
          </Card>
          <Card>
            <ChipGroup label="Idiomas" options={LANGUAGES} value={form.languages} onChange={set('languages')} multiple error={errors.languages} />
            <ChipGroup label="Días de atención" options={WEEK_DAYS.map((d) => ({ id: d.id, label: d.short }))} value={form.availableDays} onChange={set('availableDays')} multiple error={errors.availableDays} />
            <ChipGroup label="Hora de inicio" options={HOURS} value={form.startHour} onChange={(v) => v && set('startHour')(v)} scroll />
            <ChipGroup label="Hora de fin" options={HOURS} value={form.endHour} onChange={(v) => v && set('endHour')(v)} scroll error={errors.endHour} />
            <Input label="Tarifa por consulta (USD)" value={form.fee} onChangeText={set('fee')} error={errors.fee} keyboardType="decimal-pad" maxLength={6} />
            <Input label="Presentación" multiline maxLength={400} value={form.bio} onChangeText={set('bio')} error={errors.bio} placeholder="Tu experiencia, enfoque de atención..." />
          </Card>
        </>
      ) : (
        <Card>
          <Banner type="info" message="Tus datos médicos se guardan cifrados y solo los ven los médicos que te atienden." />
          <DateField label="Fecha de nacimiento" value={form.birthDate} onChange={set('birthDate')} error={errors.birthDate} maximumDate={new Date()} />
          <ChipGroup label="Sexo" options={GENDERS} value={form.gender} onChange={set('gender')} />
          <ChipGroup label="Tipo de sangre" options={BLOOD_TYPES} value={form.bloodType} onChange={set('bloodType')} />
          <Input label="Alergias" multiline maxLength={300} value={form.allergies} onChangeText={set('allergies')} placeholder="Ej. Penicilina, mariscos" />
          <Input label="Padecimientos crónicos" multiline maxLength={300} value={form.conditions} onChangeText={set('conditions')} placeholder="Ej. Hipertensión, diabetes tipo 2" />
          <Input label="Contacto de emergencia" value={form.emergencyContact} onChangeText={set('emergencyContact')} error={errors.emergencyContact} maxLength={120} placeholder="Nombre y teléfono" />
        </Card>
      )}

      <Button title="Guardar cambios" icon="save-outline" onPress={save} loading={saving} style={{ marginBottom: spacing.xl }} />
    </Screen>
  );
}
