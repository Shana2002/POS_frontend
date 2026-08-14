import { ApiClientError } from '../api/client'

export type ClientErrorEvent = {
  message: string
  route?: string
  request_id?: string
  status?: number
  code?: string
  source: 'boundary' | 'unhandled-rejection' | 'uncaught-error'
}

type ErrorContext = { route?: string; requestId?: string; source?: ClientErrorEvent['source'] }

export function createClientErrorEvent(error: unknown, context: ErrorContext = {}): ClientErrorEvent {
  const apiError = error instanceof ApiClientError ? error : undefined
  const event: ClientErrorEvent = {
    message: error instanceof Error ? error.message : 'Unknown client error',
    source: context.source || 'boundary',
  }
  if (context.route) event.route = context.route
  if (context.requestId || apiError?.requestId) event.request_id = context.requestId || apiError?.requestId
  if (apiError?.status) event.status = apiError.status
  if (apiError?.code) event.code = apiError.code
  return event
}

export function reportClientError(error: unknown, context: ErrorContext = {}): void {
  const event = createClientErrorEvent(error, context)
  const endpoint = import.meta.env.VITE_ERROR_REPORTING_URL
  if (endpoint && typeof navigator.sendBeacon === 'function') {
    navigator.sendBeacon(endpoint, new Blob([JSON.stringify(event)], { type: 'application/json' }))
    return
  }
  if (import.meta.env.DEV) console.error('[client-error]', event)
}

export function installGlobalErrorReporting(): () => void {
  const onError = (event: ErrorEvent) => reportClientError(event.error || new Error(event.message), { route: window.location.pathname, source: 'uncaught-error' })
  const onRejection = (event: PromiseRejectionEvent) => reportClientError(event.reason, { route: window.location.pathname, source: 'unhandled-rejection' })
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)
  return () => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onRejection)
  }
}
