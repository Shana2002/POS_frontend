import {
  ArrowLeftRight,
  BarChart3,
  Building2,
  ClipboardList,
  CreditCard,
  Gift,
  Landmark,
  LayoutDashboard,
  LogOut,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  ScanLine,
  ScrollText,
  Settings,
  ShoppingCart,
  Tags,
  Trash2,
  Truck,
  UserCog,
  Users,
  WalletCards,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import {
  getNavigationForRole,
  type NavigationIcon as NavigationIconName,
  type NavigationSection,
} from '../auth/permissions'
import { ConnectivityIndicator } from '../components/ConnectivityIndicator'
import { ProfilePanel } from '../components/ProfilePanel'
import { ThemeControl } from '../components/ThemeControl'

const navigationSections: Array<{ id: NavigationSection; label: string }> = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'finance', label: 'Finance' },
  { id: 'administration', label: 'Administration' },
]

const navigationIcons: Record<NavigationIconName, LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  'shopping-cart': ShoppingCart,
  receipt: Receipt,
  package: Package,
  users: Users,
  truck: Truck,
  tags: Tags,
  warehouse: Warehouse,
  'clipboard-list': ClipboardList,
  'credit-card': CreditCard,
  landmark: Landmark,
  'arrow-left-right': ArrowLeftRight,
  gift: Gift,
  'trash-2': Trash2,
  'scan-line': ScanLine,
  'wallet-cards': WalletCards,
  'bar-chart-3': BarChart3,
  'user-cog': UserCog,
  'building-2': Building2,
  settings: Settings,
  'scroll-text': ScrollText,
}

function NavigationIcon({ name }: { name: NavigationIconName }) {
  const Icon = navigationIcons[name]
  return <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
}

export function AppShell() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  if (!auth.user) return null

  const items = getNavigationForRole(auth.user.role)
  const groups = navigationSections
    .map((section) => ({ ...section, items: items.filter((item) => item.section === section.id) }))
    .filter((section) => section.items.length > 0)

  async function signOut() {
    await auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className={`app-shell ${collapsed ? 'is-collapsed' : ''}`}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <aside className="sidebar">
        <div className="sidebar-head">
          <div className="brand">OXIAURA <span>POS</span></div>
          <button
            className="icon-button"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <PanelLeftOpen aria-hidden="true" size={17} /> : <PanelLeftClose aria-hidden="true" size={17} />}
          </button>
        </div>
        <div className="user-summary">
          <div className="avatar" aria-hidden="true">{auth.user.full_name.slice(0, 1).toUpperCase()}</div>
          <div>
            <strong>{auth.user.full_name}</strong>
            <small>{auth.user.role.replaceAll('_', ' ')}</small>
          </div>
        </div>
        <nav aria-label="Primary navigation">
          {groups.map((group) => (
            <div className="nav-group" key={group.id}>
              <span className="nav-group-label">{group.label}</span>
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={item.label}
                  className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                >
                  <span className="nav-icon"><NavigationIcon name={item.icon} /></span>
                  <label>{item.label}</label>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="logout-button" onClick={signOut}>
            <span className="nav-icon"><LogOut aria-hidden="true" size={17} strokeWidth={1.8} /></span>
            <label>Log out</label>
          </button>
        </div>
      </aside>
      <div className="shell-content">
        <header className="shell-topbar">
          <div>
            <span className="section-kicker">Oxiaura workspace</span>
            <strong>{auth.user.branch_id ? `Branch ${auth.user.branch_id}` : 'Head office'}</strong>
          </div>
          <div className="shell-actions">
            <ConnectivityIndicator />
            <ThemeControl />
            <ProfilePanel />
          </div>
        </header>
        <main id="main-content" className="shell-main" tabIndex={-1}><Outlet /></main>
      </div>
    </div>
  )
}
