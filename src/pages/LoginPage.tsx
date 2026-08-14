import { FormEvent, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { parseLoginError } from '../auth/authApi'

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setPending(true)
    try {
      await auth.signIn(email.trim(), password)
      const destination = (location.state as { from?: string } | null)?.from || '/dashboard'
      navigate(destination, { replace: true })
    } catch (loginError) {
      setError(parseLoginError(loginError))
    } finally { setPending(false) }
  }

  return <main className="login-page"><section className="login-panel"><div className="login-brand">OXIAURA <span>POS</span></div><p className="eyebrow">Operations platform</p><h1>Sign in to continue.</h1><p className="login-copy">Access your branch operations with your Oxiaura account.</p><form onSubmit={submit} noValidate><label>Email<input autoComplete="username" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Password<input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <div className="inline-error" role="alert"><strong>Sign in failed</strong><span>{error}</span></div>}<button type="submit" disabled={pending || !email || !password}>{pending ? 'Signing in...' : 'Sign in'}</button></form></section><aside className="login-aside"><span>Oxiaura POS</span><strong>Clear decisions<br />at the point of sale.</strong><small>Secure access for every branch, role, and transaction.</small></aside></main>
}
