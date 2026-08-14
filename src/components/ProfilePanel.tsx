import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../auth/authContext'

export function ProfilePanel() {
  const auth = useAuth()
  const [open, setOpen] = useState(false)
  if (!auth.user) return null
  return <div className="profile-wrap"><button className="profile-trigger" aria-expanded={open} onClick={() => setOpen(!open)}><span className="avatar small">{auth.user.full_name.slice(0, 1).toUpperCase()}</span><span>{auth.user.full_name}</span><span aria-hidden="true">⌄</span></button>{open && <div className="profile-panel"><strong>{auth.user.full_name}</strong><span>{auth.user.email}</span><span>{auth.user.role.replaceAll('_', ' ')}</span><Link to="/account" onClick={() => setOpen(false)}>Account settings</Link></div>}</div>
}
