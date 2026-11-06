import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  setupNotifications,
  getPushToken,
  notifyNow,
  scheduleAppointmentReminders,
  cancelAppointmentReminders,
} from '@/lib/notifications';
import { savePushToken } from '@/services/users';
import { subscribeAppointments } from '@/services/appointments';
import { subscribeChats } from '@/services/chat';
import { startHealthSync, pushPending } from '@/services/health';
import { APPOINTMENT_STATUS } from '@/lib/constants';
import { formatDateShort } from '@/lib/dates';
import { colors, spacing } from '@/theme';

/**
 * Servicios que corren mientras el usuario tiene la sesión abierta:
 * permisos y token de notificaciones, recordatorios automáticos de citas,
 * alertas de mensajes nuevos, sincronización SQLite <-> Firestore y
 * aviso de modo sin conexión.
 */
export default function AppServices() {
  const { profile, isDoctor } = useAuth();
  const toast = useToast();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  const uid = profile?.uid;

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  // Permisos, canal de Android y token push.
  useEffect(() => {
    if (!uid) return;
    (async () => {
      const granted = await setupNotifications().catch(() => false);
      if (!granted) return;
      const token = await getPushToken();
      if (token && token !== profile.pushToken) savePushToken(uid, token).catch(() => {});
    })();
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Al tocar una notificación, se abre la pantalla relacionada.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/')) router.push(url);
    });
    return () => sub.remove();
  }, []);

  // Sincronización del historial y mediciones (solo pacientes).
  useEffect(() => {
    if (!uid || isDoctor) return;
    return startHealthSync(uid);
  }, [uid, isDoctor]);

  // Estado de la conexión.
  useEffect(() => {
    let wasOffline = false;
    const unsub = NetInfo.addEventListener((state) => {
      const isOff = state.isConnected === false;
      setOffline(isOff);
      if (wasOffline && !isOff && uid && !isDoctor) {
        pushPending(uid).then((n) => n > 0 && toast(`${n} registro(s) sincronizado(s) con la nube`, 'info'));
      }
      wasOffline = isOff;
    });
    return unsub;
  }, [uid, isDoctor, toast]);

  // Citas: recordatorios automáticos y avisos de cambios de estado.
  useEffect(() => {
    if (!uid) return;
    let previous = null;
    return subscribeAppointments(
      uid,
      profile.role,
      async (list) => {
        for (const a of list) {
          const other = isDoctor ? a.patientName : a.doctorName;
          if ((a.status === 'pendiente' || a.status === 'confirmada') && a.startsAt > Date.now()) {
            scheduleAppointmentReminders(a, other).catch(() => {});
          } else {
            cancelAppointmentReminders(a.id).catch(() => {});
          }
          if (!previous) continue;
          const before = previous.get(a.id);
          if (!before && isDoctor && a.status === 'pendiente') {
            notifyNow('Nueva solicitud de cita', `${a.patientName} solicitó una cita para el ${formatDateShort(a.startsAt)} a las ${a.time}.`, { url: `/appointment/${a.id}` }, 'citas');
          } else if (before && before !== a.status) {
            notifyNow(
              `Cita ${APPOINTMENT_STATUS[a.status]?.label.toLowerCase()}`,
              `Tu cita con ${other} del ${formatDateShort(a.startsAt)} ahora está ${APPOINTMENT_STATUS[a.status]?.label.toLowerCase()}.`,
              { url: `/appointment/${a.id}` },
              'citas'
            );
          }
        }
        previous = new Map(list.map((a) => [a.id, a.status]));
      },
      () => {}
    );
  }, [uid, isDoctor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mensajes nuevos: alerta local si el usuario no está viendo ese chat.
  useEffect(() => {
    if (!uid) return;
    let lastSeen = null;
    return subscribeChats(
      uid,
      (chats) => {
        if (lastSeen) {
          for (const c of chats) {
            const prev = lastSeen.get(c.id) || 0;
            const viewing = pathRef.current === `/chat/${c.id}`;
            if ((c.updatedAt || 0) > prev && c.lastSenderId && c.lastSenderId !== uid && !viewing) {
              const from = isDoctor ? c.patientName : c.doctorName;
              notifyNow(`Mensaje de ${from}`, c.lastMessage || 'Nuevo mensaje', { url: `/chat/${c.id}` }, 'mensajes');
            }
          }
        }
        lastSeen = new Map(chats.map((c) => [c.id, c.updatedAt || 0]));
      },
      () => {}
    );
  }, [uid, isDoctor]);

  if (!offline) return null;
  return (
    <View style={[styles.offline, { bottom: insets.bottom + 70 }]} accessibilityRole="alert" pointerEvents="none">
      <Ionicons name="cloud-offline-outline" size={16} color={colors.white} />
      <Text style={styles.offlineText}>Sin conexión. Tus datos se guardan en el dispositivo y se sincronizarán luego.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  offline: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  offlineText: { color: colors.white, fontSize: 13, flex: 1 },
});
