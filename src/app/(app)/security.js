import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { listActions } from '@/lib/database';
import { Card, Screen, SectionHeader, textStyles } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { formatDateTime } from '@/lib/dates';

const MEASURES = [
  { icon: 'key-outline', title: 'Autenticación con Firebase', text: 'Tu contraseña nunca se guarda en el dispositivo; Firebase la almacena con hash seguro (scrypt).' },
  { icon: 'lock-closed-outline', title: 'Cifrado AES-256', text: 'Tus datos médicos y personales se cifran antes de guardarse en la nube (Firestore) y en el teléfono (SQLite).' },
  { icon: 'phone-portrait-outline', title: 'Llave en almacén seguro', text: 'La llave local se guarda en el Keystore de Android / Keychain de iOS.' },
  { icon: 'code-slash-outline', title: 'Protección contra inyección SQL', text: 'Todas las consultas a SQLite usan parámetros; el texto escrito nunca se ejecuta como SQL.' },
  { icon: 'people-outline', title: 'Acceso por roles', text: 'Pacientes y médicos tienen permisos distintos, validados también por las reglas de seguridad de Firestore.' },
  { icon: 'timer-outline', title: 'Bloqueo por intentos fallidos', text: 'Tras 5 intentos fallidos de inicio de sesión, el acceso se bloquea durante 5 minutos.' },
  { icon: 'trash-outline', title: 'Borrado al cerrar sesión', text: 'Al cerrar sesión se eliminan los datos guardados en este dispositivo.' },
];

export default function SecurityScreen() {
  const { profile } = useAuth();
  const [log, setLog] = useState([]);

  useEffect(() => {
    listActions(profile.uid).then(setLog).catch(() => {});
  }, [profile.uid]);

  return (
    <Screen>
      {MEASURES.map((m) => (
        <Card key={m.title} style={{ flexDirection: 'row', gap: spacing.md }}>
          <Ionicons name={m.icon} size={24} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={textStyles.subtitle}>{m.title}</Text>
            <Text style={textStyles.muted}>{m.text}</Text>
          </View>
        </Card>
      ))}
      <SectionHeader title="Actividad reciente en este dispositivo" />
      <Card>
        {log.length === 0 ? (
          <Text style={textStyles.muted}>Sin actividad registrada.</Text>
        ) : (
          log.map((l) => (
            <View key={l.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <Text style={textStyles.body}>{l.accion}</Text>
              <Text style={textStyles.small}>{formatDateTime(l.fecha)}</Text>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}
