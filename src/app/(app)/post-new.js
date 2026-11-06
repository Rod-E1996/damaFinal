import { useState } from 'react';
import { Alert, Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { createPost } from '@/services/forum';
import { Button, ChipGroup, Input, Screen, textStyles } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { FORUM_CATEGORIES } from '@/lib/constants';
import { sanitize, validateRequired, firebaseErrorMessage } from '@/lib/validators';

export default function NewPostScreen() {
  const { profile, isDoctor } = useAuth();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState(null);
  const [anonymous, setAnonymous] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const errs = {
      title: validateRequired(title, 'El título', { min: 5, max: 100 }),
      body: validateRequired(body, 'El contenido', { min: 10, max: 2000 }),
      category: category ? null : 'Selecciona una categoría.',
    };
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    setSaving(true);
    try {
      await createPost(profile, { title: sanitize(title, 100), body: sanitize(body, 2000), category, anonymous });
      toast('Publicación creada');
      router.back();
    } catch (e) {
      Alert.alert('Error', firebaseErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen keyboard>
      <Input label="Título" required value={title} onChangeText={(t) => { setTitle(t); setErrors((e) => ({ ...e, title: null })); }} error={errors.title} maxLength={100} placeholder="¿Sobre qué quieres hablar?" />
      <ChipGroup label="Categoría *" options={FORUM_CATEGORIES} value={category} onChange={(v) => { setCategory(v); setErrors((e) => ({ ...e, category: null })); }} error={errors.category} />
      <Input label="Contenido" required multiline maxLength={2000} value={body} onChangeText={(t) => { setBody(t); setErrors((e) => ({ ...e, body: null })); }} error={errors.body} placeholder="Comparte tu experiencia o pregunta..." />
      {!isDoctor && (
        <Pressable onPress={() => setAnonymous((a) => !a)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg }} accessibilityRole="checkbox" accessibilityState={{ checked: anonymous }}>
          <Ionicons name={anonymous ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} />
          <Text style={textStyles.body}>Publicar de forma anónima</Text>
        </Pressable>
      )}
      <Text style={[textStyles.small, { marginBottom: spacing.md }]}>No compartas datos personales como teléfonos, direcciones o números de documento.</Text>
      <Button title="Publicar" icon="send-outline" onPress={save} loading={saving} style={{ marginBottom: spacing.xl }} />
    </Screen>
  );
}
