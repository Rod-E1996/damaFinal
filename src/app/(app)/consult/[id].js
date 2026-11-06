import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { subscribeAppointment, completeConsult } from '@/services/appointments';
import { getPushTokenOf } from '@/services/users';
import { sendPush } from '@/lib/notifications';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Button, Card, EmptyState, Input, Loading, Screen, textStyles } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { sanitize, validateRequired, firebaseErrorMessage } from '@/lib/validators';

const emptyMed = () => ({ name: '', dose: '', frequency: '', duration: '' });

export default function ConsultScreen() {
  const { id } = useLocalSearchParams();
  const { profile } = useAuth();
  const toast = useToast();
  const [appt, setAppt] = useState(undefined);
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [instructions, setInstructions] = useState('');
  const [issue, setIssue] = useState(true);
  const [meds, setMeds] = useState([emptyMed()]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeAppointment(String(id), setAppt, () => setAppt(null)), [id]);

  if (appt === undefined) return <Loading />;
  if (!appt || appt.doctorId !== profile.uid) return <EmptyState icon="lock-closed-outline" title="No tienes acceso a esta cita" />;
  if (appt.status === 'completada') return <EmptyState icon="checkmark-done-outline" title="Esta consulta ya fue registrada" />;

  const setMed = (i, key, value) => {
    setMeds((list) => list.map((m, idx) => (idx === i ? { ...m, [key]: value } : m)));
    setErrors((e) => ({ ...e, [`med${i}`]: null }));
  };

  const validate = () => {
    const errs = { diagnosis: validateRequired(diagnosis, 'El diagnóstico', { min: 5, max: 500 }) };
    if (issue) {
      meds.forEach((m, i) => {
        if (!m.name.trim() || !m.dose.trim() || !m.frequency.trim() || !m.duration.trim()) {
          errs[`med${i}`] = 'Completa nombre, dosis, frecuencia y duración.';
        }
      });
    }
    return Object.fromEntries(Object.entries(errs).filter(([, v]) => v));
  };

  const submit = () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    Alert.alert('Finalizar consulta', issue ? 'Se registrará la consulta y se emitirá la receta electrónica.' : 'Se registrará la consulta en el historial del paciente.', [
      { text: 'Revisar', style: 'cancel' },
      { text: 'Finalizar', onPress: save },
    ]);
  };

  const save = async () => {
    setSaving(true);
    try {
      const medications = issue
        ? meds.map((m) => ({
            name: sanitize(m.name, 80),
            dose: sanitize(m.dose, 60),
            frequency: sanitize(m.frequency, 60),
            duration: sanitize(m.duration, 60),
          }))
        : [];
      const { prescriptionId } = await completeConsult(appt, profile, {
        diagnosis: sanitize(diagnosis, 500),
        notes: sanitize(notes, 1000),
        instructions: sanitize(instructions, 1000),
        medications,
        issuePrescription: issue,
      });
      toast(prescriptionId ? 'Consulta registrada y receta emitida' : 'Consulta registrada');
      getPushTokenOf(appt.patientId).then((t) =>
        sendPush(t, 'Consulta finalizada', prescriptionId ? `${profile.name} emitió tu receta electrónica.` : `${profile.name} registró tu consulta.`, {
          url: prescriptionId ? `/prescriptions/${prescriptionId}` : '/history',
        })
      );
      router.back();
    } catch (e) {
      Alert.alert('Error', firebaseErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen keyboard>
      <Card>
        <Text style={textStyles.subtitle}>Paciente: {appt.patientName}</Text>
        <Text style={[textStyles.muted, { marginTop: 4 }]}>Motivo: {appt.reason}</Text>
      </Card>

      <Input label="Diagnóstico" required multiline maxLength={500} value={diagnosis} onChangeText={(t) => { setDiagnosis(t); setErrors((e) => ({ ...e, diagnosis: null })); }} error={errors.diagnosis} />
      <Input label="Notas clínicas" multiline maxLength={1000} value={notes} onChangeText={setNotes} hint="Visibles para el paciente en su historial." />

      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={textStyles.subtitle}>Emitir receta electrónica</Text>
          <Text style={textStyles.small}>Válida por 30 días, con código de verificación.</Text>
        </View>
        <Switch value={issue} onValueChange={setIssue} trackColor={{ true: colors.primary }} accessibilityLabel="Emitir receta electrónica" />
      </View>

      {issue && (
        <>
          {meds.map((m, i) => (
            <Card key={i}>
              <View style={styles.medHeader}>
                <Text style={textStyles.subtitle}>Medicamento {i + 1}</Text>
                {meds.length > 1 && (
                  <Pressable onPress={() => setMeds((l) => l.filter((_, idx) => idx !== i))} hitSlop={10} accessibilityLabel={`Quitar medicamento ${i + 1}`}>
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </Pressable>
                )}
              </View>
              <Input label="Nombre y presentación" value={m.name} onChangeText={(t) => setMed(i, 'name', t)} placeholder="Ej. Amoxicilina 500 mg cápsulas" maxLength={80} />
              <View style={styles.row}>
                <Input style={{ flex: 1 }} label="Dosis" value={m.dose} onChangeText={(t) => setMed(i, 'dose', t)} placeholder="1 cápsula" maxLength={60} />
                <Input style={{ flex: 1 }} label="Frecuencia" value={m.frequency} onChangeText={(t) => setMed(i, 'frequency', t)} placeholder="Cada 8 h" maxLength={60} />
              </View>
              <Input label="Duración" value={m.duration} onChangeText={(t) => setMed(i, 'duration', t)} placeholder="7 días" maxLength={60} />
              {errors[`med${i}`] && <Text style={styles.error}>{errors[`med${i}`]}</Text>}
            </Card>
          ))}
          {meds.length < 8 && <Button title="Agregar medicamento" icon="add" variant="ghost" onPress={() => setMeds((l) => [...l, emptyMed()])} />}
          <Input label="Indicaciones generales" multiline maxLength={1000} value={instructions} onChangeText={setInstructions} placeholder="Reposo, dieta, signos de alarma..." />
        </>
      )}

      <Button title="Finalizar consulta" icon="checkmark-done" onPress={submit} loading={saving} style={{ marginBottom: spacing.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.md },
  medHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  error: { color: colors.danger, fontSize: 13 },
});
