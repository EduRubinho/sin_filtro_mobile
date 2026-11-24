import { useLocalSearchParams } from 'expo-router';
import { UserProfileScreen } from '../../components/users/UserProfileScreen';
export default function UserProfileRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <UserProfileScreen userId={typeof id === 'string' ? id : ''} />;
}
