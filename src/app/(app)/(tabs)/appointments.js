import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useAppointments } from '@/hooks/useAppointments';
import { useNow } from '@/hooks/useNow';
import { AppointmentCard } from '@/components/cards';
import { Banner, Button, ChipGroup, EmptyState, Loading, SearchBar } from '@/components/ui';
import { colors, spacing, MAX_CONTENT_WIDTH } from '@/theme';
import { APPOINTMENT_STATUS } from '@/lib/constants';

const PERIODS = [
  { id: 'upcoming', label: 'Próximas' },
  { id: 'past', label: 'Pasadas' },
  { id: 'all', label: 'Todas' },
];

export default function AppointmentsScreen() {
  const { isDoctor } = useAuth();
  const { appointments, loading, error } = useAppointments();
  const [period, setPeriod] = useState('upcoming');
  const [status, setStatus] = useState(null);
  const [search, setSearch] = useState('');
  const now = useNow();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = appointments.filter((a) => {
      if (period === 'upcoming' && a.startsAt < now - 60 * 60 * 1000) return false;
      if (period === 'past' && a.startsAt >= now - 60 * 60 * 1000) return false;
      if (status && a.status !== status) return false;
      if (q && !`${a.patientName} ${a.doctorName} ${a.specialty}`.toLowerCase().includes(q)) return false;
      return true;
    });
    if (period !== 'upcoming') list = [...list].reverse();
    return list;
  }, [appointments, period, status, search, now]);

  if (loading) return <Loading message="Cargando citas..." />;

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.list}
      data={filtered}
      keyExtractor={(a) => a.id}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View>
          {error && <Banner type="error" message={error} />}
          <SearchBar value={search} onChangeText={setSearch} placeholder={isDoctor ? 'Buscar paciente' : 'Buscar médico o especialidad'} />
          <ChipGroup options={PERIODS} value={period} onChange={(v) => v && setPeriod(v)} />
          <ChipGroup
            options={Object.entries(APPOINTMENT_STATUS).map(([id, s]) => ({ id, label: s.label, icon: s.icon }))}
            value={status}
            onChange={setStatus}
            scroll
          />
          <Text style={styles.count}>{filtered.length} cita(s)</Text>
        </View>
      }
      renderItem={({ item }) => <AppointmentCard appt={item} isDoctor={isDoctor} onPress={() => router.push(`/appointment/${item.id}`)} />}
      ListEmptyComponent={
        <EmptyState
          icon="calendar-outline"
          title="No hay citas"
          message={isDoctor ? 'Cuando un paciente agende contigo, aparecerá aquí.' : 'Agenda tu primera consulta con un especialista.'}
          action={!isDoctor ? <Button title="Buscar médico" icon="search" small onPress={() => router.push('/doctors')} /> : null}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  count: { color: colors.muted, fontSize: 13, marginBottom: spacing.sm },
});
