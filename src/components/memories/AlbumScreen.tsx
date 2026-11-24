import { AlbumImage } from './AlbumImage';
import { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Picker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useAuth } from '../../hooks/useAuth';
import { deletePhoto, editPhoto, getAlbum, uploadPhoto } from '../../services/albums';
import { ApiError } from '../../services/api';
import type { AlbumDetail, AlbumPhoto } from '../../types/album';
import { Button } from '../ui/Button';
import { colors } from '../ui/theme';
interface Pending { key:string; uri:string; caption:string; status:'pending'|'uploading'|'failed'|'done'; progress:number; photoId?:string; error?:string }
export function AlbumScreen({activityId}:{activityId:string}) {
 const {session,expireSession}=useAuth();const token=session?.token??'';
 const [gridWidth,setGridWidth]=useState(0);
 const tileSize=Math.max(1,Math.floor((gridWidth-16)/3));
 const [detail,setDetail]=useState<AlbumDetail|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 const [queue,setQueue]=useState<Pending[]>([]);const [selected,setSelected]=useState<AlbumPhoto|null>(null);const [caption,setCaption]=useState('');
 const active=useRef(false);const locked=useRef(false);const abort=useRef<(()=>void)|null>(null);
 const fail=useCallback((e:unknown)=>{if(e instanceof ApiError&&e.code==='UNAUTHORIZED')expireSession();if(active.current){setError(e instanceof Error?e.message:'No se pudo completar la operación.');if(e instanceof ApiError&&['UNAUTHORIZED','FORBIDDEN','NOT_FOUND'].includes(e.code)){setDetail(null);setSelected(null);}}},[expireSession]);
 const load=useCallback(async(before?:string)=>{const data=await getAlbum(token,activityId,before);if(active.current)setDetail(old=>before&&old?{...data,photos:[...old.photos,...data.photos.filter(p=>!old.photos.some(v=>v.id===p.id))]}:data);},[token,activityId]);
 useFocusEffect(useCallback(()=>{active.current=true;setError('');setBusy(false);setQueue(old=>old.map(p=>p.status==='uploading'?{...p,status:'failed'}:p));void load().catch(e=>{setDetail(null);fail(e);});return()=>{active.current=false;abort.current?.();};},[load,fail]));
 async function run(action:()=>Promise<void>) {if(locked.current)return;locked.current=true;setBusy(true);setError('');try{await action();}catch(e){fail(e);}finally{locked.current=false;if(active.current)setBusy(false);}}
 async function pick(camera:boolean) {await run(async()=>{
  if(camera){const permission=await Picker.requestCameraPermissionsAsync();if(!permission.granted)throw new Error('Permite acceso a la cámara para tomar una foto.');}
  const result=camera?await Picker.launchCameraAsync({mediaTypes:['images'],quality:1}):await Picker.launchImageLibraryAsync({mediaTypes:['images'],allowsMultipleSelection:true,selectionLimit:5,quality:1});
  if(result.canceled)return;
  const pending:Pending[]=[];
  for(const asset of result.assets.slice(0,5)) {
   const context=ImageManipulator.manipulate(asset.uri);
   if(Math.max(asset.width,asset.height)>1600)context.resize(asset.width>=asset.height?{width:1600}:{height:1600});
   const rendered=await context.renderAsync();const file=await rendered.saveAsync({format:SaveFormat.JPEG,compress:0.8});
   pending.push({key:`${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`,uri:file.uri,caption:'',status:'pending',progress:0});
  }
  if(active.current)setQueue(pending);
 });}
 function patch(key:string,values:Partial<Pending>){if(active.current)setQueue(old=>old.map(p=>p.key===key?{...p,...values}:p));}
 async function send(){await run(async()=>{
  for(const item of queue.filter(p=>p.status!=='done')) {
   if(!active.current)break;
   patch(item.key,{status:'uploading',error:undefined});
   try {
    let photoId=item.photoId;
    if(!photoId){const job=uploadPhoto(token,activityId,item.uri,item.key,n=>patch(item.key,{progress:n}));abort.current=job.abort;photoId=(await job.promise).id;patch(item.key,{photoId});}
    if(item.caption.trim())await editPhoto(token,photoId,item.caption);
    patch(item.key,{status:'done',progress:100});
   }catch(e){patch(item.key,{status:'failed',error:e instanceof Error?e.message:'Error de subida'});if(e instanceof ApiError&&e.code==='UNAUTHORIZED'){expireSession();break;}}
   finally{abort.current=null;}
  }
  if(active.current)await load();
 });}
 const own=selected?.uploadedBy===session?.user.id;
 return <SafeAreaView style={s.screen}><ScrollView removeClippedSubviews={false} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
  <Button title={selected?'‹ Volver al álbum':'‹ Volver'} variant="secondary" disabled={busy} onPress={()=>selected?setSelected(null):router.back()}/>
  {error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  {!detail&&!error&&<ActivityIndicator color={colors.ink}/>}
  {!detail&&error&&<Button title="Reintentar" onPress={()=>{void run(load);}}/>}
  {detail&&<><Text style={s.title}>{detail.album.title}</Text><Text style={s.note}>{detail.album.visibility==='private'?'Álbum privado · Solo asistentes validados':'Álbum público'} · {detail.album.photoCount} fotos</Text>
   {selected?<>
    <AlbumImage token={token} photoId={selected.id} fit="contain" style={s.full}/>
    <Text style={s.note}>{new Date(selected.createdAt).toLocaleString('es-PE')} · {(selected.sizeBytes/1024).toFixed(0)} KB</Text>
    {own?<><TextInput style={s.input} value={caption} onChangeText={setCaption} maxLength={500} multiline placeholder="Descripción opcional" editable={!busy}/>
      <Button title="Guardar descripción" disabled={busy||!detail.album.canUpload} onPress={()=>{void run(async()=>{await editPhoto(token,selected.id,caption);setSelected({...selected,caption});await load();});}}/>
      <Button title="Eliminar mi foto" variant="secondary" disabled={busy} onPress={()=>Alert.alert('Eliminar foto','Se quitará del álbum y del almacenamiento.',[{text:'Cancelar',style:'cancel'},{text:'Eliminar',style:'destructive',onPress:()=>{void run(async()=>{await deletePhoto(token,selected.id);setSelected(null);await load();});}}])}/>
    </>:<Text style={s.note}>{selected.caption||'Sin descripción'}</Text>}
   </>:<>
    {detail.album.canUpload?<>
      <Text style={s.note}>Tu asistencia está confirmada. Comparte hasta 5 fotos por selección.</Text>
      {queue.length===0||queue.every(p=>p.status==='done')?<><Button title="Añadir fotos de la galería" disabled={busy} onPress={()=>{void pick(false);}}/><Button title="Tomar foto" variant="secondary" disabled={busy} onPress={()=>{void pick(true);}}/></>:null}
      {queue.map(item=><View key={item.key} style={s.pending}><Image source={{uri:item.uri}} style={s.preview}/><View style={s.pendingCopy}>
        <Text style={s.note}>{item.status==='done'?'Subida completada':item.status==='uploading'?`${item.progress}% · Procesando…`:item.status==='failed'?'No se completó':'Lista para subir'}</Text>
        {item.status!=='done'&&<TextInput style={s.input} placeholder="Descripción opcional" maxLength={500} value={item.caption} editable={!busy} onChangeText={value=>patch(item.key,{caption:value})}/>}
        {item.error&&<Text style={s.error}>{item.error}</Text>}
        {!busy&&item.status!=='done'&&<Pressable accessibilityRole="button" onPress={()=>setQueue(old=>old.filter(p=>p.key!==item.key))}><Text style={s.link}>Quitar de la selección</Text></Pressable>}
      </View></View>)}
      {queue.some(p=>p.status!=='done')&&<Button title={busy?'Subiendo…':'Subir / reintentar pendientes'} disabled={busy} onPress={()=>{void send();}}/>}
    </>:<Text style={s.note}>Puedes ver las fotos. Subir requiere asistencia validada durante el encuentro.</Text>}
    <View style={s.grid} onLayout={event=>setGridWidth(event.nativeEvent.layout.width)}>{gridWidth>0&&detail.photos.map(photo=><Pressable key={photo.id} accessibilityRole="button" accessibilityLabel="Abrir foto" style={[s.tile,{width:tileSize,height:tileSize}]} onPress={()=>{setSelected(photo);setCaption(photo.caption??'');}}><AlbumImage token={token} photoId={photo.id} style={{width:tileSize,height:tileSize}}/></Pressable>)}</View>
    {!detail.photos.length&&<Text style={s.empty}>Aún no hay fotos en este álbum.</Text>}
    {detail.nextCursor&&<Button title="Ver más fotos" disabled={busy} onPress={()=>{void run(()=>load(detail.nextCursor??undefined));}}/>}
    <Button title="Actualizar álbum" variant="secondary" disabled={busy} onPress={()=>{void run(load);}}/>
   </>}
  </>}
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({screen:{flex:1,backgroundColor:colors.background},content:{padding:20,gap:14},title:{fontSize:30,fontWeight:'900',color:colors.ink},note:{color:colors.muted,lineHeight:21},error:{color:colors.danger,lineHeight:20},grid:{flexDirection:'row',flexWrap:'wrap',gap:8},tile:{borderRadius:12,overflow:'hidden',backgroundColor:colors.softGreen},full:{width:'100%',height:360,backgroundColor:colors.softGreen,borderRadius:18},pending:{flexDirection:'row',gap:12,padding:12,backgroundColor:colors.surface,borderRadius:16},preview:{width:85,height:100,borderRadius:10},pendingCopy:{flex:1,gap:6},input:{borderWidth:1,borderColor:colors.border,borderRadius:12,padding:12,color:colors.text,backgroundColor:colors.surface,minHeight:48},link:{color:colors.coral,fontWeight:'700'},empty:{textAlign:'center',color:colors.muted,paddingVertical:32}});
