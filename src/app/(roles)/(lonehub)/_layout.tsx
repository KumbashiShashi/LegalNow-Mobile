import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NotificationBell } from '../../../components/shared/NotificationBell';

export default function LOneHubTabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0066CC',
        tabBarInactiveTintColor: '#666666',
        headerShown: true,
        headerStyle: { backgroundColor: '#F8F9FA' },
        headerTitleStyle: { fontWeight: 'bold', color: '#1A1A1A' },
        headerRight: () => <NotificationBell />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hub Console',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business-outline" size={size} color={color as any} />
          ),
        }}
      />
      <Tabs.Screen
        name="meetings"
        options={{
          title: 'Hub Meetings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color as any} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color as any} />
          ),
        }}
      />
    </Tabs>
  );
}
