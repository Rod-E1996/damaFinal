import { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile } from '@/services/users';
import { fetchPatientHealth } from '@/services/health';
import { MeasurementsView, RecordsView } from '@/components/HealthViews';
import { Avatar, Banner, Card, ChipGroup, EmptyState, InfoRow, Loading, Screen, textStyles } from '@/components/ui';
import { spacing } from '@/theme';
import { ageFrom } from '@/lib/dates';
import { firebaseErrorMessage } from '@/lib/validators';

const TABS = [
  { id: 'records', label: 'Historial' },
  { id: 'measurements', label: 'Mediciones' },
];

/** Ficha del paciente (solo para médicos; las reglas de Firestore lo garantizan). */
export default function PatientScreen() {
  const { id } = useLocalSearchParams();
  const { isDoctor } = useAuth();
  const [patient, setPatient] = useState(undefined);
  const [health, setHealth] = useState({ measurements: [], records: [] });
  const [tab, setTab] = useState('records');
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    () =>
      Promise.all([getUserProfile(String(id)), fetchPatientHealth(String(id))])
        .then(([p, h]) => {
          setPatient(p);
          setHealth(h);
          setError(null);
        })
        .catch((e) => {
          setError(firebaseErrorMessage(e));
          setPatient((p) => p ?? null);
        }),
    [id]
  );

  useEffect(() => {
    load();
  }, [load]);

  if (!isDoctor) return <EmptyState icon="lock-closed-outline" title="Acceso restringido" message="Solo los médicos pueden ver fichas de pacientes." />;
  if (patient === undefined) return <Loading />;
  if (!patient) return <EmptyState icon="alert-circle-outline" title="Paciente no encontrado" message={error} />;

  const age = ageFrom(patient.birthDate);

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}
    >
      {error && <Banner type="error" message={error} />}
      <Card style={{ alignItems: 'center', gap: spacing.xs }}>
        <Avatar name={patient.name} size={72} />
        <Text style={textStyles.title}>{patient.name}</Text>
        <Text style={textStyles.muted}>
          {age !== null ? `${age} años` : ''} {patient.gender ? `· ${patient.gender}` : ''}
        </Text>
      </Card>
      <Card>
        <InfoRow icon="water-outline" label="Tipo de sangre" value={patient.bloodType} />
        <InfoRow icon="alert-circle-outline" label="Alergias" value={patient.allergies} />
        <InfoRow icon="fitness-outline" label="Padecimientos crónicos" value={patient.conditions} />
        <InfoRow icon="call-outline" label="Teléfono" value={patient.phone} />
        <InfoRow icon="people-outline" label="Contacto de emergencia" value={patient.emergencyContact} />
      </Card>
      <ChipGroup options={TABS} value={tab} onChange={(v) => v && setTab(v)} />
      {tab === 'records' ? <RecordsView records={health.records} /> : <MeasurementsView measurements={health.measurements} />}
    </Screen>
  );
}
