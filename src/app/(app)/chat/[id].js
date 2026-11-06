import { useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { subscribeChat, subscribeMessages, sendMessage } from '@/services/chat';
import { getPushTokenOf } from '@/services/users';
import { sendPush } from '@/lib/notifications';
import { EmptyState, Loading } from '@/components/ui';
import { colors, radius, spacing, MAX_CONTENT_WIDTH } from '@/theme';
import { formatTime, formatDate, isSameDay } from '@/lib/dates';
import { sanitize, firebaseErrorMessage } from '@/lib/validators';

const MAX_LEN = 1000;

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams();
  const chatId = String(id);
  const { profile, isDoctor } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const [chat, setChat] = useState(undefined);
  const [messages, setMessages] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => subscribeChat(chatId, setChat, () => setChat(null)), [chatId]);
  useEffect(() => subscribeMessages(chatId, setMessages, () => setMessages([])), [chatId]);

  if (chat === undefined || messages === null) return <Loading />;
  if (!chat) return <EmptyState icon="lock-closed-outline" title="Conversación no disponible" />;

  const otherName = isDoctor ? chat.patientName : chat.doctorName;
  const otherId = isDoctor ? chat.patientId : chat.doctorId;

  const send = async () => {
    const clean = sanitize(text, MAX_LEN);
    if (!clean) return;
    setSending(true);
    try {
      await sendMessage(chatId, profile.uid, clean);
      setText('');
      getPushTokenOf(otherId).then((t) => sendPush(t, `Mensaje de ${profile.name}`, clean.slice(0, 120), { url: `/chat/${chatId}` }));
    } catch (e) {
      toast(firebaseErrorMessage(e), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
    >
      <Stack.Screen options={{ title: otherName }} />
      <FlatList
        inverted
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const mine = item.senderId === profile.uid;
          const older = messages[index + 1];
          const showDate = !older || !isSameDay(older.createdAt, item.createdAt);
          return (
            <View>
              {showDate && <Text style={styles.date}>{formatDate(item.createdAt)}</Text>}
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                <Text style={[styles.text, mine && { color: colors.white }]}>{item.text}</Text>
                <Text style={[styles.time, mine && { color: '#DCE8F8' }]}>{formatTime(item.createdAt)}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ transform: [{ scaleY: -1 }] }}>
            <EmptyState icon="chatbubble-ellipses-outline" title="Inicia la conversación" message="Los mensajes están cifrados. Recuerda: en caso de emergencia llama al 132." />
          </View>
        }
      />
      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Escribe un mensaje..."
          placeholderTextColor="#94A3B8"
          multiline
          maxLength={MAX_LEN}
          accessibilityLabel="Mensaje"
        />
        <Pressable
          onPress={send}
          disabled={!text.trim() || sending}
          style={[styles.send, (!text.trim() || sending) && { opacity: 0.5 }]}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensaje"
        >
          <Ionicons name="send" size={20} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, flexGrow: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  date: { alignSelf: 'center', fontSize: 12, color: colors.muted, marginVertical: spacing.sm, backgroundColor: colors.white, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  bubble: { maxWidth: '80%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginVertical: 3 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.white, borderBottomLeftRadius: 4 },
  text: { fontSize: 15, color: colors.text, lineHeight: 21 },
  time: { fontSize: 11, color: colors.muted, alignSelf: 'flex-end', marginTop: 2 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.bg,
    borderRadius: 22,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
