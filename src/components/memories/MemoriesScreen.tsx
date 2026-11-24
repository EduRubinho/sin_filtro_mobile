import { AlbumImage } from './AlbumImage';
import { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useCurrentLocation } from '../../hooks/useCurrentLocation';
import { listAlbums } from '../../services/albums';
import { ApiError } from '../../services/api';
import type { Album } from '../../types/album';
import { Button } from '../ui/Button';
import { Choice } from '../ui/FormControls';
import { colors } from '../ui/theme';
import { LocationPicker, type SelectedLocation } from '../ui/LocationPicker';
import { BrandMark } from '../ui/BrandMark';
export function MemoriesScreen() {
 const {session,expireSession}=useAuth();const token=session?.token??'';
 const [mode,setMode]=useState<'mine'|'nearby'>('mine');const [radius,setRadius]=useState(500);const [point,setPoint]=useState<SelectedLocation|null>(null);
 const {position,locate,locating,error:gpsError}=useCurrentLocation();
 const [albums,setAlbums]=useState<Album[]>([]);const [more,setMore]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const generation=useRef(0);const lock=useRef(false);
 const center=point??position;
 const load=useCallback(async(offset=0)=>{
  const version=++generation.current;lock.current=true;setBusy(true);setError('');
  try {const data=await listAlbums(token,mode,offset,center??undefined,radius);if(version===generation.current){setAlbums(old=>offset?[...old,...data.albums.filter(a=>!old.some(b=>a.activityId===b.activityId))]:data.albums);setMore(data.hasMore);}}
  catch(e){if(version===generation.current){if(e instanceof ApiError&&e.code==='UNAUTHORIZED')expireSession();setError(e instanceof Error?e.message:'No se pudieron cargar los recuerdos.');}}
  finally{if(version===generation.current){setBusy(false);lock.current=false;}}
 },[token,mode,center,radius,expireSession]);
 useFocusEffect(useCallback(()=>{setAlbums([]);setMore(false);setError('');setBusy(false);if(mode==='mine'||center)void load();return()=>{generation.current++;lock.current=false;};},[load,mode,center]));
 return <SafeAreaView style={s.screen} edges={['top','left','right']}><ScrollView contentContainerStyle={s.content}>
  <BrandMark compact/><Text style={s.title}>Recuerdos</Text><Text style={s.note}>Los momentos de tus encuentros.</Text>
  <View style={s.row}><Choice label="Mis recuerdos" selected={mode==='mine'} onPress={()=>setMode('mine')}/><Choice label="Cercanos" selected={mode==='nearby'} onPress={()=>setMode('nearby')}/></View>
  {mode==='nearby'&&<><View style={s.row}>{[500,1000,5000].map(r=><Choice key={r} label={r<1000?`${r} m`:`${r/1000} km`} selected={radius===r} onPress={()=>setRadius(r)}/>)}</View>
   <Button title={locating?'Buscando GPS…':'Usar mi ubicación'} disabled={locating} variant="secondary" onPress={()=>{setPoint(null);void locate();}}/>
   <LocationPicker value={center} onChange={setPoint}/>{gpsError&&<Text style={s.error}>{gpsError}</Text>}</>}
  {error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  {busy&&<ActivityIndicator color={colors.ink}/>}
  {!busy&&!error&&!albums.length&&<Text style={s.empty}>{mode==='nearby'&&!center?'Elige un punto o usa el GPS para buscar.':mode==='mine'?'Tus actividades finalizadas con asistencia confirmada aparecerán aquí.':'No hay álbumes accesibles en este radio.'}</Text>}
  {albums.map(album=><Pressable key={album.activityId} accessibilityRole="button" onPress={()=>router.push(`/album/${album.activityId}`)} style={s.card}>
   {album.coverId?<AlbumImage token={token} photoId={album.coverId} style={s.cover}/>:<View style={[s.cover,s.placeholder]}><Text style={s.note}>Aún sin fotos</Text></View>}
   <View style={s.copy}><Text style={s.cardTitle}>{album.title}</Text><Text style={s.note}>{album.locationName} · {new Date(album.endsAt).toLocaleDateString('es-PE')}</Text><Text style={s.badge}>{album.photoCount} fotos · {album.visibility==='private'?'Privado':'Público'}</Text></View>
  </Pressable>)}
  {more&&<Button title="Cargar más" disabled={busy} onPress={()=>{if(!lock.current)void load(albums.length);}}/>}
  {(mode==='mine'||center)&&<Button title="Actualizar" variant="secondary" disabled={busy} onPress={()=>{void load();}}/>}
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({screen:{flex:1,backgroundColor:colors.background},content:{padding:22,gap:14},title:{fontSize:34,fontWeight:'900',color:colors.ink},note:{color:colors.muted,fontSize:14,lineHeight:21},row:{flexDirection:'row',gap:8,flexWrap:'wrap'},card:{borderRadius:22,overflow:'hidden',backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},cover:{width:'100%',height:180},placeholder:{alignItems:'center',justifyContent:'center',backgroundColor:colors.softGreen},copy:{padding:16,gap:6},cardTitle:{fontSize:20,fontWeight:'800',color:colors.ink},badge:{color:colors.ink,fontWeight:'700'},error:{color:colors.danger},empty:{color:colors.muted,textAlign:'center',paddingVertical:40,lineHeight:24}});
