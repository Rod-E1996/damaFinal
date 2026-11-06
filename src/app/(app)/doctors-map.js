import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useDoctors } from '@/hooks/useDoctors';
import { Banner, ChipGroup, Loading } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { SPECIALTIES } from '@/lib/constants';

// Coordenadas aproximadas de las ciudades, para médicos sin ubicación exacta.
const CITY_COORDS = {
  'San Salvador': { latitude: 13.6929, longitude: -89.2182 },
  'Santa Tecla': { latitude: 13.6769, longitude: -89.2797 },
  'Antiguo Cuscatlán': { latitude: 13.6732, longitude: -89.2449 },
  Soyapango: { latitude: 13.7104, longitude: -89.1399 },
  'Santa Ana': { latitude: 13.9946, longitude: -89.5597 },
  'San Miguel': { latitude: 13.4834, longitude: -88.1834 },
  Sonsonate: { latitude: 13.7189, longitude: -89.7242 },
  'La Libertad': { latitude: 13.4883, longitude: -89.3222 },
};

const DEFAULT_REGION = { latitude: 13.6929, longitude: -89.2182, latitudeDelta: 0.35, longitudeDelta: 0.35 };

function distanceKm(a, b) {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) * Math.cos((b.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function DoctorsMapScreen() {
  const { doctors, loading, error } = useDoctors();
  const mapRef = useRef(null);
  const [userLoc, setUserLoc] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [specialty, setSpecialty] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        return;
      }
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setUserLoc(coords);
        mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.2, longitudeDelta: 0.2 }, 600);
      } catch {
        setPermissionDenied(true);
      }
    })();
  }, []);

  const markers = useMemo(
    () =>
      doctors
        .filter((d) => !specialty || d.specialty === specialty)
        .map((d, i) => {
          let coord = d.location || CITY_COORDS[d.city];
          if (!coord) return null;
          // Pequeño desplazamiento para que no se encimen médicos de la misma ciudad.
          if (!d.location) coord = { latitude: coord.latitude + ((i % 5) - 2) * 0.004, longitude: coord.longitude + ((i % 3) - 1) * 0.004 };
          const dist = userLoc ? distanceKm(userLoc, coord) : null;
          return { doctor: d, coord, dist };
        })
        .filter(Boolean)
        .sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0)),
    [doctors, specialty, userLoc]
  );

  if (loading) return <Loading message="Cargando mapa..." />;

  return (
    <View style={{ flex: 1 }}>
      <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={DEFAULT_REGION} showsUserLocation={!!userLoc} showsMyLocationButton>
        {markers.map(({ doctor, coord, dist }) => (
          <Marker key={doctor.uid} coordinate={coord} pinColor={colors.primary}>
            <Callout onPress={() => router.push(`/doctor/${doctor.uid}`)}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{doctor.name}</Text>
                <Text style={styles.calloutText}>{doctor.specialty}</Text>
                <Text style={styles.calloutText}>{doctor.clinic}</Text>
                {dist !== null && <Text style={styles.calloutText}>A {dist.toFixed(1)} km de ti</Text>}
                <Text style={styles.calloutLink}>Ver perfil ›</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
      <View style={styles.overlay}>
        <ChipGroup options={['Todas', ...SPECIALTIES]} value={specialty || 'Todas'} onChange={(v) => setSpecialty(v === 'Todas' || !v ? null : v)} scroll />
        {permissionDenied && <Banner type="warning" message="Activa la ubicación para ver qué médicos están más cerca de ti." />}
        {error && <Banner type="error" message={error} />}
      </View>
      {userLoc && markers[0] && (
        <View style={styles.nearest}>
          <Text style={styles.nearestText}>
            Más cercano: {markers[0].doctor.name} ({markers[0].dist.toFixed(1)} km)
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: spacing.sm, left: spacing.md, right: spacing.md },
  callout: { width: 200, padding: 4 },
  calloutTitle: { fontWeight: '700', fontSize: 14, color: colors.text },
  calloutText: { fontSize: 12, color: colors.muted },
  calloutLink: { fontSize: 13, color: colors.primary, fontWeight: '700', marginTop: 4 },
  nearest: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    elevation: 3,
  },
  nearestText: { color: colors.text, fontWeight: '600', textAlign: 'center' },
});
