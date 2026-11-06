import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { resendVerification } from '@/services/auth';
import { notifyNow } from '@/lib/notifications';
import { Avatar, Banner, Button, Card, InfoRow, Screen, textStyles } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { ageFrom } from '@/lib/dates';
import { WEEK_DAYS } from '@/lib/constants';

function MenuItem({ icon, label, onPress, color = colors.text }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={22} color={color === colors.text ? colors.primary : color} />
      <Text style={[styles.itemText, { color }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { profile, user, isDoctor, logout } = useAuth();
  const toast = useToast();

  const confirmLogout = () =>
    Alert.alert('Cerrar sesión', '¿Deseas cerrar tu sesión? Los datos guardados en este dispositivo se eliminarán.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => logout().catch(() => {}) },
    ]);

  const age = ageFrom(profile.birthDate);
  const days = WEEK_DAYS.filter((d) => (profile.availableDays || []).includes(d.id)).map((d) => d.short).join(', ');

  return (
    <Screen>
      <Card style={{ alignItems: 'center', gap: spacing.xs }}>
        <Avatar name={profile.name} size={80} />
        <Text style={textStyles.title}>{profile.name}</Text>
        <Text style={textStyles.muted}>{profile.email}</Text>
        <View style={styles.role}>
          <Ionicons name={isDoctor ? 'medkit' : 'person'} size={14} color={colors.primary} />
          <Text style={styles.roleText}>{isDoctor ? `Médico · ${profile.specialty}` : 'Paciente'}</Text>
        </View>
      </Card>

      {user && !user.emailVerified && (
        <Card style={{ backgroundColor: colors.warningSoft }}>
          <Banner type="warning" message="Tu correo aún no está verificado." />
          <Button
            title="Reenviar correo de verificación"
            variant="outline"
            small
            onPress={() =>
              resendVerification()
                .then(() => toast('Correo de verificación enviado', 'info'))
                .catch(() => toast('Espera unos minutos antes de reintentar', 'error'))
            }
          />
        </Card>
      )}

      <Card>
        <Text style={[textStyles.subtitle, { marginBottom: spacing.sm }]}>{isDoctor ? 'Información profesional' : 'Información médica'}</Text>
        {isDoctor ? (
          <>
            <InfoRow icon="ribbon-outline" label="JVPM" value={profile.license} />
            <InfoRow icon="business-outline" label="Clínica" value={`${profile.clinic} · ${profile.city}`} />
            <InfoRow icon="calendar-outline" label="Atención" value={`${days} · ${profile.startHour}-${profile.endHour}`} />
            <InfoRow icon="map-outline" label="Ubicación en mapa" value={profile.location ? 'Configurada' : 'Sin configurar (usa Editar perfil)'} />
          </>
        ) : (
          <>
            <InfoRow icon="calendar-outline" label="Edad" value={age !== null ? `${age} años` : ''} />
            <InfoRow icon="water-outline" label="Tipo de sangre" value={profile.bloodType} />
            <InfoRow icon="alert-circle-outline" label="Alergias" value={profile.allergies} />
            <InfoRow icon="fitness-outline" label="Padecimientos" value={profile.conditions} />
          </>
        )}
        <InfoRow icon="call-outline" label="Teléfono" value={profile.phone} />
      </Card>

      <Card style={{ paddingVertical: spacing.sm }}>
        <MenuItem icon="create-outline" label="Editar perfil" onPress={() => router.push('/edit-profile')} />
        {!isDoctor && <MenuItem icon="folder-open-outline" label="Historial médico" onPress={() => router.push('/history')} />}
        <MenuItem icon="document-text-outline" label={isDoctor ? 'Recetas emitidas' : 'Mis recetas'} onPress={() => router.push('/prescriptions')} />
        {!isDoctor && <MenuItem icon="people-outline" label="Foro de salud" onPress={() => router.push('/forum')} />}
        <MenuItem icon="shield-checkmark-outline" label="Privacidad y seguridad" onPress={() => router.push('/security')} />
        <MenuItem
          icon="notifications-outline"
          label="Probar notificaciones"
          onPress={() => notifyNow('TeleSalud', 'Las notificaciones están funcionando correctamente.').then(() => toast('Notificación enviada', 'info'))}
        />
      </Card>

      <Button title="Cerrar sesión" icon="log-out-outline" variant="danger" onPress={confirmLogout} style={{ marginBottom: spacing.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  role: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, marginTop: 4 },
  roleText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, minHeight: 48 },
  itemText: { flex: 1, fontSize: 15, fontWeight: '500' },
});
