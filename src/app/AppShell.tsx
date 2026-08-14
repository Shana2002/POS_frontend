import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { getNavigationForRole } from '../auth/permissions'
import { ConnectivityIndicator } from '../components/ConnectivityIndicator'
import { ThemeControl } from '../components/ThemeControl'
import { ProfilePanel } from '../components/ProfilePanel'

export function AppShell() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  if (!auth.user) return null
  const items = getNavigationForRole(auth.user.role)
  async function signOut() { await auth.signOut(); navigate('/login', { replace: true }) }
  return <div className={`app-shell ${collapsed ? 'is-collapsed' : ''}`}><a className="skip-link" href="#main-content">Skip to main content</a><aside className="sidebar"><div className="sidebar-head"><div className="brand">OXIAURA <span>POS</span></div><button className="icon-button" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsed(!collapsed)}>{collapsed ? '→' : '←'}</button></div><div className="user-summary"><div className="avatar" aria-hidden="true">{auth.user.full_name.slice(0, 1).toUpperCase()}</div><div><strong>{auth.user.full_name}</strong><small>{auth.user.role.replaceAll('_', ' ')}</small></div></div><nav aria-label="Primary navigation">{items.map((item) => <NavLink key={item.path} to={item.path} title={item.label} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}><span aria-hidden="true">{item.label.slice(0, 1)}</span><label>{item.label}</label></NavLink>)}</nav><div className="sidebar-bottom"><button className="logout-button" onClick={signOut}><span aria-hidden="true">↪</span><label>Log out</label></button></div></aside><div className="shell-content"><header className="shell-topbar"><div><span className="section-kicker">Oxiaura workspace</span><strong>{auth.user.branch_id ? `Branch ${auth.user.branch_id}` : 'Head office'}</strong></div><div className="shell-actions"><ConnectivityIndicator /><ThemeControl /><ProfilePanel /></div></header><main id="main-content" className="shell-main" tabIndex={-1}><Outlet /></main></div></div>
}
