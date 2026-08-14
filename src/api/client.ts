import axios, { type AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import type { ApiEnvelope, ApiErrorEnvelope, ApiMeta } from './types'

export class ApiClientError extends Error {
  readonly code: string
  readonly details?: Record<string, unknown>
  readonly status?: number
  readonly requestId?: string

  constructor(code: string, message: string, details?: Record<string, unknown>, status?: number, requestId?: string) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    this.details = details
    this.status = status
    this.requestId = requestId
  }
}

export function parseApiResponse<T>(envelope: ApiEnvelope<T>): T {
  if (envelope.success === true) return envelope.data
  const error = envelope.error
  throw new ApiClientError(error.code, error.message, error.details)
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

let accessToken: string | null = localStorage.getItem('oxiaura_access_token')
let refreshToken: string | null = localStorage.getItem('oxiaura_refresh_token')
let refreshPromise: Promise<string | null> | null = null

export function setTokens(tokens: { accessToken: string; refreshToken?: string }): void {
  accessToken = tokens.accessToken
  refreshToken = tokens.refreshToken ?? refreshToken
  localStorage.setItem('oxiaura_access_token', accessToken)
  if (refreshToken) localStorage.setItem('oxiaura_refresh_token', refreshToken)
}

export function clearTokens(): void {
  accessToken = null
  refreshToken = null
  localStorage.removeItem('oxiaura_access_token')
  localStorage.removeItem('oxiaura_refresh_token')
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshToken) return null
  if (!refreshPromise) {
    refreshPromise = axios.post<ApiEnvelope<{ access_token: string }>>(`${api.defaults.baseURL}/auth/refresh`, {}, {
      headers: { Authorization: `Bearer ${refreshToken}` },
    }).then((response) => {
      const token = parseApiResponse(response.data).access_token
      setTokens({ accessToken: token })
      return token
    }).catch(() => {
      clearTokens()
      return null
    }).finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

api.interceptors.response.use(undefined, async (error: AxiosError<ApiErrorEnvelope>) => {
  const config = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined
  if (error.response?.status === 401 && config && !config._retry && !config.url?.endsWith('/auth/refresh')) {
    config._retry = true
    const token = await refreshAccessToken()
    if (token) {
      config.headers = { ...config.headers, Authorization: `Bearer ${token}` }
      return api.request(config)
    }
  }
  throw toApiClientError(error)
})

export function toApiClientError(error: AxiosError<ApiErrorEnvelope>): ApiClientError {
  const body = error.response?.data
  const requestId = error.response?.headers?.['x-request-id'] as string | undefined
  return new ApiClientError(
    body && !body.success ? body.error.code : 'NETWORK_ERROR',
    body && !body.success ? body.error.message : error.message || 'Request failed.',
    body && !body.success ? body.error.details : undefined,
    error.response?.status,
    requestId,
  )
}

export async function request<T>(config: AxiosRequestConfig): Promise<{ data: T; meta?: ApiMeta; response: AxiosResponse }> {
  const response = await api.request<ApiEnvelope<T>>(config)
  if (!response.data.success) throw toApiClientError({ response } as AxiosError<ApiErrorEnvelope>)
  return { data: response.data.data, meta: response.data.meta, response }
}

export { api }
