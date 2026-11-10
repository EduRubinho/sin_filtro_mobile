import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';

export default function Index() {
  const { session } = useAuth();

  if (!session) return <Redirect href="/login" />;
  if (session.user.role === 'admin') return <Redirect href="/admin" />;
  if (!session.user.profile.completed) return <Redirect href="/onboarding" />;
  return <Redirect href="/map" />;
}
