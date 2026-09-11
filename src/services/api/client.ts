type ApiErrorBody = {
  error?: {
    code?: unknown;
    message?: unknown;
  };
};

type RequestOptions = {
  /** Cuerpo JSON. Excluyente con `binary`. */
  body?: unknown;
  /** Cuerpo binario servido tal cual, con su propio `Content-Type`. */
  binary?: { bytes: Uint8Array; contentType: string };
  headers?: HeadersInit;
  isPublic?: boolean;
  method?: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';
};

type ApiClientDependencies = {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  getCookie: () => Promise<string>;
};

/** Error normalizado para que la interfaz no exponga respuestas del servidor. */
export class ApiError extends Error {
  readonly code: string;
  readonly endpoint?: string;
  readonly requestId?: string;
  readonly status: number;

  constructor({
    status,
    code,
    endpoint,
    message,
    requestId,
  }: {
    status: number;
    code: string;
    endpoint?: string;
    message: string;
    requestId?: string;
  }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.endpoint = endpoint;
    this.requestId = requestId;
  }
}

function requestIdFrom(response: Response): string | undefined {
  return (
    response.headers.get('request-id') ??
    response.headers.get('x-request-id') ??
    undefined
  );
}

function apiErrorMessage(status: number): string {
  if (status === 400) return 'Revisa los datos e inténtalo de nuevo.';
  if (status === 401) return 'Tu sesión caducó. Inicia sesión de nuevo.';
  if (status === 404) return 'No encontramos el recurso solicitado.';
  if (status === 409)
    return 'No se puede completar la operación por un conflicto.';
  return 'No pudimos completar la operación. Inténtalo de nuevo.';
}

async function readErrorBody(response: Response): Promise<ApiErrorBody | null> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === 'object') return body as ApiErrorBody;
  } catch {
    // Una respuesta no JSON no debe llegar a la interfaz como error técnico.
  }
  return null;
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

function throwRequestFailure(error: unknown, path: string): never {
  const nativeError =
    error && typeof error === 'object'
      ? (error as { message?: unknown; name?: unknown })
      : undefined;
  if (
    !(error instanceof ApiError) &&
    nativeError?.name !== 'SyntaxError' &&
    typeof nativeError?.message === 'string' &&
    /network request failed|network connection was lost|fetch failed|failed to fetch|load failed|networkerror/i.test(
      nativeError.message,
    )
  ) {
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      endpoint: path,
      message:
        'Se interrumpió la conexión. Comprueba Internet e inténtalo de nuevo.',
    });
  }
  throw error;
}

export function createApiClient({
  baseUrl,
  fetchImpl = fetch,
  getCookie,
}: ApiClientDependencies) {
  /**
   * Emite la petición y devuelve la `Response` cruda. Todo lo común —url,
   * cookie, cabeceras y traducción del error— vive aquí, de modo que el cuerpo
   * binario reutiliza exactamente el mismo camino autenticado que el JSON.
   */
  async function send(
    path: string,
    options: RequestOptions = {},
  ): Promise<Response> {
    const {
      binary,
      body,
      headers: suppliedHeaders,
      isPublic = false,
      method = 'GET',
    } = options;
    const headers = new Headers(suppliedHeaders);

    if (binary) {
      headers.set('Content-Type', binary.contentType);
    } else {
      headers.set('Accept', 'application/json');
      if (body !== undefined) headers.set('Content-Type', 'application/json');
    }

    if (!isPublic) {
      const cookie = await getCookie();
      if (cookie) headers.set('Cookie', cookie);
    }

    const response = await fetchImpl(joinUrl(baseUrl, path), {
      method,
      headers,
      // El binario viaja sin serializar: convertirlo a base64 multiplicaría por
      // 1,33 los bytes que salen por datos móviles y el contrato espera bytes.
      body: binary
        ? (binary.bytes as unknown as BodyInit)
        : body === undefined
          ? undefined
          : JSON.stringify(body),
      // Expo gestiona la cookie explícitamente; `include` interfiere con ella.
      credentials: 'omit',
    });

    if (!response.ok) {
      const errorBody = await readErrorBody(response);
      const code =
        typeof errorBody?.error?.code === 'string'
          ? errorBody.error.code
          : 'API_ERROR';
      const error = new ApiError({
        status: response.status,
        code,
        endpoint: path,
        message: apiErrorMessage(response.status),
        requestId: requestIdFrom(response),
      });
      // El mensaje de `ApiError` es deliberadamente apto para UI. El detalle
      // operativo se conserva únicamente en el log, sin incluir el body ni la
      // cookie de la petición.
      console.error('[api] Request failed', {
        status: error.status,
        code: error.code,
        endpoint: error.endpoint,
        ...(error.requestId ? { requestId: error.requestId } : {}),
      });
      throw error;
    }

    return response;
  }

  async function request<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    try {
      const response = await send(path, options);
      if (response.status === 204) return undefined as T;
      return (await response.json()) as T;
    } catch (error) {
      throwRequestFailure(error, path);
    }
  }

  return {
    // Admite cuerpo: DELETE /v1/me/push-tokens identifica el dispositivo por
    // su token, que no cabe en la ruta sin escaparlo.
    delete: <T>(path: string, body?: unknown) =>
      request<T>(path, { body, method: 'DELETE' }),
    get: <T>(path: string, options?: Pick<RequestOptions, 'isPublic'>) =>
      request<T>(path, options),
    /**
     * Descarga bytes en vez de JSON. Devuelve `null` ante un 404, que para los
     * recursos opcionales —un avatar que todavía no existe— es una respuesta
     * normal y no un fallo que deba alertar a nadie.
     */
    getBytes: async (path: string): Promise<Uint8Array | null> => {
      try {
        const response = await send(path);
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength === 0) return null;
        return new Uint8Array(buffer);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throwRequestFailure(error, path);
      }
    },
    patch: <T>(path: string, body: unknown) =>
      request<T>(path, { body, method: 'PATCH' }),
    post: <T>(path: string, body: unknown) =>
      request<T>(path, { body, method: 'POST' }),
    put: <T>(path: string, body: unknown) =>
      request<T>(path, { body, method: 'PUT' }),
    /** `PUT` con cuerpo binario: hoy solo la subida del avatar. */
    putBytes: <T>(path: string, bytes: Uint8Array, contentType: string) =>
      request<T>(path, { binary: { bytes, contentType }, method: 'PUT' }),
  };
}
