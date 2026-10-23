type ApiErrorCode =
  | 'INVALID_INPUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'NETWORK'
  | 'SERVER'
  | 'CONFIGURATION';

export class ApiError extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

const HTTP_ERRORS: Record<number, [ApiErrorCode, string]> = {
  400: ['INVALID_INPUT', 'Revisa los datos ingresados.'],
  403: ['FORBIDDEN', 'No tienes permiso para realizar esta acción.'],
  409: ['CONFLICT', 'No se pudo completar la operación por un conflicto con los datos.'],
  404: ['NOT_FOUND', 'El registro ya no está disponible.'],
  401: ['UNAUTHORIZED', 'Correo o contraseña incorrectos, o sesión vencida.'],
  429: ['RATE_LIMITED', 'Demasiados intentos. Inténtalo de nuevo en 15 minutos.'],
};

function getBaseUrl(): string {
  try {
    const url = new URL(process.env.EXPO_PUBLIC_API_URL ?? '');
    const allowHttp = typeof __DEV__ !== 'undefined' && __DEV__;
    const validProtocol = url.protocol === 'https:' || (allowHttp && url.protocol === 'http:');

    if (!validProtocol || url.username || url.password || url.search || url.hash) {
      throw new Error('Invalid API URL');
    }

    return url.toString().replace(/\/$/, '');
  } catch {
    throw new ApiError(
      'CONFIGURATION',
      'Configura EXPO_PUBLIC_API_URL con la dirección del backend (HTTPS fuera de desarrollo).',
    );
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  token?: string;
  body?: unknown;
}

/** Peticiones JSON con timeout; las respuestas se validan en cada servicio. */
export async function request(path: string, { method = 'GET', token, body }: RequestOptions = {}): Promise<unknown> {
  const baseUrl = getBaseUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const httpError = HTTP_ERRORS[response.status];
    if (httpError) {
      let message = httpError[1];
      if ([400, 404, 409].includes(response.status)) {
        const data = await response.json().catch(() => null);
        if (typeof data?.error?.message === 'string') message = data.error.message;
      }
      throw new ApiError(httpError[0], message);
    }
    if (!response.ok) throw new ApiError('SERVER', 'El servidor no pudo completar la solicitud.');
    if (response.status === 204) return;

    try {
      return await response.json();
    } catch {
      throw new ApiError('SERVER', 'El servidor devolvió una respuesta inválida.');
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('NETWORK', 'No se pudo conectar. Revisa tu conexión y vuelve a intentar.');
  } finally {
    clearTimeout(timeout);
  }
}
