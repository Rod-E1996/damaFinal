import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';
import { formatDate } from '@/lib/dates';

/** Campo de fecha que abre el selector nativo del sistema. */
export default function DateField({ label, value, onChange, error, maximumDate, minimumDate, required }) {
  const [showIOS, setShowIOS] = useState(false);
  const date = value ? new Date(value) : null;

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date || new Date(1990, 0, 1),
        mode: 'date',
        maximumDate,
        minimumDate,
        onChange: (event, selected) => {
          if (event.type === 'set' && selected) onChange(selected.toISOString());
        },
      });
    } else {
      setShowIOS((s) => !s);
    }
  };

  return (
    <View style={styles.field}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={{ color: colors.danger }}> *</Text>}
        </Text>
      )}
      <Pressable
        onPress={open}
        style={[styles.input, error && { borderColor: colors.danger }]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${date ? formatDate(date) : 'sin seleccionar'}`}
      >
        <Ionicons name="calendar-outline" size={20} color={colors.muted} />
        <Text style={[styles.value, !date && { color: '#94A3B8' }]}>{date ? formatDate(date) : 'Seleccionar fecha'}</Text>
      </Pressable>
      {showIOS && Platform.OS !== 'android' && (
        <DateTimePicker
          value={date || new Date(1990, 0, 1)}
          mode="date"
          display="inline"
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onChange={(_, selected) => selected && onChange(selected.toISOString())}
        />
      )}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.md },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  value: { fontSize: 16, color: colors.text },
  error: { color: colors.danger, fontSize: 13, marginTop: 4 },
});
