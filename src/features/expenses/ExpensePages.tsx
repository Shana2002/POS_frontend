import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/authContext'
import { EmptyState, Pagination } from '../../components/AdminUI'
import { formatDate, formatDateTime } from '../../lib/date'
import { formatMoney } from '../../lib/money'
import { useBranches } from '../admin/adminApi'
import { useExpenseCategories } from '../partners/partnerApi'
import { useExpense, useExpenseMutations, useExpenses } from './expenseApi'
import { canApproveExpense, canCreateExpense, canRejectExpense, expenseScope, validateExpenseAmount } from './expenseUtils'
import type { Expense, ExpenseFilters } from './types'

function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'The request could not be completed.' }
function Header({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <div className="page-heading operation-header"><div><span className="section-kicker">Financial controls</span><h1>{title}</h1><p>{description}</p></div>{action}</div> }
function Loading() { return <div className="loading-block" role="status">Loading expenses...</div> }
function ErrorState({ error }: { error: unknown }) { return <div className="inline-error" role="alert"><strong>Unable to complete request</strong><span>{errorMessage(error)}</span></div> }
function Status({ value }: { value: string }) { const key = value.toLowerCase(); return <span className={`operation-status ${key}`}><span aria-hidden="true">{key === 'approved' ? '●' : key === 'rejected' ? '×' : '◐'}</span>{value}</span> }
function setUrl(setParams: (value: URLSearchParams | ((current: URLSearchParams) => URLSearchParams)) => void, key: string, value: string) { setParams((current) => { const next = new URLSearchParams(current); if (value) next.set(key, value); else next.delete(key); if (key !== 'page') next.set('page', '1'); return next }) }

function BranchControl({ value, locked, onChange, label = 'Branch', required = false }: { value: string; locked: boolean; onChange: (value: string) => void; label?: string; required?: boolean }) {
  const query = useBranches({ active: 'true', per_page: '100' })
  const branch = query.data?.rows.find((row) => String(row.id) === value)
  return <label>{label}{locked ? <input aria-label={`Assigned ${label.toLowerCase()}`} value={branch ? `${branch.code} · ${branch.name}` : value} readOnly /> : <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} required={required}><option value="">{required ? 'Select branch' : 'All branches'}</option>{query.data?.rows.map((row) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select>}</label>
}

export function ExpensesPage() {
  const auth = useAuth()
  const [params, setParams] = useSearchParams()
  const scope = expenseScope(auth.user!.role, auth.user!.branch_id, params.get('branch_id') || '')
  const filters: ExpenseFilters = { branch_id: scope.branchId, category_id: params.get('category_id') || '', status: params.get('status') || '', from: params.get('from') || '', to: params.get('to') || '', search: params.get('search') || '', page: params.get('page') || '1', per_page: '20' }
  const query = useExpenses(filters)
  const categories = useExpenseCategories({ active: 'true', per_page: '100' })
  const rows = query.data?.rows || []
  const set = (key: string, value: string) => setUrl(setParams, key, value)
  return <div className="operation-page wide"><Header title="Expenses" description="Capture operating costs and review pending approval decisions." action={canCreateExpense(auth.user!.role) ? <Link className="primary-link" to="/expenses/new">Record expense</Link> : undefined} /><div className="operation-tabs" aria-label="Expense views"><Link to="/expenses">Register</Link><Link to="/expenses?status=PENDING">Pending approval</Link></div><div className="operation-toolbar expense-toolbar"><label>Search<input aria-label="Expense search" value={filters.search} onChange={(event) => set('search', event.target.value)} placeholder="Description or reference" /></label><BranchControl value={scope.branchId} locked={scope.locked} onChange={(value) => set('branch_id', value)} /><label>Category<select aria-label="Expense category filter" value={filters.category_id} onChange={(event) => set('category_id', event.target.value)}><option value="">All categories</option>{categories.data?.rows.map((row) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select></label><label>Status<select aria-label="Expense status filter" value={filters.status} onChange={(event) => set('status', event.target.value)}><option value="">All statuses</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></label><label>From<input aria-label="From date" type="date" value={filters.from} onChange={(event) => set('from', event.target.value)} /></label><label>To<input aria-label="To date" type="date" value={filters.to} onChange={(event) => set('to', event.target.value)} /></label></div>{query.isPending ? <Loading /> : query.isError ? <ErrorState error={query.error} /> : !rows.length ? <EmptyState title={filters.status === 'PENDING' ? 'No expenses pending approval' : 'No expenses found'}>Adjust the filters or record an expense.</EmptyState> : <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Branch</th><th>Reference</th><th>Amount</th><th>Status</th></tr></thead><tbody>{rows.map((row) => <tr className={row.status === 'PENDING' ? 'pending-post-row' : ''} key={row.id}><td><Link to={`/expenses/${row.id}`}>{formatDate(row.expense_date)}</Link></td><td><strong>{row.category_code}</strong><small>{row.category_name}</small></td><td>{row.description}</td><td>{row.branch_code}</td><td>{row.reference_no || 'Not recorded'}</td><td>{formatMoney(row.amount)}</td><td><Status value={row.status} /></td></tr>)}</tbody></table></div>}<Pagination page={Number(filters.page)} pages={query.data?.meta?.pages || 1} onPage={(page) => set('page', String(page))} /></div>
}

export function ExpenseCreatePage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const mutation = useExpenseMutations().create
  const categories = useExpenseCategories({ active: 'true', per_page: '100' })
  const scope = expenseScope(auth.user!.role, auth.user!.branch_id, '')
  const [branch, setBranch] = useState(scope.branchId)
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [reference, setReference] = useState('')
  const amountError = validateExpenseAmount(amount)
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!branch || !category || !description.trim() || amountError) return; const row = await mutation.mutateAsync({ branch_id: branch, category_id: category, description: description.trim(), amount, expense_date: date || undefined, reference_no: reference.trim() || undefined }); navigate(`/expenses/${row.id}`) }
  return <div className="operation-page"><Link className="back-link" to="/expenses">← Back to expenses</Link><Header title="Record expense" description="Create a pending expense for approval. Financial reports exclude it until approved." /><form className="operation-form" onSubmit={submit}><BranchControl label="Expense branch" value={branch} locked={scope.locked} onChange={setBranch} required /><label>Category<select aria-label="Expense category" value={category} onChange={(event) => setCategory(event.target.value)} required><option value="">Select category</option>{categories.data?.rows.map((row) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select></label><label className="wide-field">Description<textarea aria-label="Expense description" value={description} onChange={(event) => setDescription(event.target.value)} required maxLength={500} /></label><label>Amount<input aria-label="Expense amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" required />{amount && amountError && <small className="field-error">{amountError}</small>}</label><label>Expense date<input aria-label="Expense date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="wide-field">Reference number<input aria-label="Expense reference" value={reference} onChange={(event) => setReference(event.target.value)} maxLength={100} /></label><div className="form-consequence neutral">The backend applies configured approval thresholds. This record remains pending and read-only after submission.</div>{mutation.isError && <ErrorState error={mutation.error} />}<div className="modal-actions wide-field"><Link className="secondary-button" to="/expenses">Cancel</Link><button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Recording...' : 'Record expense'}</button></div></form></div>
}

export function ExpenseDetailPage() {
  const { id = '' } = useParams()
  const auth = useAuth()
  const query = useExpense(id, auth.user?.branch_id || undefined)
  const mutations = useExpenseMutations()
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null)
  const [reason, setReason] = useState('')
  const decisionSubmitting = useRef(false)
  if (query.isPending) return <Loading />
  if (!query.data || query.isError) return <ErrorState error={query.error} />
  const row: Expense = query.data
  const pending = mutations.approve.isPending || mutations.reject.isPending
  const mutationError = mutations.approve.error || mutations.reject.error
  const approve = async () => {
    if (decisionSubmitting.current || pending) return
    decisionSubmitting.current = true
    try { await mutations.approve.mutateAsync(id); setDecision(null) } finally { decisionSubmitting.current = false }
  }
  const reject = async () => {
    if (decisionSubmitting.current || pending || !reason.trim()) return
    decisionSubmitting.current = true
    try { await mutations.reject.mutateAsync({ id, reason: reason.trim() }); setDecision(null); setReason('') } finally { decisionSubmitting.current = false }
  }
  const actions = <div className="header-actions">{canRejectExpense(row.status, auth.user!.role) && <button className="secondary-button" onClick={() => setDecision('reject')}>Reject</button>}{canApproveExpense(row.status, auth.user!.role) && <button onClick={() => setDecision('approve')}>Approve</button>}</div>
  return <div className="operation-page"><Link className="back-link" to="/expenses">← Back to expenses</Link><Header title={`Expense #${row.id}`} description={`${row.category_code} · ${row.category_name}`} action={actions} /><div className={row.status === 'PENDING' ? 'pending-notice' : 'posted-notice'}>{row.status === 'PENDING' ? 'Pending approval · Excluded from approved expense reports.' : `${row.status[0]}${row.status.slice(1).toLowerCase()} · Historical record is read-only.`}</div><section className="operation-summary"><article><span>Status</span><Status value={row.status} /></article><article><span>Amount</span><strong>{formatMoney(row.amount)}</strong></article><article><span>Branch</span><strong>{row.branch_code}</strong></article><article><span>Date</span><strong>{formatDate(row.expense_date)}</strong></article></section><section className="operation-detail"><h2>Expense record</h2><dl><div><dt>Description</dt><dd>{row.description}</dd></div><div><dt>Reference</dt><dd>{row.reference_no || 'Not recorded'}</dd></div><div><dt>Created</dt><dd>{formatDateTime(row.created_at)}</dd></div><div><dt>Decision</dt><dd>{row.decided_at ? formatDateTime(row.decided_at) : 'Awaiting approval'}</dd></div>{row.rejection_reason && <div><dt>Rejection reason</dt><dd>{row.rejection_reason}</dd></div>}</dl></section>{decision && <div className="modal-backdrop"><section className="modal confirmation" role="alertdialog" aria-modal="true"><span className="modal-mark" aria-hidden="true">!</span><h2>{decision === 'approve' ? 'Approve expense' : 'Reject expense'}</h2><p>{decision === 'approve' ? 'Approval includes this expense in the expense breakdown, profit and loss, and dashboard totals.' : 'Rejection keeps this record in history and requires a clear reason.'}</p>{decision === 'reject' && <label className="reason-field">Reason<textarea aria-label="Rejection reason" value={reason} onChange={(event) => setReason(event.target.value)} required autoFocus /></label>}{mutationError && <ErrorState error={mutationError} />}<div className="modal-actions"><button className="secondary-button" onClick={() => setDecision(null)} disabled={pending}>Cancel</button><button onClick={() => void (decision === 'approve' ? approve() : reject())} disabled={pending || (decision === 'reject' && !reason.trim())}>{pending ? 'Working...' : decision === 'approve' ? 'Confirm approval' : 'Confirm rejection'}</button></div></section></div>}</div>
}
