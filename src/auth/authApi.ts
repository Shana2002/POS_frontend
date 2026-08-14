import type { AxiosError } from 'axios'
import { api, clearTokens, request, setTokens } from '../api/client'
import type { ApiErrorEnvelope } from '../api/types'
import type { ChangePasswordResponse, LoginResponse, User } from './types'

export async function login(email: string, password: string): Promise<LoginResponse> {
  const result = await request<LoginResponse>({ method: 'POST', url: '/auth/login', data: { email, password } })
  setTokens({ accessToken: result.data.access_token, refreshToken: result.data.refresh_token })
  return result.data
}

export async function getCurrentUser(): Promise<User> {
  return (await request<User>({ method: 'GET', url: '/auth/me' })).data
}

export async function logout(): Promise<void> {
  try { await request<{ message: string }>({ method: 'POST', url: '/auth/logout' }) } finally { clearTokens() }
}

export async function changePassword(current_password: string, new_password: string): Promise<ChangePasswordResponse> {
  return (await request<ChangePasswordResponse>({ method: 'POST', url: '/auth/change-password', data: { current_password, new_password } })).data
}

export function parseLoginError(error: unknown): string {
  const response = (error as AxiosError<ApiErrorEnvelope>).response
  const body = response?.data
  if (body && !body.success) return body.error.message
  if (response?.status === 429) return 'Too many login attempts. Please try again later.'
  return error instanceof Error ? error.message : 'Unable to sign in.'
}

export { api }
