import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { subscribePost, subscribeComments, addComment, deletePost } from '@/services/forum';
import { Badge, Button, Card, EmptyState, Input, Loading, Screen, SectionHeader, textStyles } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { relativeTime } from '@/lib/dates';
import { sanitize, validateRequired, firebaseErrorMessage } from '@/lib/validators';

function Author({ name, role, time }) {
  const doctor = role === 'medico';
  return (
    <View style={styles.author}>
      <Ionicons name={doctor ? 'medkit' : 'person-circle-outline'} size={18} color={doctor ? colors.accent : colors.muted} />
      <Text style={[styles.authorText, doctor && { color: colors.accent, fontWeight: '700' }]}>
        {name}
        {doctor ? ' · Médico' : ''}
      </Text>
      <Text style={styles.time}>· {relativeTime(time)}</Text>
    </View>
  );
}

export default function PostScreen() {
  const { id } = useLocalSearchParams();
  const postId = String(id);
  const { profile } = useAuth();
  const toast = useToast();
  const [post, setPost] = useState(undefined);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => subscribePost(postId, setPost, () => setPost(null)), [postId]);
  useEffect(() => subscribeComments(postId, setComments, () => {}), [postId]);

  if (post === undefined) return <Loading />;
  if (!post) return <EmptyState icon="alert-circle-outline" title="La publicación no existe o fue eliminada" />;

  const send = async () => {
    const err = validateRequired(text, 'El comentario', { min: 2, max: 1000 });
    setError(err);
    if (err) return;
    setSending(true);
    try {
      await addComment(postId, profile, sanitize(text, 1000));
      setText('');
      toast('Comentario publicado');
    } catch (e) {
      Alert.alert('Error', firebaseErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const remove = () =>
    Alert.alert('Eliminar publicación', '¿Seguro que deseas eliminarla?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(postId);
            toast('Publicación eliminada');
            router.back();
          } catch (e) {
            Alert.alert('Error', firebaseErrorMessage(e));
          }
        },
      },
    ]);

  return (
    <Screen keyboard>
      <Card>
        <Badge label={post.category} />
        <Text style={[textStyles.title, { marginTop: spacing.sm }]}>{post.title}</Text>
        <Author name={post.authorName} role={post.authorRole} time={post.createdAt} />
        <Text style={[textStyles.body, { marginTop: spacing.md }]}>{post.body}</Text>
        {post.authorId === profile.uid && <Button title="Eliminar" icon="trash-outline" variant="ghost" small onPress={remove} style={{ alignSelf: 'flex-end', marginTop: spacing.sm }} />}
      </Card>

      <SectionHeader title={`Comentarios (${comments.length})`} />
      {comments.map((c) => (
        <Card key={c.id} style={c.authorRole === 'medico' ? { borderLeftWidth: 4, borderLeftColor: colors.accent } : null}>
          <Author name={c.authorName} role={c.authorRole} time={c.createdAt} />
          <Text style={[textStyles.body, { marginTop: spacing.xs }]}>{c.body}</Text>
        </Card>
      ))}
      {comments.length === 0 && <Text style={[textStyles.muted, { marginBottom: spacing.md }]}>Aún no hay comentarios.</Text>}

      <Input label="Tu comentario" multiline maxLength={1000} value={text} onChangeText={(t) => { setText(t); setError(null); }} error={error} placeholder="Escribe un comentario respetuoso..." />
      <Button title="Comentar" icon="chatbubble-outline" onPress={send} loading={sending} style={{ marginBottom: spacing.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  author: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs, flexWrap: 'wrap' },
  authorText: { fontSize: 13, color: colors.muted },
  time: { fontSize: 12, color: colors.muted },
});
