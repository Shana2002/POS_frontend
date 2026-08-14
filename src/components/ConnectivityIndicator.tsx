import { useHealth } from '../api/health'

export function ConnectivityIndicator() {
  const health = useHealth()
  const connected = health.data?.status === 'ok' && health.data.db === 'ok'
  const label = health.isPending ? 'Checking API' : connected ? 'API connected' : 'API unavailable'
  return <span className={`connectivity ${connected ? 'is-online' : 'is-offline'}`} aria-live="polite"><span aria-hidden="true">●</span>{label}</span>
}
