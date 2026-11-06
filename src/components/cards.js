import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Badge, Card } from './ui';
import { colors, spacing } from '@/theme';
import { APPOINTMENT_STATUS, APPOINTMENT_MODES, WEEK_DAYS } from '@/lib/constants';
import { formatDateShort } from '@/lib/dates';

export function StatusBadge({ status }) {
  const s = APPOINTMENT_STATUS[status] || APPOINTMENT_STATUS.pendiente;
  return <Badge label={s.label} color={s.color} bg={s.bg} icon={s.icon} />;
}

export function DoctorCard({ doctor, onPress }) {
  const days = WEEK_DAYS.filter((d) => (doctor.availableDays || []).includes(d.id))
    .map((d) => d.short)
    .join(' · ');
  return (
    <Card onPress={onPress} accessibilityLabel={`Doctor ${doctor.name}, ${doctor.specialty}`}>
      <View style={styles.row}>
        <Avatar name={doctor.name} size={54} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{doctor.name}</Text>
          <Text style={styles.specialty}>{doctor.specialty}</Text>
          <View style={styles.meta}>
            <Ionicons name="location-outline" size={14} color={colors.muted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {doctor.city}
              {doctor.clinic ? ` · ${doctor.clinic}` : ''}
            </Text>
          </View>
          <View style={styles.meta}>
            <Ionicons name="language-outline" size={14} color={colors.muted} />
            <Text style={styles.metaText}>{(doctor.languages || []).join(', ')}</Text>
          </View>
          {!!days && (
            <View style={styles.meta}>
              <Ionicons name="calendar-outline" size={14} color={colors.muted} />
              <Text style={styles.metaText}>
                {days} · {doctor.startHour}-{doctor.endHour}
              </Text>
            </View>
          )}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          {doctor.fee ? <Text style={styles.fee}>${Number(doctor.fee).toFixed(2)}</Text> : null}
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </View>
      </View>
    </Card>
  );
}

export function AppointmentCard({ appt, isDoctor, onPress }) {
  const mode = APPOINTMENT_MODES.find((m) => m.id === appt.mode);
  return (
    <Card onPress={onPress} accessibilityLabel={`Cita ${formatDateShort(appt.startsAt)} a las ${appt.time}`}>
      <View style={styles.row}>
        <View style={styles.dateBox}>
          <Text style={styles.dateDay}>{new Date(appt.startsAt).getDate()}</Text>
          <Text style={styles.dateMonth}>{formatDateShort(appt.startsAt).split(' ')[2]}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.name}>{isDoctor ? appt.patientName : appt.doctorName}</Text>
          <Text style={styles.specialty}>{isDoctor ? 'Paciente' : appt.specialty}</Text>
          <View style={styles.meta}>
            <Ionicons name="time-outline" size={14} color={colors.muted} />
            <Text style={styles.metaText}>
              {formatDateShort(appt.startsAt)} · {appt.time}
            </Text>
          </View>
          {mode && (
            <View style={styles.meta}>
              <Ionicons name={mode.icon} size={14} color={colors.muted} />
              <Text style={styles.metaText}>{mode.label}</Text>
            </View>
          )}
        </View>
        <StatusBadge status={appt.status} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  specialty: { fontSize: 14, color: colors.primary, fontWeight: '600', marginBottom: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { fontSize: 13, color: colors.muted, flexShrink: 1 },
  fee: { fontSize: 15, fontWeight: '700', color: colors.accent },
  dateBox: {
    width: 54,
    height: 58,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDay: { fontSize: 20, fontWeight: '800', color: colors.primary },
  dateMonth: { fontSize: 12, color: colors.primary, textTransform: 'uppercase' },
});
