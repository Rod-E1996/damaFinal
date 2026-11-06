import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useAppointments } from '@/hooks/useAppointments';
import { useHealthData } from '@/hooks/useHealthData';
import { useNow } from '@/hooks/useNow';
import { Card, EmptyState, Screen, SectionHeader, Banner, textStyles } from '@/components/ui';
import { AppointmentCard } from '@/components/cards';
import LineChart from '@/components/LineChart';
import { colors, radius, spacing, MAX_CONTENT_WIDTH } from '@/theme';
import { HEALTH_TIPS, MEASUREMENT_TYPES } from '@/lib/constants';
import { isSameDay } from '@/lib/dates';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function QuickActions({ actions }) {
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH) - spacing.lg * 2;
  const columns = contentWidth > 520 ? 4 : 3;
  const itemWidth = (contentWidth - spacing.md * (columns - 1)) / columns;
  return (
    <View style={styles.grid}>
      {actions.map((a) => (
        <Pressable
          key={a.label}
          onPress={a.onPress}
          style={({ pressed }) => [styles.action, { width: itemWidth }, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel={a.label}
        >
          <View style={[styles.actionIcon, { backgroundColor: a.color + '1A' }]}>
            <Ionicons name={a.icon} size={26} color={a.color} />
          </View>
          <Text style={styles.actionText} numberOfLines={2}>
            {a.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function Header({ name, subtitle }) {
  return (
    <View style={styles.hero}>
      <View style={{ flex: 1 }}>
        <Text style={styles.heroGreeting}>{greeting()},</Text>
        <Text style={styles.heroName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.heroSub}>{subtitle}</Text>
      </View>
      <Ionicons name="medkit" size={44} color="#FFFFFF55" />
    </View>
  );
}

function PatientHome({ profile }) {
  const { appointments, error } = useAppointments();
  const { measurements } = useHealthData(profile.uid);
  const now = useNow();
  const next = appointments.find((a) => a.startsAt > now && ['pendiente', 'confirmada'].includes(a.status));
  const tip = HEALTH_TIPS[new Date(now).getDate() % HEALTH_TIPS.length];

  const chartType = useMemo(() => {
    const types = Object.keys(MEASUREMENT_TYPES);
    return types.find((t) => measurements.some((m) => m.type === t)) || null;
  }, [measurements]);

  const series = useMemo(() => {
    if (!chartType) return [];
    const data = measurements.filter((m) => m.type === chartType).slice(0, 10);
    const s = [{ label: MEASUREMENT_TYPES[chartType].label, color: colors.primary, values: data.map((m) => ({ x: m.date, y: m.value })) }];
    if (MEASUREMENT_TYPES[chartType].dual) {
      s[0].label = 'Sistólica';
      s.push({ label: 'Diastólica', color: colors.accent, values: data.filter((m) => m.value2).map((m) => ({ x: m.date, y: m.value2 })) });
    }
    return s;
  }, [measurements, chartType]);

  const actions = [
    { label: 'Buscar médico', icon: 'search', color: colors.primary, onPress: () => router.push('/doctors') },
    { label: 'Mis recetas', icon: 'document-text', color: colors.accent, onPress: () => router.push('/prescriptions') },
    { label: 'Historial', icon: 'folder-open', color: '#7B4DCC', onPress: () => router.push('/history') },
    { label: 'Registrar medición', icon: 'pulse', color: colors.danger, onPress: () => router.push('/add-measurement') },
    { label: 'Mapa de médicos', icon: 'map', color: '#E07B00', onPress: () => router.push('/doctors-map') },
    { label: 'Foro de salud', icon: 'people', color: '#0097A7', onPress: () => router.push('/forum') },
  ];

  return (
    <>
      <Header name={profile.name} subtitle="¿Cómo te sientes hoy?" />
      {error && <Banner type="error" message={error} />}

      <SectionHeader title="Próxima cita" action="Ver todas" onAction={() => router.push('/appointments')} />
      {next ? (
        <AppointmentCard appt={next} onPress={() => router.push(`/appointment/${next.id}`)} />
      ) : (
        <Card>
          <EmptyState
            icon="calendar-outline"
            title="No tienes citas próximas"
            message="Busca un especialista y agenda una consulta virtual."
          />
        </Card>
      )}

      <SectionHeader title="Accesos rápidos" />
      <QuickActions actions={actions} />

      <SectionHeader title="Mi evolución" action="Ver historial" onAction={() => router.push('/history')} />
      <Card>
        {chartType ? (
          <>
            <Text style={[textStyles.subtitle, { marginBottom: spacing.sm }]}>{MEASUREMENT_TYPES[chartType].label}</Text>
            <LineChart series={series} unit={MEASUREMENT_TYPES[chartType].unit} height={180} />
          </>
        ) : (
          <EmptyState icon="stats-chart-outline" title="Sin mediciones aún" message="Registra tu presión, glucosa o peso para ver tu evolución." />
        )}
      </Card>

      <Card style={{ backgroundColor: colors.accentSoft }}>
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
          <Ionicons name="bulb-outline" size={28} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[textStyles.subtitle, { color: colors.accent }]}>Consejo del día</Text>
            <Text style={textStyles.body}>{tip}</Text>
          </View>
        </View>
      </Card>
    </>
  );
}

function DoctorHome({ profile }) {
  const { appointments, error } = useAppointments();
  const now = useNow();
  const today = appointments.filter((a) => isSameDay(a.startsAt, now) && a.status !== 'cancelada');
  const pending = appointments.filter((a) => a.status === 'pendiente' && a.startsAt > now);
  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const completed = appointments.filter((a) => a.status === 'completada' && a.startsAt >= monthStart.getTime());
  const patients = new Set(appointments.map((a) => a.patientId)).size;

  const stats = [
    { label: 'Citas hoy', value: today.length, icon: 'today', color: colors.primary },
    { label: 'Por confirmar', value: pending.length, icon: 'hourglass', color: colors.warning },
    { label: 'Atendidas (mes)', value: completed.length, icon: 'checkmark-done', color: colors.success },
    { label: 'Pacientes', value: patients, icon: 'people', color: '#7B4DCC' },
  ];

  return (
    <>
      <Header name={profile.name} subtitle={`${profile.specialty} · ${profile.clinic || ''}`} />
      {error && <Banner type="error" message={error} />}
      <View style={styles.stats}>
        {stats.map((s) => (
          <View key={s.label} style={styles.stat} accessibilityLabel={`${s.label}: ${s.value}`}>
            <Ionicons name={s.icon} size={22} color={s.color} />
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {pending.length > 0 && (
        <>
          <SectionHeader title="Solicitudes por confirmar" action="Ver agenda" onAction={() => router.push('/appointments')} />
          {pending.slice(0, 3).map((a) => (
            <AppointmentCard key={a.id} appt={a} isDoctor onPress={() => router.push(`/appointment/${a.id}`)} />
          ))}
        </>
      )}

      <SectionHeader title="Agenda de hoy" />
      {today.length ? (
        today.map((a) => <AppointmentCard key={a.id} appt={a} isDoctor onPress={() => router.push(`/appointment/${a.id}`)} />)
      ) : (
        <Card>
          <EmptyState icon="cafe-outline" title="Sin citas para hoy" message="Las nuevas solicitudes aparecerán aquí." />
        </Card>
      )}

      <SectionHeader title="Accesos rápidos" />
      <QuickActions
        actions={[
          { label: 'Recetas emitidas', icon: 'document-text', color: colors.accent, onPress: () => router.push('/prescriptions') },
          { label: 'Mensajes', icon: 'chatbubbles', color: colors.primary, onPress: () => router.push('/chats') },
          { label: 'Foro de salud', icon: 'people', color: '#0097A7', onPress: () => router.push('/forum') },
        ]}
      />
    </>
  );
}

export default function HomeScreen() {
  const { profile, isDoctor } = useAuth();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen>{isDoctor ? <DoctorHome profile={profile} /> : <PatientHome profile={profile} />}</Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  heroGreeting: { color: '#DCE8F8', fontSize: 15 },
  heroName: { color: colors.white, fontSize: 24, fontWeight: '800', marginVertical: 2 },
  heroSub: { color: '#DCE8F8', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.sm },
  action: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 110,
  },
  actionIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'center' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.sm },
  stat: {
    flexGrow: 1,
    flexBasis: '40%',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 4,
  },
  statValue: { fontSize: 26, fontWeight: '800' },
  statLabel: { fontSize: 13, color: colors.muted },
});
