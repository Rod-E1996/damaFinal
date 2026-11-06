import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, ChipGroup, EmptyState, textStyles } from './ui';
import LineChart from './LineChart';
import { colors, spacing } from '@/theme';
import { MEASUREMENT_TYPES, RECORD_TYPES } from '@/lib/constants';
import { formatDate, formatDateTime } from '@/lib/dates';

/** Gráfico + lista de mediciones con filtro por tipo. Lo usan el paciente y el médico. */
export function MeasurementsView({ measurements, onDelete }) {
  const available = Object.keys(MEASUREMENT_TYPES).filter((t) => measurements.some((m) => m.type === t));
  const [type, setType] = useState(available[0] || 'presion');
  const current = available.includes(type) ? type : available[0];
  const cfg = MEASUREMENT_TYPES[current];
  const data = useMemo(() => measurements.filter((m) => m.type === current), [measurements, current]);

  const series = useMemo(() => {
    if (!cfg) return [];
    const recent = data.slice(0, 15);
    const s = [{ label: cfg.dual ? 'Sistólica' : cfg.label, color: colors.primary, values: recent.map((m) => ({ x: m.date, y: m.value })) }];
    if (cfg.dual) s.push({ label: 'Diastólica', color: colors.accent, values: recent.filter((m) => m.value2).map((m) => ({ x: m.date, y: m.value2 })) });
    return s;
  }, [data, cfg]);

  if (!available.length) {
    return <EmptyState icon="pulse-outline" title="Sin mediciones" message="Registra tu presión, glucosa, peso u otros signos vitales." />;
  }

  const values = data.map((m) => m.value);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  return (
    <>
      <ChipGroup
        options={available.map((t) => ({ id: t, label: MEASUREMENT_TYPES[t].label, icon: MEASUREMENT_TYPES[t].icon }))}
        value={current}
        onChange={(v) => v && setType(v)}
        scroll
      />
      <Card>
        <Text style={[textStyles.subtitle, { marginBottom: spacing.sm }]}>Evolución de {cfg.label.toLowerCase()}</Text>
        <LineChart series={series} unit={cfg.unit} />
        <View style={styles.stats}>
          <Stat label="Último" value={`${data[0].value}${data[0].value2 ? `/${data[0].value2}` : ''}`} unit={cfg.unit} />
          <Stat label="Promedio" value={avg.toFixed(1)} unit={cfg.unit} />
          <Stat label="Registros" value={data.length} />
        </View>
      </Card>
      {data.map((m) => (
        <Card key={m.id} style={styles.item}>
          <Ionicons name={cfg.icon} size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.value}>
              {m.value}
              {m.value2 ? `/${m.value2}` : ''} {cfg.unit}
            </Text>
            <Text style={textStyles.small}>{formatDateTime(m.date)}</Text>
            {!!m.note && <Text style={textStyles.muted}>{m.note}</Text>}
          </View>
          {m.synced === false && <Ionicons name="cloud-upload-outline" size={18} color={colors.warning} accessibilityLabel="Pendiente de sincronizar" />}
          {onDelete && (
            <Pressable onPress={() => onDelete(m)} hitSlop={10} accessibilityLabel="Eliminar medición">
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          )}
        </Card>
      ))}
    </>
  );
}

function Stat({ label, value, unit }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={textStyles.small}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {unit && <Text style={textStyles.small}>{unit}</Text>}
    </View>
  );
}

/** Línea de tiempo del historial médico con filtro por tipo. */
export function RecordsView({ records, onDelete, canDelete }) {
  const [type, setType] = useState(null);
  const filtered = type ? records.filter((r) => r.type === type) : records;
  return (
    <>
      <ChipGroup
        options={Object.entries(RECORD_TYPES).map(([id, r]) => ({ id, label: r.label, icon: r.icon }))}
        value={type}
        onChange={setType}
        scroll
      />
      {filtered.length === 0 ? (
        <EmptyState icon="folder-open-outline" title="Sin registros" message="Las consultas y resultados de pruebas aparecerán aquí." />
      ) : (
        filtered.map((r) => {
          const cfg = RECORD_TYPES[r.type] || RECORD_TYPES.nota;
          return (
            <Card key={r.id}>
              <View style={styles.recordHead}>
                <View style={styles.recordIcon}>
                  <Ionicons name={cfg.icon} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.value}>{r.title}</Text>
                  <Text style={textStyles.small}>
                    {cfg.label} · {formatDate(r.date)}
                    {r.doctorName ? ` · ${r.doctorName}` : ''}
                  </Text>
                </View>
                {r.synced === false && <Ionicons name="cloud-upload-outline" size={18} color={colors.warning} />}
                {onDelete && canDelete?.(r) && (
                  <Pressable onPress={() => onDelete(r)} hitSlop={10} accessibilityLabel="Eliminar registro">
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </Pressable>
                )}
              </View>
              {!!r.description && <Text style={[textStyles.body, { marginTop: spacing.sm }]}>{r.description}</Text>}
            </Card>
          );
        })
      )}
    </>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  value: { fontSize: 15, fontWeight: '700', color: colors.text },
  recordHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  recordIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
