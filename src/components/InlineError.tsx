import { ApiClientError } from '../api/client'

type Props = { error: unknown; title?: string }

export function InlineError({ error, title = 'Something went wrong' }: Props) {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred.'
  const requestId = error instanceof ApiClientError ? error.requestId : undefined
  return (
    <div className="inline-error" role="alert">
      <strong>{title}</strong>
      <span>{message}</span>
      {requestId && <small>Request ID: {requestId}</small>}
    </div>
  )
}
