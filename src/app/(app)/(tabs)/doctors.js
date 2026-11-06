import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDoctors } from '@/hooks/useDoctors';
import { Banner, Button, ChipGroup, EmptyState, Loading, SearchBar } from '@/components/ui';
import { DoctorCard } from '@/components/cards';
import { colors, spacing, MAX_CONTENT_WIDTH } from '@/theme';
import { CITIES, LANGUAGES, SPECIALTIES, WEEK_DAYS } from '@/lib/constants';

const SORTS = [
  { id: 'name', label: 'Nombre' },
  { id: 'feeAsc', label: 'Menor tarifa' },
  { id: 'feeDesc', label: 'Mayor tarifa' },
];

const normalize = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export default function DoctorsScreen() {
  const { doctors, loading, refreshing, error, refresh } = useDoctors();
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState(null);
  const [city, setCity] = useState(null);
  const [language, setLanguage] = useState(null);
  const [day, setDay] = useState(null);
  const [sort, setSort] = useState('name');
  const [showFilters, setShowFilters] = useState(false);

  const activeFilters = [specialty, city, language, day].filter((v) => v !== null).length;

  const filtered = useMemo(() => {
    const q = normalize(search);
    const list = doctors.filter((d) => {
      if (q && !normalize(`${d.name} ${d.specialty} ${d.clinic}`).includes(q)) return false;
      if (specialty && d.specialty !== specialty) return false;
      if (city && d.city !== city) return false;
      if (language && !(d.languages || []).includes(language)) return false;
      if (day !== null && !(d.availableDays || []).includes(day)) return false;
      return true;
    });
    if (sort === 'feeAsc') list.sort((a, b) => (a.fee || 0) - (b.fee || 0));
    else if (sort === 'feeDesc') list.sort((a, b) => (b.fee || 0) - (a.fee || 0));
    else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [doctors, search, specialty, city, language, day, sort]);

  const clear = () => {
    setSpecialty(null);
    setCity(null);
    setLanguage(null);
    setDay(null);
  };

  if (loading) return <Loading message="Buscando médicos..." />;

  const header = (
    <View>
      {error && <Banner type="error" message={error} />}
      <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar por nombre, especialidad o clínica" />
      <ChipGroup options={['Todas', ...SPECIALTIES]} value={specialty || 'Todas'} onChange={(v) => setSpecialty(v === 'Todas' || !v ? null : v)} scroll />
      <View style={styles.toolbar}>
        <Pressable
          onPress={() => setShowFilters((s) => !s)}
          style={styles.filterBtn}
          accessibilityRole="button"
          accessibilityLabel="Mostrar filtros"
        >
          <Ionicons name="options-outline" size={18} color={colors.primary} />
          <Text style={styles.filterText}>Filtros{activeFilters ? ` (${activeFilters})` : ''}</Text>
        </Pressable>
        <Button title="Ver mapa" icon="map-outline" variant="secondary" small onPress={() => router.push('/doctors-map')} />
      </View>
      {showFilters && (
        <View style={styles.filters}>
          <ChipGroup label="Ubicación" options={CITIES} value={city} onChange={setCity} scroll />
          <ChipGroup label="Idioma" options={LANGUAGES} value={language} onChange={setLanguage} scroll />
          <ChipGroup label="Disponibilidad" options={WEEK_DAYS.map((d) => ({ id: d.id, label: d.long }))} value={day} onChange={setDay} scroll />
          <ChipGroup label="Ordenar por" options={SORTS} value={sort} onChange={(v) => v && setSort(v)} scroll />
          {activeFilters > 0 && <Button title="Limpiar filtros" variant="ghost" small icon="close" onPress={clear} />}
        </View>
      )}
      <Text style={styles.count}>
        {filtered.length} médico(s) encontrado(s)
      </Text>
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.list}
      data={filtered}
      keyExtractor={(d) => d.uid}
      ListHeaderComponent={header}
      renderItem={({ item }) => <DoctorCard doctor={item} onPress={() => router.push(`/doctor/${item.uid}`)} />}
      refreshing={refreshing}
      onRefresh={refresh}
      keyboardShouldPersistTaps="handled"
      ListEmptyComponent={
        <EmptyState
          icon="search-outline"
          title="No encontramos médicos"
          message={doctors.length ? 'Prueba con otros filtros o términos de búsqueda.' : 'Aún no hay médicos registrados.'}
          action={activeFilters > 0 ? <Button title="Limpiar filtros" variant="outline" small onPress={clear} /> : null}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: spacing.sm },
  filterText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  filters: { backgroundColor: colors.white, borderRadius: 16, padding: spacing.md, marginBottom: spacing.md },
  count: { color: colors.muted, fontSize: 13, marginBottom: spacing.sm },
});
