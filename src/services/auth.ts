import type { Credentials, Session, User } from '../types/auth.ts';
import { ApiError, request } from './api.ts';

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function isUser(value: unknown): value is User {
  return isObject(value) && typeof value.id === 'string' && typeof value.email === 'string';
}

export async function login({ email, password }: Credentials): Promise<Session> {
  const normalizedEmail = email.trim().toLowerCase();
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    normalizedEmail.length > 254 ||
    !password ||
    password.length > 1024
  ) {
    throw new ApiError('INVALID_INPUT', 'Ingresa un correo válido y tu contraseña.');
  }

  // La contraseña se envía tal cual: los espacios pueden formar parte de ella.
  const data = await request('/auth/login', {
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
