import { useState } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { addRecord } from '@/services/health';
import { Button, ChipGroup, Input, Screen } from '@/components/ui';
import { RECORD_TYPES } from '@/lib/constants';
import { sanitize, validateRequired } from '@/lib/validators';
import { spacing } from '@/theme';

// El paciente puede agregar resultados de pruebas, vacunas o notas. Las consultas las registra el médico.
const TYPES = Object.entries(RECORD_TYPES)
  .filter(([id]) => id !== 'consulta')
  .map(([id, r]) => ({ id, label: r.label, icon: r.icon }));

export default function AddRecordScreen() {
  const { profile } = useAuth();
  const toast = useToast();
  const [type, setType] = useState('prueba');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const errs = {
      title: validateRequired(title, 'El título', { min: 3, max: 80 }),
      description: validateRequired(description, 'La descripción', { min: 3, max: 1000 }),
    };
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    setSaving(true);
    const { synced } = await addRecord(profile.uid, {
      type,
      title: sanitize(title, 80),
      description: sanitize(description, 1000),
    }).catch(() => ({ synced: false }));
    setSaving(false);
    toast(synced ? 'Registro guardado' : 'Guardado en el dispositivo (se sincronizará luego)', synced ? 'success' : 'warning');
    router.back();
  };

  return (
    <Screen keyboard>
      <ChipGroup label="Tipo" options={TYPES} value={type} onChange={(v) => v && setType(v)} />
      <Input
        label="Título"
        required
        value={title}
        onChangeText={(t) => {
          setTitle(t);
          setErrors((e) => ({ ...e, title: null }));
        }}
        error={errors.title}
        maxLength={80}
        placeholder="Ej. Hemograma completo"
      />
      <Input
        label="Descripción o resultado"
        required
        multiline
        maxLength={1000}
        value={description}
        onChangeText={(t) => {
          setDescription(t);
          setErrors((e) => ({ ...e, description: null }));
        }}
        error={errors.description}
        placeholder="Ej. Hemoglobina 13.5 g/dL, leucocitos normales..."
        hint="Se guarda cifrado en el dispositivo y en la nube."
      />
      <Button title="Guardar" icon="save-outline" onPress={save} loading={saving} style={{ marginBottom: spacing.xl }} />
    </Screen>
  );
}
