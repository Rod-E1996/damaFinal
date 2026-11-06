import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { subscribeChats } from '@/services/chat';
import { Avatar, Banner, Button, Card, EmptyState, Loading, SearchBar } from '@/components/ui';
import { colors, spacing, MAX_CONTENT_WIDTH } from '@/theme';
import { relativeTime } from '@/lib/dates';
import { firebaseErrorMessage } from '@/lib/validators';

export default function ChatsScreen() {
  const { profile, isDoctor } = useAuth();
  const [chats, setChats] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(
    () =>
      subscribeChats(
        profile.uid,
        (list) => {
          setChats(list);
          setError(null);
        },
        (e) => {
          setError(firebaseErrorMessage(e));
          setChats((c) => c || []);
        }
      ),
    [profile.uid]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (chats || []).filter((c) => !q || (isDoctor ? c.patientName : c.doctorName).toLowerCase().includes(q));
  }, [chats, search, isDoctor]);

  if (!chats) return <Loading message="Cargando conversaciones..." />;

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.list}
      data={filtered}
      keyExtractor={(c) => c.id}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View>
          {error && <Banner type="error" message={error} />}
          <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar conversación" />
        </View>
      }
      renderItem={({ item }) => {
        const name = isDoctor ? item.patientName : item.doctorName;
        const mine = item.lastSenderId === profile.uid;
        return (
          <Card onPress={() => router.push(`/chat/${item.id}`)} accessibilityLabel={`Conversación con ${name}`} style={styles.item}>
            <Avatar name={name} />
            <View style={{ flex: 1 }}>
              <View style={styles.top}>
                <Text style={styles.name} numberOfLines={1}>
                  {name}
                </Text>
                {item.updatedAt ? <Text style={styles.time}>{relativeTime(item.updatedAt)}</Text> : null}
              </View>
              {!isDoctor && !!item.specialty && <Text style={styles.specialty}>{item.specialty}</Text>}
              <Text style={styles.last} numberOfLines={1}>
                {item.lastMessage ? `${mine ? 'Tú: ' : ''}${item.lastMessage}` : 'Sin mensajes aún'}
              </Text>
            </View>
          </Card>
        );
      }}
      ListEmptyComponent={
        <EmptyState
          icon="chatbubbles-outline"
          title="Sin conversaciones"
          message={isDoctor ? 'Cuando un paciente te escriba, verás la conversación aquí.' : 'Abre el perfil de un médico y toca "Enviar mensaje".'}
          action={!isDoctor ? <Button title="Buscar médico" icon="search" small onPress={() => router.push('/doctors')} /> : null}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  name: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  time: { fontSize: 12, color: colors.muted },
  specialty: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  last: { fontSize: 14, color: colors.muted, marginTop: 2 },
});
