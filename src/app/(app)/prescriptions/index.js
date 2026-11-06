import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { subscribePrescriptions, isPrescriptionActive } from '@/services/prescriptions';
import { Badge, Banner, Card, ChipGroup, EmptyState, Loading, SearchBar } from '@/components/ui';
import { colors, spacing, MAX_CONTENT_WIDTH } from '@/theme';
import { formatDate } from '@/lib/dates';
import { firebaseErrorMessage } from '@/lib/validators';

const STATUS = [
  { id: 'active', label: 'Vigentes' },
  { id: 'expired', label: 'Vencidas' },
];

export default function PrescriptionsScreen() {
  const { profile, isDoctor } = useAuth();
  const [list, setList] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(null);

  useEffect(
    () =>
      subscribePrescriptions(
        profile.uid,
        profile.role,
        (items, cached) => {
          setList(items);
          setFromCache(cached);
          setError(null);
        },
        (e) => {
          setError(firebaseErrorMessage(e));
          setList((l) => l || []);
        }
      ),
    [profile.uid, profile.role]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (list || []).filter((rx) => {
      const active = isPrescriptionActive(rx);
      if (status === 'active' && !active) return false;
      if (status === 'expired' && active) return false;
      if (q) {
        const text = `${rx.doctorName} ${rx.patientName} ${rx.diagnosis} ${(rx.medications || []).map((m) => m.name).join(' ')}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [list, search, status]);

  if (!list) return <Loading message="Cargando recetas..." />;

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.list}
      data={filtered}
      keyExtractor={(r) => r.id}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View>
          {error && <Banner type="error" message={error} />}
          {fromCache && <Banner type="info" message="Mostrando recetas guardadas en el dispositivo." icon="phone-portrait-outline" />}
          <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar por medicamento, médico o diagnóstico" />
          <ChipGroup options={STATUS} value={status} onChange={setStatus} />
        </View>
      }
      renderItem={({ item }) => {
        const active = isPrescriptionActive(item);
        return (
          <Card onPress={() => router.push(`/prescriptions/${item.id}`)} accessibilityLabel={`Receta del ${formatDate(item.createdAt)}`}>
            <View style={styles.row}>
              <View style={styles.icon}>
                <Ionicons name="document-text" size={24} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>
                  {(item.medications || []).map((m) => m.name).join(', ') || 'Receta'}
                </Text>
                <Text style={styles.sub}>{isDoctor ? `Paciente: ${item.patientName}` : item.doctorName}</Text>
                <Text style={styles.sub}>{formatDate(item.createdAt)}</Text>
              </View>
              <Badge
                label={active ? 'Vigente' : 'Vencida'}
                color={active ? colors.success : colors.muted}
                bg={active ? colors.successSoft : '#EEF2F6'}
              />
            </View>
          </Card>
        );
      }}
      ListEmptyComponent={
        <EmptyState
          icon="document-text-outline"
          title="Sin recetas"
          message={isDoctor ? 'Las recetas que emitas aparecerán aquí.' : 'Tus recetas electrónicas aparecerán aquí después de cada consulta.'}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  sub: { fontSize: 13, color: colors.muted },
});
