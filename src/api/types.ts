export type ApiMeta = {
  page?: number
  per_page?: number
  total?: number
  pages?: number
  [key: string]: unknown
}

export type ApiSuccess<T> = { success: true; data: T; meta?: ApiMeta }
export type ApiErrorEnvelope = {
  success: false
  error: { code: string; message: string; details?: Record<string, unknown> }
}
export type ApiEnvelope<T> = ApiSuccess<T> | ApiErrorEnvelope
