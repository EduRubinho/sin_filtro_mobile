export interface Album { activityId:string; title:string; locationName:string; endsAt:string; visibility:'public'|'private'; photoCount:number; coverId:string|null; canUpload:boolean }
export interface AlbumPhoto { id:string; activityId:string; uploadedBy:string; caption:string|null; createdAt:string; sizeBytes:number; width:number; height:number }
export interface AlbumDetail {album:Album;photos:AlbumPhoto[];nextCursor:string|null}
