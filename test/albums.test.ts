import assert from 'node:assert/strict';
import { afterEach,beforeEach,mock,test } from 'node:test';
import { listAlbums,getAlbum,editPhoto,deletePhoto,photoSource,uploadPhoto } from '../src/services/albums.ts';
const original=process.env.EXPO_PUBLIC_API_URL;
beforeEach(()=>{process.env.EXPO_PUBLIC_API_URL='https://api.example.com';});
afterEach(()=>{mock.restoreAll();if(original===undefined)delete process.env.EXPO_PUBLIC_API_URL;else process.env.EXPO_PUBLIC_API_URL=original;});
const album={activityId:'1',title:'Vóley',locationName:'Tacna',endsAt:'2026-11-01T12:00:00Z',visibility:'private',photoCount:1,coverId:'2',canUpload:true};
const photo={id:'2',activityId:'1',uploadedBy:'3',caption:null,createdAt:'2026-11-01T12:00:00Z',sizeBytes:300,width:10,height:10};
test('recuerdos consulta radio y paginación; fotos requieren token en listado y contenido',async()=>{
 const calls:{url:string;init?:RequestInit}[]=[];
 mock.method(globalThis,'fetch',async(url:unknown,init?:RequestInit)=>{calls.push({url:String(url),init});if(init?.method==='PATCH'||init?.method==='DELETE')return new Response(null,{status:204});return Response.json(String(url).includes('/albums?')?{albums:[album],hasMore:false}:{album,photos:[photo],nextCursor:null});});
 assert.equal((await listAlbums('token','nearby',20,{latitude:-18,longitude:-70},1000)).albums[0].title,'Vóley');
 assert.match(calls[0].url,/mode=nearby&offset=20&lat=-18&lng=-70&radiusMeters=1000/);
 assert.equal((await getAlbum('token','1','3')).photos.length,1);
 await editPhoto('token','2','Nuevo');await deletePhoto('token','2');
 assert.deepEqual(JSON.parse(String(calls[2].init?.body)),{caption:'Nuevo'});
 assert.deepEqual(photoSource('token','2').headers,{Authorization:'Bearer token'});
 assert.throws(()=>photoSource('token','../secret'));await assert.rejects(listAlbums('token','nearby'));
 mock.method(globalThis,'fetch',async()=>Response.json({album:{},photos:[]}));await assert.rejects(getAlbum('token','1'),{code:'SERVER'});
});
test('subida conserva clave de reintento, token y progreso sin enviar identidad del autor',async()=>{
 const originalXHR=globalThis.XMLHttpRequest;let request:FakeXHR;
 class FakeXHR {headers:Record<string,string>={};upload:{onprogress?:(e:{lengthComputable:boolean;loaded:number;total:number})=>void}={};status=201;responseText=JSON.stringify({photo});timeout=0;onload?:()=>void;onerror?:()=>void;ontimeout?:()=>void;onabort?:()=>void;
 constructor(){request=this;}open(method:string,url:string){assert.equal(method,'POST');assert.match(url,/activities\/1\/album\/photos$/);}setRequestHeader(k:string,v:string){this.headers[k]=v;}send(){this.upload.onprogress?.({lengthComputable:true,loaded:50,total:100});queueMicrotask(()=>this.onload?.());}abort(){this.onabort?.();}}
 globalThis.XMLHttpRequest=FakeXHR as unknown as typeof XMLHttpRequest;
 try{let progress=0;const result=await uploadPhoto('token','1','file:///photo.jpg','stable-upload-key-1',n=>{progress=n;}).promise;assert.equal(result.id,'2');assert.equal(progress,50);assert.equal(request!.headers['X-Upload-ID'],'stable-upload-key-1');assert.equal(request!.headers.Authorization,'Bearer token');}finally{globalThis.XMLHttpRequest=originalXHR;}
});

test('fotos: descarga binaria envía Bearer, rechaza 401/403 y solo acepta JPEG',async()=>{
 const {loadPhoto}=await import('../src/services/albums.ts');
 const controller=new AbortController();let calls=0;
 mock.method(globalThis,'fetch',async(url:unknown,init?:RequestInit)=>{
  calls++;assert.equal(String(url),'https://api.example.com/photos/2/content');
  assert.deepEqual(init?.headers,{Authorization:'Bearer private-session'});assert.equal(init?.cache,'no-store');
  return new Response(null,{status:401});
 });
 await assert.rejects(loadPhoto('private-session','2',controller.signal),{code:'UNAUTHORIZED'});assert.equal(calls,1);
 mock.method(globalThis,'fetch',async()=>new Response(null,{status:403}));
 await assert.rejects(loadPhoto('private-session','2',controller.signal),{code:'FORBIDDEN'});
 mock.method(globalThis,'fetch',async()=>Response.json({error:'not a photo'}));
 await assert.rejects(loadPhoto('private-session','2',controller.signal),{code:'SERVER'});
 for(const size of [3,32768,32769,70000]) {
  const bytes=Uint8Array.from({length:size},(_,i)=>i%256);
  mock.method(globalThis,'fetch',async()=>new Response(bytes,{headers:{'Content-Type':'image/jpeg'}}));
  assert.equal(await loadPhoto('private-session','2',controller.signal),`data:image/jpeg;base64,${Buffer.from(bytes).toString('base64')}`);
 }
 controller.abort();
 await assert.rejects(loadPhoto('private-session','2',controller.signal),/cancelada/);
});
