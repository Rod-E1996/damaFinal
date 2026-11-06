import { useEffect, useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getPrescription, isPrescriptionActive } from '@/services/prescriptions';
import { sharePrescription } from '@/lib/pdf';
import { Badge, Button, Card, EmptyState, InfoRow, Loading, Screen, textStyles } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { formatDate } from '@/lib/dates';

export default function PrescriptionDetailScreen() {
  const { id } = useLocalSearchParams();
  const { profile } = useAuth();
  const toast = useToast();
  const [rx, setRx] = useState(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPrescription(String(id), profile.uid).then(setRx).catch(() => setRx(null));
  }, [id, profile.uid]);

  if (rx === undefined) return <Loading />;
  if (!rx) return <EmptyState icon="alert-circle-outline" title="Receta no encontrada" />;

  const active = isPrescriptionActive(rx);

  const downloadPdf = async () => {
    setBusy(true);
    try {
      await sharePrescription(rx);
      toast('Receta generada en PDF');
    } catch (e) {
      Alert.alert('No se pudo generar el PDF', e?.message || 'Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const shareText = async () => {
    const meds = (rx.medications || []).map((m, i) => `${i + 1}. ${m.name} — ${m.dose}, ${m.frequency}, ${m.duration}`).join('\n');
    await Share.share({
      title: 'Receta médica',
      message: `RECETA MÉDICA — TeleSalud\nMédico: ${rx.doctorName} (JVPM ${rx.doctorLicense})\nPaciente: ${rx.patientName}\nFecha: ${formatDate(rx.createdAt)}\n\n${meds}\n\nCódigo de verificación: ${rx.code}\nVálida hasta: ${formatDate(rx.validUntil)}`,
    });
  };

  return (
    <Screen>
      <Card>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={textStyles.title}>Receta electrónica</Text>
            <Text style={textStyles.small}>N.º {rx.id.slice(0, 10).toUpperCase()}</Text>
          </View>
          <Badge label={active ? 'Vigente' : 'Vencida'} color={active ? colors.success : colors.muted} bg={active ? colors.successSoft : '#EEF2F6'} />
        </View>
        <InfoRow icon="person-outline" label="Médico" value={`${rx.doctorName} · ${rx.specialty}`} />
        <InfoRow icon="ribbon-outline" label="JVPM" value={rx.doctorLicense} />
        <InfoRow icon="person-circle-outline" label="Paciente" value={rx.patientName} />
        <InfoRow icon="calendar-outline" label="Emitida / válida hasta" value={`${formatDate(rx.createdAt)} — ${formatDate(rx.validUntil)}`} />
      </Card>

      <Card>
        <Text style={[textStyles.subtitle, { marginBottom: spacing.sm }]}>Diagnóstico</Text>
        <Text style={textStyles.body}>{rx.diagnosis}</Text>
      </Card>

      <Card>
        <Text style={[textStyles.subtitle, { marginBottom: spacing.sm }]}>Medicamentos</Text>
        {(rx.medications || []).map((m, i) => (
          <View key={i} style={styles.med}>
            <Text style={styles.medName}>
              {i + 1}. {m.name}
            </Text>
            <Text style={textStyles.muted}>
              {m.dose} · {m.frequency} · {m.duration}
            </Text>
          </View>
        ))}
        {!!rx.instructions && (
          <>
            <Text style={[textStyles.subtitle, { marginTop: spacing.md, marginBottom: spacing.xs }]}>Indicaciones</Text>
            <Text style={textStyles.body}>{rx.instructions}</Text>
          </>
        )}
      </Card>

      <Card style={{ alignItems: 'center', backgroundColor: colors.primarySoft }}>
        <Text style={textStyles.small}>Código de verificación para farmacia</Text>
        <Text style={styles.code} selectable>
          {rx.code}
        </Text>
      </Card>

      <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
        <Button title="Descargar / compartir PDF" icon="download-outline" onPress={downloadPdf} loading={busy} />
        <Button title="Compartir con farmacia (texto)" icon="share-social-outline" variant="secondary" onPress={shareText} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  med: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  medName: { fontSize: 15, fontWeight: '700', color: colors.text },
  code: { fontSize: 28, fontWeight: '800', letterSpacing: 4, color: colors.primary, marginTop: 4 },
});
