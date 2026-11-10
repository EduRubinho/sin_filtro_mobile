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
  // Redirige al destino permitido sin montar la ruta vacía `/` entre pantallas.
  const sessionDestination = !session
    ? '/login'
    : session.user.role === 'admin'
      ? '/admin'
      : session.user.profile.completed ? '/map' : '/onboarding';

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={!session} redirectTo={sessionDestination}>
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
        </Stack.Protected>
        <Stack.Protected guard={session?.user.role === 'admin'} redirectTo={sessionDestination}>
          <Stack.Screen name="admin" />
        </Stack.Protected>
        <Stack.Protected guard={session?.user.role === 'user' && !session.user.profile.completed} redirectTo={sessionDestination}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={session?.user.role === 'user' && session.user.profile.completed} redirectTo={sessionDestination}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="publish" />
          <Stack.Screen name="activity/[id]" />
          <Stack.Screen name="activity/[id]/edit" />
          <Stack.Screen name="activity/[id]/chat" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
