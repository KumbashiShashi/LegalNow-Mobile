import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function CitizenTabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0066CC',
        tabBarInactiveTintColor: '#666666',
        headerShown: true,
        headerStyle: { backgroundColor: '#F8F9FA' },
        headerTitleStyle: { fontWeight: 'bold', color: '#1A1A1A' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color as any} />
          ),
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Appointments',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color as any} />
          ),
        }}
      />
      <Tabs.Screen
        name="submit"
        options={{
          title: 'Submit',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color as any} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color as any} />
          ),
        }}
      />
      <Tabs.Screen
        name="advocates"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="service-providers"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="subscription"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
