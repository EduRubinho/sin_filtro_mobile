import { useLocalSearchParams } from 'expo-router';
import { ActivityDetailScreen } from '../../components/activities/ActivityDetailScreen';

export default function ActivityRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ActivityDetailScreen activityId={typeof id === 'string' ? id : ''} />;
}
