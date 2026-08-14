import { Link } from 'react-router-dom'

export function AuthenticatedRoutePage({ title }: { title: string }) { return <div className="placeholder-page"><span className="section-kicker">Authenticated route</span><h1>{title}</h1><p>This route is protected and role-aware. Its feature screens are delivered in the corresponding build phase.</p></div> }

export function DashboardPage() {
  return <div className="dashboard-page"><div className="page-heading"><div><span className="section-kicker">Overview</span><h1>Good business starts with a clear view.</h1><p>Monitor your operation from one reliable place.</p></div><Link className="primary-link" to="/pos">Open sales workspace</Link></div><section className="dashboard-stats"><article><span>Today's sales</span><strong>Ready for API data</strong><small>Connect a dashboard endpoint in Phase 12.</small></article><article><span>Open receivables</span><strong>Awaiting data</strong><small>Financial totals remain server-owned.</small></article><article><span>Inventory status</span><strong>Live when connected</strong><small>Health and auth are active now.</small></article></section><section className="dashboard-empty"><span className="empty-mark">+</span><h2>Your workspace is ready.</h2><p>Use the navigation to continue into operational modules as they are delivered.</p></section></div>
}

export function PlaceholderPage({ title }: { title: string }) { return <div className="placeholder-page"><span className="section-kicker">Authenticated route</span><h1>{title}</h1><p>This route is protected and role-aware. Its feature screens are delivered in the corresponding build phase.</p></div> }

export function ForbiddenPage() { return <div className="placeholder-page"><span className="section-kicker">403</span><h1>Access restricted.</h1><p>Your account does not have permission to view this area.</p><Link to="/dashboard">Return to dashboard</Link></div> }

export function UnauthorizedPage() { return <div className="placeholder-page"><span className="section-kicker">Session expired</span><h1>Please sign in again.</h1><p>Your session is no longer valid. No private data was rendered.</p><Link to="/login">Go to sign in</Link></div> }
