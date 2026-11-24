import { useLocalSearchParams } from 'expo-router';
import { ActivityParticipantsScreen } from '../../../components/activities/ActivityParticipantsScreen';

export default function ParticipantsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ActivityParticipantsScreen activityId={typeof id === 'string' ? id : ''} />;
}
