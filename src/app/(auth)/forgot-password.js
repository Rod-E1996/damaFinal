import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { router } from 'expo-router';
import { Button, Input, Screen, textStyles } from '@/components/ui';
import { resetPassword } from '@/services/auth';
import { validateEmail, firebaseErrorMessage } from '@/lib/validators';
import { spacing } from '@/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const err = validateEmail(email);
    setError(err);
    if (err) return;
    setLoading(true);
    try {
      await resetPassword(email);
    } catch (e) {
      // Por seguridad no revelamos si el correo existe o no, salvo errores de red.
      if (e?.code === 'auth/network-request-failed') {
        setLoading(false);
        Alert.alert('Error', firebaseErrorMessage(e));
        return;
      }
    }
    setLoading(false);
    Alert.alert(
      'Revisa tu correo',
      'Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.',
      [{ text: 'Entendido', onPress: () => router.back() }]
    );
  };

  return (
    <Screen keyboard>
      <Text style={[textStyles.body, { marginBottom: spacing.lg }]}>
        Ingresa el correo con el que te registraste y te enviaremos un enlace para crear una nueva contraseña.
      </Text>
      <Input
        label="Correo electrónico"
        icon="mail-outline"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          setError(null);
        }}
        error={error}
        placeholder="ejemplo@correo.com"
        maxLength={120}
      />
      <Button title="Enviar enlace" icon="send-outline" onPress={onSubmit} loading={loading} />
    </Screen>
  );
}
