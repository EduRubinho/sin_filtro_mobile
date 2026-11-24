import { request, ApiError, getBaseUrl } from './api.ts';
import type { Album, AlbumDetail, AlbumPhoto } from '../types/album.ts';
const id=(value:string)=>{if(!/^[1-9]\d*$/.test(value)) throw new ApiError('INVALID_INPUT','Identificador inválido.');return value;};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object';
export function isAlbum(v:unknown):v is Album {return object(v)&&typeof v.activityId==='string'&&/^[1-9]\d*$/.test(v.activityId)&&['title','locationName','endsAt'].every(k=>typeof v[k]==='string')&&['public','private'].includes(String(v.visibility))&&typeof v.photoCount==='number'&&typeof v.canUpload==='boolean'&&(v.coverId===null||typeof v.coverId==='string');}
export function isPhoto(v:unknown):v is AlbumPhoto {return object(v)&&['id','activityId','uploadedBy','createdAt'].every(k=>typeof v[k]==='string')&&(v.caption===null||typeof v.caption==='string')&&['sizeBytes','width','height'].every(k=>typeof v[k]==='number'&&Number.isFinite(v[k])&&Number(v[k])>=0);}
const invalid=()=>new ApiError('SERVER','Respuesta de álbum inválida.');
export async function listAlbums(token:string,mode:'mine'|'nearby',offset=0,point?:{latitude:number;longitude:number},radius=500) {
 const q=new URLSearchParams({mode,offset:String(offset)});
 if(mode==='nearby'){if(!point)throw new ApiError('INVALID_INPUT','Selecciona una ubicación.');q.set('lat',String(point.latitude));q.set('lng',String(point.longitude));q.set('radiusMeters',String(radius));}
 const data=await request(`/albums?${q}`,{token});if(!object(data)||!Array.isArray(data.albums)||!data.albums.every(isAlbum)||typeof data.hasMore!=='boolean')throw invalid();return data as {albums:Album[];hasMore:boolean};
}
export async function getAlbum(token:string,activityId:string,before?:string):Promise<AlbumDetail> {
 const data=await request(`/activities/${id(activityId)}/album${before?`?before=${id(before)}`:''}`,{token});
 if(!object(data)||!isAlbum(data.album)||!Array.isArray(data.photos)||!data.photos.every(isPhoto)||(data.nextCursor!==null&&typeof data.nextCursor!=='string'))throw invalid();return data as unknown as AlbumDetail;
}
export const photoSource=(token:string,photoId:string)=>({uri:`${getBaseUrl()}/photos/${id(photoId)}/content`,headers:{Authorization:`Bearer ${token}`},cache:'reload' as const});
/** Descarga autenticada por la misma red que la API; el visor nativo recibe solo bytes locales. */
export async function loadPhoto(token:string,photoId:string,signal:AbortSignal):Promise<string> {
 const source=photoSource(token,photoId);
 const response=await fetch(source.uri,{headers:source.headers,signal,cache:'no-store'});
 if(response.status===401)throw new ApiError('UNAUTHORIZED','Tu sesión venció. Inicia sesión nuevamente.');
 if(response.status===403)throw new ApiError('FORBIDDEN','No tienes acceso a esta foto.');
 if(response.status===404)throw new ApiError('NOT_FOUND','Esta foto ya no está disponible.');
 if(!response.ok)throw new ApiError('SERVER','No se pudo descargar la foto.');
 if(!response.headers.get('content-type')?.startsWith('image/jpeg'))throw new ApiError('SERVER','El servidor no devolvió una imagen válida.');
 // Evita el viaje al almacén nativo de Blob y de vuelta a JavaScript en Android.
 const bytes=new Uint8Array(await response.arrayBuffer());
 if(signal.aborted)throw new Error('Descarga cancelada.');
 const chunks:string[]=[];
 for(let offset=0;offset<bytes.length;offset+=32768){
  chunks.push(String.fromCharCode(...bytes.subarray(offset,offset+32768)));
 }
 return `data:image/jpeg;base64,${btoa(chunks.join(''))}`;
}
export const editPhoto=(token:string,photoId:string,caption:string)=>request(`/photos/${id(photoId)}`,{method:'PATCH',token,body:{caption}});
export const deletePhoto=(token:string,photoId:string)=>request(`/photos/${id(photoId)}`,{method:'DELETE',token});
/** Una clave estable por foto hace seguro reintentar si se perdió la respuesta. */
export function uploadPhoto(token:string,activityId:string,uri:string,uploadId:string,progress:(n:number)=>void):{promise:Promise<AlbumPhoto>;abort:()=>void} {
 const xhr=new XMLHttpRequest();
 const promise=new Promise<AlbumPhoto>((resolve,reject)=>{
  xhr.open('POST',`${getBaseUrl()}/activities/${id(activityId)}/album/photos`);
  xhr.setRequestHeader('Authorization',`Bearer ${token}`);xhr.setRequestHeader('Content-Type','image/jpeg');xhr.setRequestHeader('X-Upload-ID',uploadId);xhr.timeout=120000;
  xhr.upload.onprogress=e=>{if(e.lengthComputable)progress(Math.round(e.loaded/e.total*100));};
  xhr.onerror=xhr.ontimeout=xhr.onabort=()=>reject(new ApiError('NETWORK','No se completó la subida. Puedes reintentar.'));
  xhr.onload=()=>{try{const data=JSON.parse(xhr.responseText);if(xhr.status===201&&isPhoto(data.photo))resolve(data.photo);else reject(new ApiError(xhr.status===401?'UNAUTHORIZED':xhr.status===403?'FORBIDDEN':'SERVER',data.error?.message??'No se pudo subir la foto.'));}catch{reject(invalid());}};
  xhr.send({uri,type:'image/jpeg',name:'photo.jpg'} as unknown as XMLHttpRequestBodyInit);
 });return {promise,abort:()=>xhr.abort()};
}
