import { useState } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { addMeasurement } from '@/services/health';
import { Button, ChipGroup, Input, Screen, Banner } from '@/components/ui';
import { MEASUREMENT_TYPES } from '@/lib/constants';
import { sanitize, validateNumber } from '@/lib/validators';
import { spacing } from '@/theme';

export default function AddMeasurementScreen() {
  const { profile } = useAuth();
  const toast = useToast();
  const [type, setType] = useState('presion');
  const [value, setValue] = useState('');
  const [value2, setValue2] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const cfg = MEASUREMENT_TYPES[type];

  const save = async () => {
    const errs = {
      value: validateNumber(value, cfg.dual ? 'La presión sistólica' : 'El valor', { min: cfg.min, max: cfg.max }),
      value2: cfg.dual ? validateNumber(value2, 'La presión diastólica', { min: 30, max: 160 }) : null,
    };
    if (cfg.dual && !errs.value && !errs.value2 && Number(value2) >= Number(value)) {
      errs.value2 = 'La diastólica debe ser menor que la sistólica.';
    }
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    setSaving(true);
    const { synced } = await addMeasurement(profile.uid, {
      type,
      value: Number(String(value).replace(',', '.')),
      value2: cfg.dual ? Number(String(value2).replace(',', '.')) : null,
      unit: cfg.unit,
      note: sanitize(note, 300),
    }).catch(() => ({ synced: false }));
    setSaving(false);
    toast(synced ? 'Medición guardada y sincronizada' : 'Medición guardada en el dispositivo (se sincronizará luego)', synced ? 'success' : 'warning');
    router.back();
  };

  return (
    <Screen keyboard>
      <ChipGroup
        label="Tipo de medición"
        options={Object.entries(MEASUREMENT_TYPES).map(([id, m]) => ({ id, label: m.label, icon: m.icon }))}
        value={type}
        onChange={(v) => {
          if (!v) return;
          setType(v);
          setErrors({});
        }}
      />
      <Input
        label={cfg.dual ? 'Sistólica (alta)' : `Valor (${cfg.unit})`}
        required
        keyboardType="decimal-pad"
        value={value}
        onChangeText={(t) => {
          setValue(t);
          setErrors((e) => ({ ...e, value: null }));
        }}
        error={errors.value}
        maxLength={6}
        hint={`Rango permitido: ${cfg.min} – ${cfg.max} ${cfg.unit}`}
      />
      {cfg.dual && (
        <Input
          label="Diastólica (baja)"
          required
          keyboardType="decimal-pad"
          value={value2}
          onChangeText={(t) => {
            setValue2(t);
            setErrors((e) => ({ ...e, value2: null }));
          }}
          error={errors.value2}
          maxLength={6}
        />
      )}
      <Input label="Nota (opcional)" multiline maxLength={300} value={note} onChangeText={setNote} placeholder="Ej. en ayunas, después de ejercicio..." />
      <Banner type="info" message="La medición se guarda primero en tu teléfono (SQLite cifrado) y luego se sincroniza con la nube." />
      <Button title="Guardar medición" icon="save-outline" onPress={save} loading={saving} style={{ marginBottom: spacing.xl }} />
    </Screen>
  );
}
