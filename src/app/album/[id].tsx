import { useLocalSearchParams } from 'expo-router';
import { AlbumScreen } from '../../components/memories/AlbumScreen';
export default function AlbumRoute(){const {id}=useLocalSearchParams<{id:string}>();return <AlbumScreen key={id} activityId={typeof id==='string'?id:''}/>;}
