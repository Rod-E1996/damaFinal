import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Screen, Banner } from '@/components/ui';
import { colors, spacing, radius } from '@/theme';
import { loginUser } from '@/services/auth';
import { validateEmail, firebaseErrorMessage, collectErrors } from '@/lib/validators';
import { lockRemaining, registerFailure, resetAttempts } from '@/lib/security';
import { useToast } from '@/context/ToastContext';

export default function LoginScreen() {
  const toast = useToast();
  const passRef = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const onSubmit = async () => {
    const errs = collectErrors({
      email: validateEmail(email),
      password: password ? null : 'La contraseña es obligatoria.',
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const locked = await lockRemaining();
    if (locked > 0) {
      Alert.alert(
        'Cuenta bloqueada temporalmente',
        `Por seguridad, espera ${Math.ceil(locked / 60)} minuto(s) antes de volver a intentarlo.`
      );
      return;
    }

    setLoading(true);
    setNotice(null);
    try {
      await loginUser(email, password);
      await resetAttempts();
      toast('¡Bienvenido de nuevo!');
    } catch (e) {
      const code = e?.code || '';
      if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(code)) {
        const left = await registerFailure();
        setNotice(
          left > 0
            ? `${firebaseErrorMessage(e)} Te quedan ${left} intento(s).`
            : 'Demasiados intentos fallidos. Tu acceso se bloqueó por 5 minutos.'
        );
      } else {
        setNotice(firebaseErrorMessage(e));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen keyboard contentStyle={{ justifyContent: 'center' }}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <Ionicons name="medkit" size={40} color={colors.white} />
          </View>
          <Text style={styles.brand}>TeleSalud</Text>
          <Text style={styles.tagline}>Tu médico, donde estés</Text>
        </View>

        {notice && <Banner type="error" message={notice} />}

        <Input
          label="Correo electrónico"
          icon="mail-outline"
          placeholder="ejemplo@correo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            if (errors.email) setErrors((p) => ({ ...p, email: null }));
          }}
          error={errors.email}
          returnKeyType="next"
          onSubmitEditing={() => passRef.current?.focus()}
          maxLength={120}
        />
        <Input
          ref={passRef}
          label="Contraseña"
          icon="lock-closed-outline"
          placeholder="Tu contraseña"
          secure
          autoCapitalize="none"
          autoComplete="password"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            if (errors.password) setErrors((p) => ({ ...p, password: null }));
          }}
          error={errors.password}
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          maxLength={64}
        />

        <Link href="/forgot-password" style={styles.forgot}>
          ¿Olvidaste tu contraseña?
        </Link>

        <Button title="Iniciar sesión" icon="log-in-outline" onPress={onSubmit} loading={loading} />

        <View style={styles.footer}>
          <Text style={styles.muted}>¿No tienes cuenta?</Text>
          <Link href="/register" style={styles.link}>
            Regístrate
          </Link>
        </View>

        <View style={styles.secure}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.muted} />
          <Text style={styles.small}>Tus datos médicos se protegen con cifrado AES-256.</Text>
        </View>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: spacing.xl },
  logo: {
    width: 80,
    height: 80,
    borderRadius: radius.lg + 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  brand: { fontSize: 30, fontWeight: '800', color: colors.text },
  tagline: { fontSize: 15, color: colors.muted, marginTop: 4 },
  forgot: { color: colors.primary, fontWeight: '600', alignSelf: 'flex-end', marginBottom: spacing.lg, padding: 4 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.xl },
  muted: { color: colors.muted, fontSize: 15 },
  link: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.xl },
  small: { color: colors.muted, fontSize: 12 },
});
