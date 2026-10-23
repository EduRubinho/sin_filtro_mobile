import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../hooks/useAuth';

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
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
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="publish" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
