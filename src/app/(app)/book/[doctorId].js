import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getUserProfile } from '@/services/users';
import { bookAppointment, takenSlots } from '@/services/appointments';
import { scheduleAppointmentReminders } from '@/lib/notifications';
import { useAuth } from '@/context/AuthContext';
import { useNow } from '@/hooks/useNow';
import { useToast } from '@/context/ToastContext';
import { Avatar, Button, Card, ChipGroup, EmptyState, Input, Loading, Screen, textStyles } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import { APPOINTMENT_MODES } from '@/lib/constants';
import { buildSlots, fromDateKey, toDateKey, formatDate } from '@/lib/dates';
import { sanitize, validateRequired, firebaseErrorMessage } from '@/lib/validators';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function BookScreen() {
  const { doctorId } = useLocalSearchParams();
  const { profile } = useAuth();
  const toast = useToast();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [taken, setTaken] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [mode, setMode] = useState('video');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const now = useNow();

  useEffect(() => {
    getUserProfile(String(doctorId))
      .then(setDoctor)
      .finally(() => setLoading(false));
  }, [doctorId]);

  // Próximos 21 días en los que el médico atiende.
  const todayKey = toDateKey(now);
  const days = useMemo(() => {
    if (!doctor) return [];
    const out = [];
    const today = fromDateKey(todayKey);
    for (let i = 0; i < 21; i += 1) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      if ((doctor.availableDays || []).includes(d.getDay())) out.push(d);
    }
    return out;
  }, [doctor, todayKey]);

  // Al elegir un día se consultan los horarios ya reservados de ese médico.
  const selectDate = (key) => {
    setDate(key);
    setTime(null);
    setErrors((e) => ({ ...e, date: null }));
    setLoadingSlots(true);
    takenSlots(doctor.uid, key)
      .then(setTaken)
      .catch(() => setTaken([]))
      .finally(() => setLoadingSlots(false));
  };

  const slots = useMemo(() => {
    if (!doctor || !date) return [];
    return buildSlots(doctor.startHour, doctor.endHour).map((t) => ({
      time: t,
      disabled: taken.includes(t) || fromDateKey(date, t).getTime() < now + 30 * 60 * 1000,
    }));
  }, [doctor, date, taken, now]);

  if (loading) return <Loading />;
  if (!doctor) return <EmptyState icon="alert-circle-outline" title="Médico no encontrado" />;

  const submit = () => {
    const errs = {
      date: date ? null : 'Selecciona una fecha.',
      time: time ? null : 'Selecciona un horario disponible.',
      reason: validateRequired(reason, 'El motivo de consulta', { min: 10, max: 500 }),
    };
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    Alert.alert(
      'Confirmar cita',
      `${doctor.name}\n${formatDate(fromDateKey(date))} a las ${time}\nModalidad: ${APPOINTMENT_MODES.find((m) => m.id === mode)?.label}`,
      [
        { text: 'Revisar', style: 'cancel' },
        { text: 'Confirmar', onPress: save },
      ]
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      const appt = await bookAppointment({ patient: profile, doctor, date, time, mode, reason: sanitize(reason, 500) });
      scheduleAppointmentReminders(appt, doctor.name).catch(() => {});
      toast('Cita solicitada. El médico la confirmará pronto.');
      router.replace(`/appointment/${appt.id}`);
    } catch (e) {
      if (e?.code === 'permission-denied') {
        Alert.alert('Horario no disponible', 'Otro paciente acaba de reservar ese horario. Elige otro, por favor.');
        takenSlots(doctor.uid, date).then(setTaken).catch(() => {});
        setTime(null);
      } else {
        Alert.alert('No se pudo agendar', firebaseErrorMessage(e));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen keyboard>
      <Card>
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
          <Avatar name={doctor.name} />
          <View style={{ flex: 1 }}>
            <Text style={textStyles.subtitle}>{doctor.name}</Text>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{doctor.specialty}</Text>
          </View>
        </View>
      </Card>

      <Text style={styles.label}>1. Elige el día</Text>
      {days.length === 0 ? (
        <Text style={textStyles.muted}>Este médico no tiene días disponibles.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: 4 }}>
          {days.map((d) => {
            const key = toDateKey(d);
            const selected = key === date;
            return (
              <Pressable
                key={key}
                onPress={() => selectDate(key)}
                style={[styles.day, selected && styles.daySelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={formatDate(d)}
              >
                <Text style={[styles.dayName, selected && { color: colors.white }]}>{DAY_NAMES[d.getDay()]}</Text>
                <Text style={[styles.dayNum, selected && { color: colors.white }]}>{d.getDate()}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      {errors.date && <Text style={styles.error}>{errors.date}</Text>}

      <Text style={styles.label}>2. Elige la hora</Text>
      {!date ? (
        <Text style={textStyles.muted}>Primero selecciona un día.</Text>
      ) : loadingSlots ? (
        <Text style={textStyles.muted}>Consultando disponibilidad...</Text>
      ) : (
        <View style={styles.slots}>
          {slots.map((s) => {
            const selected = s.time === time;
            return (
              <Pressable
                key={s.time}
                disabled={s.disabled}
                onPress={() => {
                  setTime(s.time);
                  setErrors((e) => ({ ...e, time: null }));
                }}
                style={[styles.slot, selected && styles.slotSelected, s.disabled && styles.slotDisabled]}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: s.disabled }}
              >
                <Text style={[styles.slotText, selected && { color: colors.white }, s.disabled && { color: '#A0AEC0', textDecorationLine: 'line-through' }]}>
                  {s.time}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {errors.time && <Text style={styles.error}>{errors.time}</Text>}

      <Text style={styles.label}>3. Modalidad y motivo</Text>
      <ChipGroup options={APPOINTMENT_MODES} value={mode} onChange={(v) => v && setMode(v)} />
      <Input
        label="Motivo de la consulta"
        required
        multiline
        maxLength={500}
        value={reason}
        onChangeText={(t) => {
          setReason(t);
          if (errors.reason) setErrors((e) => ({ ...e, reason: null }));
        }}
        error={errors.reason}
        placeholder="Describe brevemente tus síntomas o el motivo de la consulta"
        hint="Esta información se guarda cifrada."
      />

      <Button title="Solicitar cita" icon="checkmark-circle-outline" onPress={submit} loading={saving} style={{ marginBottom: spacing.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  day: {
    width: 62,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  daySelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayName: { fontSize: 13, color: colors.muted },
  dayNum: { fontSize: 20, fontWeight: '800', color: colors.text },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    minWidth: 76,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  slotSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotDisabled: { backgroundColor: '#EEF2F6' },
  slotText: { fontWeight: '700', color: colors.text },
  error: { color: colors.danger, fontSize: 13, marginTop: 4 },
});
