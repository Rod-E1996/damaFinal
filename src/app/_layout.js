import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { getDb } from '@/lib/database';
import { Button, Loading } from '@/components/ui';
import { colors, spacing } from '@/theme';

function RootNavigator() {
  const { user, profile, initializing, profileError, refreshProfile, logout } = useAuth();
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState(null);

  useEffect(() => {
    getDb()
      .then(() => setDbReady(true))
      .catch((e) => setDbError(e));
  }, []);

  if (dbError) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>No se pudo abrir la base de datos local</Text>
        <Text style={styles.msg}>{String(dbError?.message || dbError)}</Text>
      </View>
    );
  }

  if (!dbReady || initializing) return <Loading message="Preparando TeleSalud..." />;

  // Sesión iniciada pero el perfil no se pudo cargar (sin conexión o cuenta incompleta).
  if (user && !profile && profileError) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>No pudimos cargar tu perfil</Text>
        <Text style={styles.msg}>Revisa tu conexión a internet e inténtalo de nuevo.</Text>
        <Button title="Reintentar" icon="refresh" onPress={refreshProfile} style={{ alignSelf: 'stretch' }} />
        <Button title="Cerrar sesión" variant="ghost" onPress={logout} />
      </View>
    );
  }

  const signedIn = !!user && !!profile;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ToastProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md, backgroundColor: colors.bg },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  msg: { fontSize: 15, color: colors.muted, textAlign: 'center' },
});
