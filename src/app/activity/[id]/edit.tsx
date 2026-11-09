import { useLocalSearchParams } from 'expo-router';
import { PublishActivityScreen } from '../../../components/activities/PublishActivityScreen';

export default function EditActivityRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PublishActivityScreen activityId={typeof id === 'string' ? id : ''} />;
}
