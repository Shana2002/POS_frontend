import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EmptyState, Pagination } from '../../components/AdminUI'
import { InlineError } from '../../components/InlineError'
import { formatDateTime } from '../../lib/date'
import { useAuditLog } from './auditApi'
import { compareAuditValues, formatAuditValue } from './auditUtils'
import type { AuditEntry, AuditListFilters } from './types'

type SearchSetter = (nextInit: URLSearchParams | ((current: URLSearchParams) => URLSearchParams)) => void

function setUrl(setParams: SearchSetter, key: string, value: string) {
  setParams((current) => {
    const next = new URLSearchParams(current)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.set('page', '1')
    return next
  })
}

function filtersFrom(params: URLSearchParams): AuditListFilters {
  return {
    table_name: params.get('table_name') || '',
    record_id: params.get('record_id') || '',
    user_id: params.get('user_id') || '',
    action: params.get('action') || '',
    from: params.get('from') || '',
    to: params.get('to') || '',
    page: params.get('page') || '1',
    per_page: '20',
  }
}

function AuditFilters({ filters, setParams, refreshing, onRefresh }: { filters: AuditListFilters; setParams: SearchSetter; refreshing: boolean; onRefresh: () => void }) {
  const set = (key: string, value: string) => setUrl(setParams, key, value)
  return <div className="audit-filters">
    <label>Table<input aria-label="Audit table" placeholder="e.g. invoices" value={filters.table_name} onChange={(event) => set('table_name', event.target.value)} /></label>
    <label>Record ID<input aria-label="Audit record ID" value={filters.record_id} onChange={(event) => set('record_id', event.target.value)} /></label>
    <label>User ID<input aria-label="Audit user ID" value={filters.user_id} onChange={(event) => set('user_id', event.target.value)} /></label>
    <label>Action<select aria-label="Audit action" value={filters.action} onChange={(event) => set('action', event.target.value)}><option value="">All actions</option><option value="CREATE">Create</option><option value="UPDATE">Update</option><option value="DELETE">Delete</option><option value="REVERSE">Reverse</option><option value="APPROVE">Approve</option></select></label>
    <label>From<input aria-label="Audit from date" type="date" value={filters.from} onChange={(event) => set('from', event.target.value)} /></label>
    <label>To<input aria-label="Audit to date" type="date" value={filters.to} onChange={(event) => set('to', event.target.value)} /></label>
    <button className="secondary-button" onClick={onRefresh} disabled={refreshing}>{refreshing ? 'Refreshing...' : 'Refresh'}</button>
  </div>
}

async function copyText(value: string, onCopied: () => void) {
  await navigator.clipboard.writeText(value)
  onCopied()
}

function RawJson({ label, value, onCopied }: { label: string; value: unknown; onCopied: (label: string) => void }) {
  const json = JSON.stringify(value, null, 2)
  return <section className="audit-raw"><div><h3>{label}</h3><button className="secondary-button" onClick={() => void copyText(json, () => onCopied(label))} aria-label={`Copy ${label.toLowerCase()}`}>Copy</button></div><pre tabIndex={0}>{json}</pre></section>
}

function ComparisonDrawer({ entry, onClose }: { entry: AuditEntry; onClose: () => void }) {
  const [mode, setMode] = useState<'changes' | 'raw'>('changes')
  const [copied, setCopied] = useState('')
  const rows = compareAuditValues(entry.old_values, entry.new_values)
  return <div className="audit-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><aside className="audit-drawer" role="dialog" aria-modal="true" aria-labelledby="audit-entry-title">
    <header><div><span className="section-kicker">Audit entry #{entry.id}</span><h2 id="audit-entry-title">{entry.table_name} · {entry.record_id}</h2><p>{entry.action} by user {entry.user_id} · {formatDateTime(entry.created_at)}</p></div><button className="icon-button" aria-label="Close audit entry" onClick={onClose}>×</button></header>
    <div className="audit-mode" role="tablist" aria-label="Audit value view"><button role="tab" aria-selected={mode === 'changes'} onClick={() => setMode('changes')}>Field comparison</button><button role="tab" aria-selected={mode === 'raw'} onClick={() => setMode('raw')}>Raw JSON</button></div>
    {copied && <div className="copy-notice" role="status">{copied} copied.</div>}
    {mode === 'changes' ? <div className="audit-comparison" role="table" aria-label="Audit field comparison"><div className="audit-comparison-head" role="row"><span role="columnheader">Field</span><span role="columnheader">Before</span><span role="columnheader">After</span></div>{rows.length ? rows.map((row) => <div className={`audit-change ${row.change}`} role="row" key={row.field}><strong role="cell"><span>{row.change}</span>{row.field}</strong><pre role="cell">{formatAuditValue(row.oldValue)}</pre><pre role="cell">{formatAuditValue(row.newValue)}</pre></div>) : <EmptyState title="No field values">This event does not include old or new JSON values.</EmptyState>}</div> : <div className="audit-raw-grid"><RawJson label="Old values" value={entry.old_values} onCopied={setCopied} /><RawJson label="New values" value={entry.new_values} onCopied={setCopied} /></div>}
    <footer><span>IP address {entry.ip_address}</span><button className="secondary-button" onClick={() => void copyText(JSON.stringify(entry, null, 2), () => setCopied('Audit entry'))}>Copy full entry</button></footer>
  </aside></div>
}

export function AuditLogPage() {
  const [params, setParams] = useSearchParams()
  const [selected, setSelected] = useState<AuditEntry | null>(null)
  const filters = filtersFrom(params)
  const query = useAuditLog(filters)
  const rows = query.data?.rows || []
  return <div className="audit-page"><div className="page-heading audit-header"><div><span className="section-kicker">Administration</span><h1>Audit log</h1><p>Trace protected record activity and inspect server-captured before and after values.</p></div></div>
    <AuditFilters filters={filters} setParams={setParams} refreshing={query.isFetching} onRefresh={() => void query.refetch()} />
    {query.isPending ? <div className="loading-block" role="status">Loading audit entries...</div> : query.isError ? <InlineError error={query.error} title="Unable to load audit log" /> : rows.length === 0 ? <EmptyState title="No audit entries found">Adjust the filters or date range.</EmptyState> : <div className="data-table-wrap"><table className="data-table audit-table"><caption>Audit events</caption><thead><tr><th>Date and time</th><th>Action</th><th>Table</th><th>Record</th><th>User</th><th>IP address</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map((entry) => <tr key={entry.id}><td>{formatDateTime(entry.created_at)}</td><td><span className={`audit-action ${entry.action.toLowerCase()}`}>{entry.action}</span></td><td>{entry.table_name}</td><td>{entry.record_id}</td><td>{entry.user_id}</td><td><code>{entry.ip_address}</code></td><td><button className="table-button" onClick={() => setSelected(entry)}>Compare</button></td></tr>)}</tbody></table></div>}
    <Pagination page={Number(filters.page)} pages={query.data?.meta?.pages || 1} onPage={(page) => setUrl(setParams, 'page', String(page))} />
    {selected && <ComparisonDrawer entry={selected} onClose={() => setSelected(null)} />}
  </div>
}
