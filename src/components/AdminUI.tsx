import type { ReactNode } from 'react'

export function StatusBadge({ active }: { active: boolean }) { return <span className={`status-badge ${active ? 'active' : 'inactive'}`}><span aria-hidden="true">{active ? '●' : '○'}</span>{active ? 'Active' : 'Inactive'}</span> }

export function EmptyState({ title, children }: { title: string; children: ReactNode }) { return <div className="admin-empty"><span aria-hidden="true">+</span><strong>{title}</strong><p>{children}</p></div> }

export function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  return <nav className="pagination" aria-label="Pagination"><button className="secondary-button" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button><span>Page {page} of {Math.max(1, pages)}</span><button className="secondary-button" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button></nav>
}

export function ConfirmationDialog({ open, title, message, pending, onCancel, onConfirm }: { open: boolean; title: string; message: string; pending: boolean; onCancel: () => void; onConfirm: () => void }) {
  if (!open) return null
  return <div className="modal-backdrop" role="presentation"><section className="modal confirmation" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"><span className="modal-mark" aria-hidden="true">!</span><h2 id="confirm-title">{title}</h2><p>{message}</p><div className="modal-actions"><button className="secondary-button" onClick={onCancel} disabled={pending}>Cancel</button><button className="danger-button" onClick={onConfirm} disabled={pending}>{pending ? 'Working...' : 'Confirm'}</button></div></section></div>
}
