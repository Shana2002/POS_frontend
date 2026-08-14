import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { request } from '../../api/client'
import { buildExpenseParams } from './expenseUtils'
import type { Expense, ExpenseFilters, ExpensePayload, Pagination } from './types'

export const expenseKeys = {
  all: ['expenses'] as const,
  list: (filters: ExpenseFilters) => ['expenses', 'list', filters] as const,
  detail: (id: string, branchId?: string) => ['expenses', 'detail', id, branchId || ''] as const,
}

export function useExpenses(filters: ExpenseFilters) {
  return useQuery({
    queryKey: expenseKeys.list(filters),
    queryFn: async () => {
      const result = await request<Expense[]>({ method: 'GET', url: '/expenses', params: buildExpenseParams(filters) })
      return { rows: result.data, meta: result.meta as Pagination | undefined }
    },
  })
}

export function useExpense(id: string, branchId?: string) {
  return useQuery({
    queryKey: expenseKeys.detail(id, branchId),
    queryFn: async () => (await request<Expense>({ method: 'GET', url: `/expenses/${id}`, params: branchId ? { branch_id: branchId } : undefined })).data,
    enabled: Boolean(id),
  })
}

export function useExpenseMutations() {
  const client = useQueryClient()
  const refresh = (expense: Expense) => {
    client.setQueriesData({ queryKey: ['expenses', 'detail', String(expense.id)] }, expense)
    void client.invalidateQueries({ queryKey: expenseKeys.all })
    void client.invalidateQueries({ queryKey: ['reports', 'expense-breakdown'] })
    void client.invalidateQueries({ queryKey: ['reports', 'profit-loss'] })
    void client.invalidateQueries({ queryKey: ['reports', 'dashboard'] })
  }
  const create = useMutation({
    mutationFn: (payload: ExpensePayload) => request<Expense>({ method: 'POST', url: '/expenses', data: payload }).then((result) => result.data),
    onSuccess: refresh,
  })
  const approve = useMutation({
    mutationFn: (id: string) => request<Expense>({ method: 'POST', url: `/expenses/${id}/approve`, data: {} }).then((result) => result.data),
    onSuccess: refresh,
  })
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => request<Expense>({ method: 'POST', url: `/expenses/${id}/reject`, data: { reason } }).then((result) => result.data),
    onSuccess: refresh,
  })
  return { create, approve, reject }
}
