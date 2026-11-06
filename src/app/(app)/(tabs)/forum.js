import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { subscribePosts } from '@/services/forum';
import { Badge, Banner, Button, Card, ChipGroup, EmptyState, Loading, SearchBar } from '@/components/ui';
import { colors, spacing, MAX_CONTENT_WIDTH } from '@/theme';
import { FORUM_CATEGORIES } from '@/lib/constants';
import { relativeTime } from '@/lib/dates';
import { firebaseErrorMessage } from '@/lib/validators';

export default function ForumScreen() {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [onlyDoctors, setOnlyDoctors] = useState(false);

  useEffect(
    () =>
      subscribePosts(
        (list) => {
          setPosts(list);
          setError(null);
        },
        (e) => {
          setError(firebaseErrorMessage(e));
          setPosts((p) => p || []);
        }
      ),
    []
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (posts || []).filter((p) => {
      if (category && p.category !== category) return false;
      if (onlyDoctors && p.authorRole !== 'medico') return false;
      if (q && !`${p.title} ${p.body}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [posts, category, search, onlyDoctors]);

  if (!posts) return <Loading message="Cargando foro..." />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        contentContainerStyle={styles.list}
        data={filtered}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <Banner type="info" message="Comparte experiencias y apoyo. La información del foro no sustituye una consulta médica." />
            {error && <Banner type="error" message={error} />}
            <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar en el foro" />
            <ChipGroup options={FORUM_CATEGORIES} value={category} onChange={setCategory} scroll />
            <ChipGroup
              options={[{ id: 'doctors', label: 'Respuestas de médicos', icon: 'medkit-outline' }]}
              value={onlyDoctors ? 'doctors' : null}
              onChange={(v) => setOnlyDoctors(!!v)}
            />
          </View>
        }
        renderItem={({ item }) => (
          <Card onPress={() => router.push(`/post/${item.id}`)} accessibilityLabel={item.title}>
            <View style={styles.meta}>
              <Badge label={item.category} />
              <Text style={styles.time}>{relativeTime(item.createdAt)}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body} numberOfLines={2}>
              {item.body}
            </Text>
            <View style={styles.footer}>
              <View style={styles.author}>
                <Ionicons name={item.authorRole === 'medico' ? 'medkit' : 'person-circle-outline'} size={16} color={item.authorRole === 'medico' ? colors.accent : colors.muted} />
                <Text style={styles.authorText}>{item.authorName}</Text>
              </View>
              <View style={styles.author}>
                <Ionicons name="chatbubble-outline" size={15} color={colors.muted} />
                <Text style={styles.authorText}>{item.commentCount || 0}</Text>
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={<EmptyState icon="people-outline" title="Sin publicaciones" message="Sé el primero en compartir algo con la comunidad." />}
      />
      <View style={styles.fab}>
        <Button title="Publicar" icon="create-outline" onPress={() => router.push('/post-new')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingBottom: 100, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  time: { fontSize: 12, color: colors.muted },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, color: colors.muted, marginTop: 4 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  author: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  authorText: { fontSize: 13, color: colors.muted },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg },
});
