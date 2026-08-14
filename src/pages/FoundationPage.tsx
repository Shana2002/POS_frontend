import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ConnectivityIndicator } from '../components/ConnectivityIndicator'
import { ThemeControl } from '../components/ThemeControl'

export function FoundationPage() {
  const [showError, setShowError] = useState(false)
  return <main className="foundation-page"><header className="topbar"><Link className="brand" to="/">OXIAURA <span>POS</span></Link><div className="topbar-actions"><ConnectivityIndicator /><ThemeControl /></div></header><section className="hero"><p className="eyebrow">Phase 0 · Foundation</p><h1>Retail operations,<br />ready for what comes next.</h1><p className="lede">The application scaffold, semantic theme, API transport, exact financial utilities, and quality gates are in place.</p><div className="actions"><button onClick={() => setShowError(!showError)}>Test standard error UI</button><a href="#foundation">View foundation</a></div>{showError && <div className="inline-error" role="alert"><strong>Example API error</strong><span>Backend messages appear here without being hidden.</span></div>}</section><section id="foundation" className="foundation-grid"><article><span>01</span><h2>Typed transport</h2><p>Standard envelopes, errors, token refresh groundwork, metadata, and request IDs.</p></article><article><span>02</span><h2>Exact values</h2><p>Money remains decimal text, dates stay date-only, and UTC times render in Colombo.</p></article><article><span>03</span><h2>Accessible modes</h2><p>Light, dark, and system modes use shared semantic tokens and persist locally.</p></article></section></main>
}
