import { useLocalSearchParams } from 'expo-router';
import { ActivityChatScreen } from '../../../components/activities/ActivityChatScreen';

export default function ActivityChatRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ActivityChatScreen activityId={typeof id === 'string' ? id : ''} />;
}
