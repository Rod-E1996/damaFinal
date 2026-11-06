import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, shadow } from '@/theme';

/** Avisos breves (toast) para confirmar acciones sin interrumpir al usuario. */
const ToastContext = createContext(null);

const TYPES = {
  success: { bg: colors.success, icon: 'checkmark-circle' },
  error: { bg: colors.danger, icon: 'alert-circle' },
  info: { bg: colors.primary, icon: 'information-circle' },
  warning: { bg: colors.warning, icon: 'warning' },
};

export function ToastProvider({ children }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef(null);

  const show = useCallback(
    (message, type = 'success', duration = 2800) => {
      clearTimeout(timer.current);
      setToast({ message, type });
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
      }, duration);
    },
    [opacity]
  );

  const t = toast ? TYPES[toast.type] || TYPES.info : null;

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[styles.wrap, { top: insets.top + spacing.sm, opacity }]}
        >
          <View style={[styles.toast, { backgroundColor: t.bg }]}>
            <Ionicons name={t.icon} size={22} color={colors.white} />
            <Text style={styles.text}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg, alignItems: 'center', zIndex: 1000 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    maxWidth: 560,
    ...shadow,
  },
  text: { color: colors.white, fontSize: 15, fontWeight: '600', flexShrink: 1 },
});
