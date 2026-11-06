import { forwardRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, spacing, shadow, MAX_CONTENT_WIDTH } from '@/theme';

/* ------------------------------------------------------------------ */
/* Contenedor de pantalla: centra el contenido en tablets y maneja      */
/* el teclado y el "jalar para actualizar".                             */
/* ------------------------------------------------------------------ */
export function Screen({ children, scroll = true, refreshing, onRefresh, contentStyle, keyboard = false }) {
  const inner = <View style={[styles.content, contentStyle]}>{children}</View>;
  const body = scroll ? (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} colors={[colors.primary]} /> : undefined
      }
    >
      {inner}
    </ScrollView>
  ) : (
    <View style={styles.screen}>{inner}</View>
  );
  if (!keyboard) return body;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {body}
    </KeyboardAvoidingView>
  );
}

export function Card({ children, style, onPress, accessibilityLabel }) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

const BUTTON_VARIANTS = {
  primary: { bg: colors.primary, fg: colors.white, border: colors.primary },
  secondary: { bg: colors.primarySoft, fg: colors.primary, border: colors.primarySoft },
  outline: { bg: 'transparent', fg: colors.primary, border: colors.primary },
  danger: { bg: colors.danger, fg: colors.white, border: colors.danger },
  ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
  success: { bg: colors.accent, fg: colors.white, border: colors.accent },
};

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, style, small }) {
  const v = BUTTON_VARIANTS[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: !!loading }}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && { opacity: 0.8 },
        isDisabled && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 16 : 20} color={v.fg} />}
          <Text style={[styles.buttonText, small && { fontSize: 14 }, { color: v.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export const Input = forwardRef(function Input(
  { label, error, icon, secure, hint, style, multiline, maxLength, value, required, ...props },
  ref
) {
  const [hidden, setHidden] = useState(!!secure);
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, style]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={{ color: colors.danger }}> *</Text>}
        </Text>
      )}
      <View
        style={[
          styles.inputWrap,
          multiline && { alignItems: 'flex-start' },
          focused && { borderColor: colors.primary },
          error && { borderColor: colors.danger },
        ]}
      >
        {icon && <Ionicons name={icon} size={20} color={colors.muted} style={{ marginTop: multiline ? 12 : 0 }} />}
        <TextInput
          ref={ref}
          style={[styles.input, multiline && { minHeight: 96, textAlignVertical: 'top', paddingTop: 12 }]}
          placeholderTextColor="#94A3B8"
          secureTextEntry={hidden}
          multiline={multiline}
          maxLength={maxLength}
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          accessibilityHint={error || hint}
          {...props}
        />
        {secure && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.muted} />
          </Pressable>
        )}
      </View>
      <View style={styles.fieldFooter}>
        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : hint ? (
          <Text style={styles.hint}>{hint}</Text>
        ) : (
          <View />
        )}
        {maxLength && multiline ? (
          <Text style={styles.hint}>
            {(value || '').length}/{maxLength}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

export function Chip({ label, selected, onPress, icon, color = colors.primary }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={[
        styles.chip,
        selected && { backgroundColor: color, borderColor: color },
      ]}
    >
      {icon && <Ionicons name={icon} size={15} color={selected ? colors.white : colors.text} />}
      <Text style={[styles.chipText, selected && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

/** Grupo de chips para filtros o selecciones (simple o múltiple). */
export function ChipGroup({ options, value, onChange, multiple = false, scroll = false, label, error }) {
  const items = options.map((o) => (typeof o === 'string' ? { id: o, label: o } : o));
  const isSelected = (id) => (multiple ? (value || []).includes(id) : value === id);
  const toggle = (id) => {
    if (multiple) {
      const set = new Set(value || []);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      onChange([...set]);
    } else {
      onChange(value === id ? null : id);
    }
  };
  const chips = items.map((o) => (
    <Chip key={String(o.id)} label={o.label} icon={o.icon} selected={isSelected(o.id)} onPress={() => toggle(o.id)} />
  ));
  return (
    <View style={styles.field}>
      {label && <Text style={styles.label}>{label}</Text>}
      {scroll ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {chips}
        </ScrollView>
      ) : (
        <View style={[styles.chipRow, { flexWrap: 'wrap' }]}>{chips}</View>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

export function SearchBar({ value, onChangeText, placeholder = 'Buscar...' }) {
  return (
    <View style={[styles.inputWrap, { marginBottom: spacing.md }]}>
      <Ionicons name="search" size={20} color={colors.muted} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        accessibilityLabel={placeholder}
        returnKeyType="search"
        maxLength={60}
      />
      {!!value && (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityLabel="Limpiar búsqueda">
          <Ionicons name="close-circle" size={20} color={colors.muted} />
        </Pressable>
      )}
    </View>
  );
}

export function EmptyState({ icon = 'file-tray-outline', title, message, action }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={36} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message && <Text style={styles.emptyText}>{message}</Text>}
      {action}
    </View>
  );
}

export function Loading({ message = 'Cargando...' }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.hint, { marginTop: spacing.md }]}>{message}</Text>
    </View>
  );
}

export function Avatar({ name = '', size = 48, color = colors.primary }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color + '22',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityElementsHidden
    >
      <Text style={{ color, fontWeight: '700', fontSize: size * 0.38 }}>{initials || '?'}</Text>
    </View>
  );
}

export function Badge({ label, color = colors.primary, bg = colors.primarySoft, icon }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon && <Ionicons name={icon} size={13} color={color} />}
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function SectionHeader({ title, action, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text style={styles.link}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.hint}>{label}</Text>
        <Text style={styles.infoValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

export function Banner({ type = 'info', message, icon }) {
  const map = {
    info: [colors.primarySoft, colors.primary, 'information-circle-outline'],
    warning: [colors.warningSoft, colors.warning, 'warning-outline'],
    error: [colors.dangerSoft, colors.danger, 'alert-circle-outline'],
    success: [colors.successSoft, colors.success, 'checkmark-circle-outline'],
  };
  const [bg, fg, defIcon] = map[type];
  return (
    <View style={[styles.banner, { backgroundColor: bg }]} accessibilityRole="alert">
      <Ionicons name={icon || defIcon} size={20} color={fg} />
      <Text style={{ color: fg, flex: 1, fontSize: font.label }}>{message}</Text>
    </View>
  );
}

export const textStyles = StyleSheet.create({
  h1: { fontSize: font.h1, fontWeight: '800', color: colors.text },
  title: { fontSize: font.title, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  body: { fontSize: font.body, color: colors.text, lineHeight: 22 },
  muted: { fontSize: font.label, color: colors.muted },
  small: { fontSize: font.small, color: colors.muted },
  link: { fontSize: font.label, color: colors.primary, fontWeight: '600' },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { flexGrow: 1 },
  content: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', padding: spacing.lg, flexGrow: 1 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow,
  },
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonSmall: { minHeight: 40, paddingHorizontal: spacing.md },
  buttonText: { fontSize: 16, fontWeight: '700' },
  field: { marginBottom: spacing.md },
  label: { fontSize: font.label, fontWeight: '600', color: colors.text, marginBottom: 6 },
  inputWrap: {
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
  input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: 10 },
  fieldFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, minHeight: 16 },
  error: { color: colors.danger, fontSize: 13, flexShrink: 1 },
  hint: { color: colors.muted, fontSize: 13 },
  chipRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.sm },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: spacing.sm },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: spacing.xl },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  link: { fontSize: font.label, color: colors.primary, fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  infoValue: { fontSize: 15, color: colors.text, fontWeight: '500' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
});
