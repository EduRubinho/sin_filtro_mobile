import { request, ApiError } from './api.ts';
export interface PublicProfile { id: string; displayName: string; bio: string; interests: { id: string; name: string }[] }
export async function getPublicProfile(token: string, id: string): Promise<PublicProfile> {
  if (!/^[1-9]\d*$/.test(id)) throw new ApiError('INVALID_INPUT', 'Usuario inválido.');
  const data = await request(`/profiles/${id}`, { token }) as { profile?: PublicProfile } | null;
  const p = data?.profile;
  if (!p || p.id !== id || typeof p.displayName !== 'string' || typeof p.bio !== 'string' || !Array.isArray(p.interests) || !p.interests.every(i => i && typeof i.id === 'string' && typeof i.name === 'string')) throw new ApiError('SERVER', 'Perfil inválido.');
  return p;
}
