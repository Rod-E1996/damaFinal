import { View } from 'react-native';
import { Stack } from 'expo-router';
import AppServices from '@/components/AppServices';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme';

export const unstable_settings = { anchor: '(tabs)' };

export default function AppLayout() {
  const { isDoctor } = useAuth();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack
        screenOptions={{
          headerTintColor: colors.primary,
          headerStyle: { backgroundColor: colors.white },
          headerTitleStyle: { color: colors.text, fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
          headerBackTitle: 'Atrás',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="doctor/[id]" options={{ title: 'Perfil del médico' }} />
        <Stack.Screen name="book/[doctorId]" options={{ title: 'Agendar cita' }} />
        <Stack.Screen name="doctors-map" options={{ title: 'Médicos cercanos' }} />
        <Stack.Screen name="appointment/[id]" options={{ title: 'Detalle de la cita' }} />
        <Stack.Screen name="consult/[id]" options={{ title: 'Registrar consulta' }} />
        <Stack.Screen name="chat/[id]" options={{ title: 'Chat' }} />
        <Stack.Screen name="prescriptions/index" options={{ title: isDoctor ? 'Recetas emitidas' : 'Mis recetas' }} />
        <Stack.Screen name="prescriptions/[id]" options={{ title: 'Receta electrónica' }} />
        <Stack.Screen name="history" options={{ title: 'Historial médico' }} />
        <Stack.Screen name="add-measurement" options={{ title: 'Nueva medición', presentation: 'modal' }} />
        <Stack.Screen name="add-record" options={{ title: 'Nuevo registro', presentation: 'modal' }} />
        <Stack.Screen name="patient/[id]" options={{ title: 'Ficha del paciente' }} />
        <Stack.Screen name="post/[id]" options={{ title: 'Publicación' }} />
        <Stack.Screen name="post-new" options={{ title: 'Nueva publicación', presentation: 'modal' }} />
        <Stack.Screen name="edit-profile" options={{ title: 'Editar perfil' }} />
        <Stack.Screen name="security" options={{ title: 'Privacidad y seguridad' }} />
      </Stack>
      <AppServices />
    </View>
  );
}
