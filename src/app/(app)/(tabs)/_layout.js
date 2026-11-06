import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme';

export const unstable_settings = { initialRouteName: 'index' };

const icon = (name) =>
  function TabIcon({ color, size, focused }) {
    return <Ionicons name={focused ? name : `${name}-outline`} size={size} color={color} />;
  };

export default function TabsLayout() {
  const { isDoctor } = useAuth();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        headerStyle: { backgroundColor: colors.white },
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', headerShown: false, tabBarIcon: icon('home') }} />
      <Tabs.Screen
        name="doctors"
        options={{ title: 'Médicos', tabBarIcon: icon('search'), href: isDoctor ? null : undefined }}
      />
      <Tabs.Screen name="appointments" options={{ title: isDoctor ? 'Agenda' : 'Citas', tabBarIcon: icon('calendar') }} />
      <Tabs.Screen name="chats" options={{ title: 'Mensajes', tabBarIcon: icon('chatbubbles') }} />
      <Tabs.Screen
        name="forum"
        options={{ title: 'Foro', tabBarIcon: icon('people'), href: isDoctor ? undefined : null }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
