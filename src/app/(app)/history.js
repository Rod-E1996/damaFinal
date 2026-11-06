import { useState } from 'react';
import { Alert, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useHealthData } from '@/hooks/useHealthData';
import { removeMeasurement, removeRecord, pushPending } from '@/services/health';
import { MeasurementsView, RecordsView } from '@/components/HealthViews';
import { Banner, Button, ChipGroup, Loading, Screen } from '@/components/ui';
import { spacing } from '@/theme';
import { firebaseErrorMessage } from '@/lib/validators';

const TABS = [
  { id: 'records', label: 'Consultas y pruebas', icon: 'folder-open-outline' },
  { id: 'measurements', label: 'Mediciones', icon: 'stats-chart-outline' },
];

export default function HistoryScreen() {
  const { profile } = useAuth();
  const toast = useToast();
  const { measurements, records, loading, reload } = useHealthData(profile.uid);
  const [tab, setTab] = useState('records');
  const [refreshing, setRefreshing] = useState(false);

  const pending = measurements.filter((m) => !m.synced).length + records.filter((r) => !r.synced).length;

  const onRefresh = async () => {
    setRefreshing(true);
    const n = await pushPending(profile.uid).catch(() => 0);
    await reload();
    setRefreshing(false);
    if (n) toast(`${n} registro(s) sincronizado(s)`, 'info');
  };

  const confirmDelete = (label, fn) =>
    Alert.alert('Eliminar', `¿Eliminar ${label}? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await fn();
            toast('Registro eliminado');
          } catch (e) {
            Alert.alert('No se pudo eliminar', `${firebaseErrorMessage(e)} Necesitas conexión para eliminar.`);
          }
        },
      },
    ]);

  if (loading) return <Loading />;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <ChipGroup options={TABS} value={tab} onChange={(v) => v && setTab(v)} />
      {pending > 0 && <Banner type="warning" message={`${pending} registro(s) pendiente(s) de sincronizar. Desliza hacia abajo para reintentar.`} />}

      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
        {tab === 'records' ? (
          <Button style={{ flex: 1 }} title="Agregar resultado o nota" icon="add" variant="secondary" small onPress={() => router.push('/add-record')} />
        ) : (
          <Button style={{ flex: 1 }} title="Nueva medición" icon="add" variant="secondary" small onPress={() => router.push('/add-measurement')} />
        )}
      </View>

      {tab === 'records' ? (
        <RecordsView
          records={records}
          canDelete={(r) => r.type !== 'consulta'}
          onDelete={(r) => confirmDelete('este registro', () => removeRecord(profile.uid, r.id))}
        />
      ) : (
        <MeasurementsView measurements={measurements} onDelete={(m) => confirmDelete('esta medición', () => removeMeasurement(profile.uid, m.id))} />
      )}
    </Screen>
  );
}
