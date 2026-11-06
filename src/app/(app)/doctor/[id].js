import { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getUserProfile } from '@/services/users';
import { ensureChat } from '@/services/chat';
import { useAuth } from '@/context/AuthContext';
import { Avatar, Badge, Button, Card, InfoRow, Loading, Screen, EmptyState, textStyles } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { WEEK_DAYS } from '@/lib/constants';
import { firebaseErrorMessage } from '@/lib/validators';

export default function DoctorDetailScreen() {
  const { id } = useLocalSearchParams();
  const { profile } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    getUserProfile(String(id))
      .then((d) => setDoctor(d?.role === 'medico' ? d : null))
      .catch(() => setDoctor(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading />;
  if (!doctor) return <EmptyState icon="alert-circle-outline" title="Médico no encontrado" />;

  const days = WEEK_DAYS.filter((d) => (doctor.availableDays || []).includes(d.id)).map((d) => d.long);

  const openChat = async () => {
    setOpening(true);
    try {
      const chatId = await ensureChat(profile, doctor);
      router.push(`/chat/${chatId}`);
    } catch (e) {
      Alert.alert('Error', firebaseErrorMessage(e));
    } finally {
      setOpening(false);
    }
  };

  const openDirections = () => {
    const dest = doctor.location
      ? `${doctor.location.latitude},${doctor.location.longitude}`
      : encodeURIComponent(`${doctor.address}, ${doctor.city}, El Salvador`);
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}`);
  };

  return (
    <Screen>
      <Card style={{ alignItems: 'center' }}>
        <Avatar name={doctor.name} size={84} />
        <Text style={[textStyles.title, { marginTop: spacing.md, textAlign: 'center' }]}>{doctor.name}</Text>
        <Text style={styles.specialty}>{doctor.specialty}</Text>
        <View style={styles.badges}>
          <Badge label={`JVPM ${doctor.license}`} icon="ribbon-outline" />
          {doctor.fee ? <Badge label={`$${Number(doctor.fee).toFixed(2)} por consulta`} color={colors.accent} bg={colors.accentSoft} icon="cash-outline" /> : null}
        </View>
        {!!doctor.bio && <Text style={[textStyles.body, { textAlign: 'center', marginTop: spacing.md }]}>{doctor.bio}</Text>}
      </Card>

      <Card>
        <InfoRow icon="business-outline" label="Clínica" value={doctor.clinic} />
        <InfoRow icon="location-outline" label="Dirección" value={`${doctor.address}, ${doctor.city}`} />
        <InfoRow icon="language-outline" label="Idiomas" value={(doctor.languages || []).join(', ')} />
        <InfoRow icon="calendar-outline" label="Días de atención" value={days.join(', ')} />
        <InfoRow icon="time-outline" label="Horario" value={`${doctor.startHour} a ${doctor.endHour}`} />
      </Card>

      <View style={{ gap: spacing.md }}>
        <Button title="Agendar cita virtual" icon="calendar" onPress={() => router.push(`/book/${doctor.uid}`)} />
        <Button title="Enviar mensaje" icon="chatbubbles-outline" variant="secondary" onPress={openChat} loading={opening} />
        <Button title="Cómo llegar" icon="navigate-outline" variant="outline" onPress={openDirections} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  specialty: { color: colors.primary, fontWeight: '700', fontSize: 16, marginTop: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md, justifyContent: 'center' },
});
