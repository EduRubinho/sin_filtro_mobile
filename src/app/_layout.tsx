import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../hooks/useAuth';

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { session } = useAuth();

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="index" />
          <Stack.Screen name="register" />
        </Stack.Protected>
        <Stack.Protected guard={session?.user.role === 'admin'}>
          <Stack.Screen name="admin" />
        </Stack.Protected>
        <Stack.Protected guard={session?.user.role === 'user' && !session.user.profile.completed}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={session?.user.role === 'user' && session.user.profile.completed}>
          <Stack.Screen name="map" />
          <Stack.Screen name="profile" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
