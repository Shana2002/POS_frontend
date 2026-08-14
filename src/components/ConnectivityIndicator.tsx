import { useState } from 'react'
import { useHealth } from '../api/health'

export function ConnectivityIndicator() {
  const [open, setOpen] = useState(false)
  const health = useHealth()
  const connected = health.data?.status === 'ok' && health.data.db === 'ok'
  const label = health.isPending ? 'Checking API' : connected ? 'API connected' : 'API unavailable'
  return <div className="operational-status"><button className={`connectivity ${connected ? 'is-online' : 'is-offline'}`} aria-expanded={open} aria-label={`Operational status: ${label}`} onClick={() => setOpen(!open)}><span aria-hidden="true">●</span>{label}</button>{open && <section className="operational-popover" aria-label="Operational status details"><header><strong>Operational status</strong><button className="icon-button" aria-label="Close operational status" onClick={() => setOpen(false)}>×</button></header><dl><div><dt>API</dt><dd>{health.isPending ? 'Checking' : health.data?.status || 'Unavailable'}</dd></div><div><dt>Database</dt><dd>{health.isPending ? 'Checking' : health.data?.db || 'Unavailable'}</dd></div></dl>{health.isError && <p>{health.error instanceof Error ? health.error.message : 'Health check failed.'}</p>}<button className="secondary-button" disabled={health.isFetching} onClick={() => void health.refetch()}>{health.isFetching ? 'Checking...' : 'Check now'}</button></section>}</div>
}
