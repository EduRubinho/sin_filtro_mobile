import type { Credentials, Session, User, ProfileInput, Category } from '../types/auth.ts';
import { ApiError, request } from './api.ts';

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function isUser(value: unknown): value is User {
  return isObject(value) && typeof value.id === 'string' && /^[1-9][0-9]*$/.test(value.id) &&
    typeof value.email === 'string' && (value.role === 'user' || value.role === 'admin') &&
    isObject(value.profile) && (value.profile.displayName === null || typeof value.profile.displayName === 'string') &&
    typeof value.profile.bio === 'string' && typeof value.profile.completed === 'boolean' &&
    Array.isArray(value.profile.interestIds) && value.profile.interestIds.every(id => typeof id === 'string' && /^[1-9][0-9]*$/.test(id));
}

async function startSession({ email, password }: Credentials, registration = false): Promise<Session> {
  const normalizedEmail = email.trim().toLowerCase();
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    normalizedEmail.length > 254 ||
    password.length < 8 ||
    password.length > 64
  ) {
    throw new ApiError('INVALID_INPUT', 'Ingresa un correo válido y una contraseña de entre 8 y 64 caracteres.');
  }

  // La contraseña se envía tal cual: los espacios pueden formar parte de ella.
  const data = await request(registration ? '/auth/register' : '/auth/login', {
    method: 'POST',
    body: { email: normalizedEmail, password },
  });

  if (
    !isObject(data) ||
    !isUser(data.user) ||
    typeof data.token !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(data.token) ||
    typeof data.expiresAt !== 'string' ||
    !Number.isFinite(Date.parse(data.expiresAt)) ||
    Date.parse(data.expiresAt) <= Date.now()
  ) {
    throw new ApiError('SERVER', 'El servidor devolvió una sesión inválida.');
  }

  return { token: data.token, expiresAt: data.expiresAt, user: data.user };
}

export async function getCurrentUser(token: string): Promise<User> {
  const data = await request('/auth/me', { token });
  if (!isObject(data) || !isUser(data.user)) {
    throw new ApiError('SERVER', 'El servidor devolvió un usuario inválido.');
  }
  return data.user;
}

export async function logout(token: string): Promise<void> {
  await request('/auth/logout', { method: 'POST', token });
}

export function login(credentials: Credentials) { return startSession(credentials); }
export function register(credentials: Credentials) { return startSession(credentials, true); }

export async function updateProfile(token: string, profile: ProfileInput): Promise<User> {
  const data = await request('/auth/profile', { method: 'PATCH', token, body: profile });
  if (!isObject(data) || !isUser(data.user)) throw new ApiError('SERVER', 'El servidor devolvió un perfil inválido.');
  return data.user;
}

export async function getCategories(): Promise<Category[]> {
  const data = await request('/categories');
  if (!isObject(data) || !Array.isArray(data.categories) || !data.categories.every(value =>
    isObject(value) && typeof value.id === 'string' && /^[1-9][0-9]*$/.test(value.id) &&
    typeof value.name === 'string' && typeof value.slug === 'string')) {
    throw new ApiError('SERVER', 'No se pudieron leer los intereses.');
  }
  return data.categories;
}
