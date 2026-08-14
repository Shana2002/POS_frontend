import { useState } from 'react'
import { ApiClientError } from '../api/client'

type Props = { error: unknown; title?: string }

export function InlineError({ error, title = 'Something went wrong' }: Props) {
  const [copied, setCopied] = useState(false)
  const message = error instanceof Error ? error.message : 'An unexpected error occurred.'
  const requestId = error instanceof ApiClientError ? error.requestId : undefined
  async function copyRequestId() {
    if (!requestId) return
    await navigator.clipboard.writeText(requestId)
    setCopied(true)
  }
  return (
    <div className="inline-error" role="alert">
      <strong>{title}</strong>
      <span>{message}</span>
      {requestId && <details className="technical-error-details">
        <summary>Technical details</summary>
        <div><span>Request ID</span><code>{requestId}</code><button className="secondary-button" onClick={() => void copyRequestId()}>{copied ? 'Copied' : 'Copy request ID'}</button></div>
      </details>}
    </div>
  )
}
