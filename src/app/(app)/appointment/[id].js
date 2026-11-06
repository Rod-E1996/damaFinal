import { useEffect, useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { subscribeAppointment, changeStatus } from '@/services/appointments';
import { ensureChat } from '@/services/chat';
import { getPushTokenOf } from '@/services/users';
import { sendPush, cancelAppointmentReminders } from '@/lib/notifications';
import { useAuth } from '@/context/AuthContext';
import { useNow } from '@/hooks/useNow';
import { useToast } from '@/context/ToastContext';
import { Avatar, Banner, Button, Card, EmptyState, InfoRow, Loading, Screen, textStyles } from '@/components/ui';
import { StatusBadge } from '@/components/cards';
import { colors, spacing } from '@/theme';
import { APPOINTMENT_MODES, APPOINTMENT_STATUS } from '@/lib/constants';
import { formatDate, formatDateTime } from '@/lib/dates';
import { firebaseErrorMessage } from '@/lib/validators';

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams();
  const { profile, isDoctor } = useAuth();
  const toast = useToast();
  const [appt, setAppt] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const now = useNow(30000);

  useEffect(() => subscribeAppointment(String(id), setAppt, () => setAppt(null)), [id]);

  if (appt === undefined) return <Loading />;
  if (!appt) return <EmptyState icon="alert-circle-outline" title="Cita no encontrada" />;

  const mode = APPOINTMENT_MODES.find((m) => m.id === appt.mode);
  const otherName = isDoctor ? appt.patientName : appt.doctorName;
  const otherId = isDoctor ? appt.patientId : appt.doctorId;
  const isFuture = appt.startsAt > now;
  const canJoin = appt.status === 'confirmada' && appt.startsAt - now < 15 * 60 * 1000;

  const update = (status, title, message) => {
    Alert.alert(title, message, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, continuar',
        style: status === 'cancelada' ? 'destructive' : 'default',
        onPress: async () => {
          setBusy(true);
          try {
            await changeStatus(appt, status);
            if (status === 'cancelada') await cancelAppointmentReminders(appt.id);
            const label = APPOINTMENT_STATUS[status].label.toLowerCase();
            toast(`Cita ${label}`);
            getPushTokenOf(otherId).then((t) =>
              sendPush(t, `Cita ${label}`, `${profile.name} marcó la cita del ${formatDate(appt.startsAt)} como ${label}.`, { url: `/appointment/${appt.id}` })
            );
          } catch (e) {
            Alert.alert('Error', firebaseErrorMessage(e));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const openChat = async () => {
    try {
      const patient = isDoctor ? { uid: appt.patientId, name: appt.patientName } : profile;
      const doctor = isDoctor ? profile : { uid: appt.doctorId, name: appt.doctorName, specialty: appt.specialty };
      const chatId = await ensureChat(patient, doctor);
      router.push(`/chat/${chatId}`);
    } catch (e) {
      Alert.alert('Error', firebaseErrorMessage(e));
    }
  };

  const joinVideo = () => {
    // Videoconsulta con Jitsi Meet (servicio externo gratuito). La sala es única por cita.
    Linking.openURL(`https://meet.jit.si/TeleSalud-${appt.id.replace(/-/g, '').slice(0, 20)}`);
  };

  return (
    <Screen>
      <Card style={{ alignItems: 'center', gap: spacing.sm }}>
        <Avatar name={otherName} size={72} />
        <Text style={textStyles.title}>{otherName}</Text>
        <Text style={{ color: colors.primary, fontWeight: '600' }}>{isDoctor ? 'Paciente' : appt.specialty}</Text>
        <StatusBadge status={appt.status} />
      </Card>

      {appt.status === 'pendiente' && !isDoctor && <Banner type="info" message="Tu solicitud está pendiente de confirmación por el médico." />}
      {appt.status === 'confirmada' && !canJoin && isFuture && (
        <Banner type="success" message="Cita confirmada. Podrás unirte a la videoconsulta 15 minutos antes de la hora." />
      )}

      <Card>
        <InfoRow icon="calendar-outline" label="Fecha y hora" value={formatDateTime(appt.startsAt)} />
        <InfoRow icon={mode?.icon || 'videocam-outline'} label="Modalidad" value={mode?.label} />
        <InfoRow icon="document-text-outline" label="Motivo de consulta" value={appt.reason} />
        <InfoRow icon="time-outline" label="Solicitada" value={formatDateTime(appt.createdAt)} />
      </Card>

      <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
        {canJoin && appt.mode === 'video' && <Button title="Unirse a la videoconsulta" icon="videocam" variant="success" onPress={joinVideo} />}
        <Button title={`Enviar mensaje a ${isDoctor ? 'paciente' : 'médico'}`} icon="chatbubbles-outline" variant="secondary" onPress={openChat} />

        {isDoctor && appt.status === 'pendiente' && (
          <Button title="Confirmar cita" icon="checkmark-circle-outline" loading={busy} onPress={() => update('confirmada', 'Confirmar cita', `¿Confirmas la cita con ${appt.patientName}?`)} />
        )}
        {isDoctor && appt.status === 'confirmada' && (
          <Button title="Atender y registrar consulta" icon="medkit-outline" onPress={() => router.push(`/consult/${appt.id}`)} />
        )}
        {isDoctor && (
          <Button title="Ver ficha del paciente" icon="person-outline" variant="outline" onPress={() => router.push(`/patient/${appt.patientId}`)} />
        )}
        {appt.status === 'completada' && appt.prescriptionId && (
          <Button title="Ver receta" icon="document-text-outline" variant="outline" onPress={() => router.push(`/prescriptions/${appt.prescriptionId}`)} />
        )}
        {['pendiente', 'confirmada'].includes(appt.status) && isFuture && (
          <Button
            title={isDoctor && appt.status === 'pendiente' ? 'Rechazar solicitud' : 'Cancelar cita'}
            icon="close-circle-outline"
            variant="danger"
            loading={busy}
            onPress={() => update('cancelada', 'Cancelar cita', '¿Seguro que deseas cancelar esta cita? Esta acción no se puede deshacer.')}
          />
        )}
      </View>
    </Screen>
  );
}
