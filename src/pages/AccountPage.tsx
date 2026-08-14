import { FormEvent, useState } from 'react'
import { useAuth } from '../auth/authContext'
import { ApiClientError } from '../api/client'

export function AccountPage() {
  const auth = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setSuccess('')
    if (newPassword.length < 8) { setError('New password must contain at least 8 characters.'); return }
    if (newPassword !== confirmPassword) { setError('New passwords do not match.'); return }
    setPending(true)
    try {
      await auth.updatePassword(currentPassword, newPassword)
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      setSuccess('Password changed successfully.')
    } catch (requestError) {
      setError(requestError instanceof ApiClientError ? requestError.message : 'Unable to change password.')
    } finally { setPending(false) }
  }

  if (!auth.user) return null
  return <div className="account-page"><div className="page-heading"><div><span className="section-kicker">Profile</span><h1>Account settings</h1><p>Review your assigned access and maintain your password.</p></div></div><div className="account-grid"><section className="account-card"><h2>Account details</h2><dl><div><dt>Full name</dt><dd>{auth.user.full_name}</dd></div><div><dt>Email</dt><dd>{auth.user.email}</dd></div><div><dt>Role</dt><dd>{auth.user.role.replaceAll('_', ' ')}</dd></div><div><dt>Branch</dt><dd>{auth.user.branch_id || 'Head office'}</dd></div></dl></section><section className="account-card"><h2>Change password</h2><form onSubmit={submit}><label>Current password<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label><label>New password<input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label><label>Confirm new password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>{error && <div className="form-message error" role="alert">{error}</div>}{success && <div className="form-message success" role="status">{success}</div>}<button disabled={pending || !currentPassword || !newPassword || !confirmPassword}>{pending ? 'Updating...' : 'Change password'}</button></form></section></div></div>
}
