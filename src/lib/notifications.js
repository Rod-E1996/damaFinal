import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { getReminder, saveReminder, deleteReminder } from './database';
import { formatDateTime } from './dates';

/**
 * Notificaciones:
 * - Locales (funcionan en Expo Go): recordatorios de citas, mensajes nuevos y
 *   cambios de estado mientras la app estÃ¡ abierta o en segundo plano.
 * - Push remotas (requieren un "development build"): se obtiene el token de
 *   Expo Push, se guarda en Firestore y se envÃ­a desde el cliente con la API
 *   de Expo Push (que usa Firebase Cloud Messaging en Android).
 */

export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1565C0',
    });
    await Notifications.setNotificationChannelAsync('citas', {
      name: 'Recordatorios de citas',
      importance: AndroidImportance.HIGH,
    });
    await Notifications.setNotificationChannelAsync('mensajes', {
      name: 'Mensajes',
      importance: AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;
  if (!granted && current.canAskAgain) {
    const req = await Notifications.requestPermissionsAsync();
    granted = req.granted;
  }
  return granted;
}

/** Token de Expo Push. Devuelve null en Expo Go o emuladores sin soporte. */
export async function getPushToken() {
  if (isExpoGo || !Device.isDevice) return null;
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return null;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (e) {
    console.warn('No se pudo obtener el token push', e?.message);
    return null;
  }
}

/** EnvÃ­a una notificaciÃ³n push a otro usuario mediante el servicio de Expo. */
export async function sendPush(token, title, body, data = {}) {
  if (!token) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: token, title, body, data, sound: 'default', channelId: 'default' }),
    });
  } catch {
    // Si falla el push, el destinatario igual recibirÃ¡ la alerta local al abrir la app.
  }
}

export async function notifyNow(title, body, data = {}, channelId = 'default') {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: true },
      trigger: Platform.OS === 'android' ? { channelId } : null,
    });
  } catch (e) {
    console.warn('No se pudo mostrar la notificaciÃ³n', e?.message);
  }
}

/**
 * Programa recordatorios 24 h y 1 h antes de la cita. Si ya existen para la
 * misma hora, no hace nada; si la cita cambiÃ³ de hora, los reprograma.
 */
export async function scheduleAppointmentReminders(appt, otherName) {
  const startsAt = appt.startsAt;
  const existing = await getReminder(appt.id);
  if (existing && existing.startsAt === startsAt) return;
  if (existing) await cancelAppointmentReminders(appt.id);

  const ids = [];
  const offsets = [
    { ms: 24 * 60 * 60 * 1000, label: 'maÃ±ana' },
    { ms: 60 * 60 * 1000, label: 'en 1 hora' },
  ];
  for (const o of offsets) {
    const when = startsAt - o.ms;
    if (when <= Date.now() + 5000) continue;
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Recordatorio de cita',
          body: `Tu cita con ${otherName} es ${o.label} (${formatDateTime(startsAt)}).`,
          data: { url: `/appointment/${appt.id}` },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(when),
          channelId: 'citas',
        },
      });
      ids.push(id);
    } catch (e) {
      console.warn('No se pudo programar el recordatorio', e?.message);
    }
  }
  await saveReminder(appt.id, ids, startsAt);
}

export async function cancelAppointmentReminders(appointmentId) {
  const existing = await getReminder(appointmentId);
  if (!existing) return;
  for (const id of existing.ids) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
  await deleteReminder(appointmentId);
}
