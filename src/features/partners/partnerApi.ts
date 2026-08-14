import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { request } from '../../api/client'
import { buildMasterListParams, buildStatementParams } from './partnerUtils'
import type { Customer, CustomerPayload, CustomerStatement, ExpenseCategory, ExpenseCategoryPayload, ListFilters, Pagination, StatementFilters, Supplier, SupplierPayload } from './types'

export const partnerKeys = {
  customers: () => ['customers'] as const,
  customerList: (filters: ListFilters) => ['customers', 'list', filters] as const,
  customer: (id: string) => ['customers', 'detail', id] as const,
  statement: (id: string, filters: StatementFilters) => ['customers', 'statement', id, filters] as const,
  suppliers: () => ['suppliers'] as const,
  supplierList: (filters: ListFilters) => ['suppliers', 'list', filters] as const,
  supplier: (id: string) => ['suppliers', 'detail', id] as const,
  categories: () => ['expense-categories'] as const,
  categoryList: (filters: ListFilters) => ['expense-categories', 'list', filters] as const,
}

async function paginated<T>(url: string, filters: ListFilters) {
  const result = await request<T[]>({ method: 'GET', url, params: buildMasterListParams(filters) })
  return { rows: result.data, meta: result.meta as Pagination | undefined }
}

export function useCustomers(filters: ListFilters) { return useQuery({ queryKey: partnerKeys.customerList(filters), queryFn: () => paginated<Customer>('/customers', filters) }) }
export function useCustomer(id: string) { return useQuery({ queryKey: partnerKeys.customer(id), queryFn: async () => (await request<Customer>({ method: 'GET', url: `/customers/${id}` })).data, enabled: Boolean(id) }) }
export function useCustomerStatement(id: string, filters: StatementFilters) { return useQuery({ queryKey: partnerKeys.statement(id, filters), queryFn: async () => (await request<CustomerStatement>({ method: 'GET', url: `/customers/${id}/statement`, params: buildStatementParams(filters) })).data, enabled: Boolean(id) }) }
export function useSuppliers(filters: ListFilters) { return useQuery({ queryKey: partnerKeys.supplierList(filters), queryFn: () => paginated<Supplier>('/suppliers', filters) }) }
export function useSupplier(id: string) { return useQuery({ queryKey: partnerKeys.supplier(id), queryFn: async () => (await request<Supplier>({ method: 'GET', url: `/suppliers/${id}` })).data, enabled: Boolean(id) }) }
export function useExpenseCategories(filters: ListFilters) { return useQuery({ queryKey: partnerKeys.categoryList(filters), queryFn: () => paginated<ExpenseCategory>('/expense-categories', filters) }) }

export function usePartnerMutations() {
  const queryClient = useQueryClient()
  const invalidate = (key: readonly string[], id?: string) => { void queryClient.invalidateQueries({ queryKey: key }); if (id) void queryClient.invalidateQueries({ queryKey: [...key, 'detail', id] }) }
  const createCustomer = useMutation({ mutationFn: (payload: CustomerPayload) => request<Customer>({ method: 'POST', url: '/customers', data: payload }).then((r) => r.data), onSuccess: () => invalidate(partnerKeys.customers()) })
  const updateCustomer = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: CustomerPayload }) => request<Customer>({ method: 'PUT', url: `/customers/${id}`, data: payload }).then((r) => r.data), onSuccess: (row) => invalidate(partnerKeys.customers(), row.id) })
  const deactivateCustomer = useMutation({ mutationFn: (id: string) => request<Customer>({ method: 'DELETE', url: `/customers/${id}` }).then((r) => r.data), onSuccess: (row) => invalidate(partnerKeys.customers(), row.id) })
  const createSupplier = useMutation({ mutationFn: (payload: SupplierPayload) => request<Supplier>({ method: 'POST', url: '/suppliers', data: payload }).then((r) => r.data), onSuccess: () => invalidate(partnerKeys.suppliers()) })
  const updateSupplier = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: SupplierPayload }) => request<Supplier>({ method: 'PUT', url: `/suppliers/${id}`, data: payload }).then((r) => r.data), onSuccess: (row) => invalidate(partnerKeys.suppliers(), row.id) })
  const deactivateSupplier = useMutation({ mutationFn: (id: string) => request<Supplier>({ method: 'DELETE', url: `/suppliers/${id}` }).then((r) => r.data), onSuccess: (row) => invalidate(partnerKeys.suppliers(), row.id) })
  const createCategory = useMutation({ mutationFn: (payload: ExpenseCategoryPayload) => request<ExpenseCategory>({ method: 'POST', url: '/expense-categories', data: payload }).then((r) => r.data), onSuccess: () => invalidate(partnerKeys.categories()) })
  const updateCategory = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: ExpenseCategoryPayload }) => request<ExpenseCategory>({ method: 'PUT', url: `/expense-categories/${id}`, data: payload }).then((r) => r.data), onSuccess: () => invalidate(partnerKeys.categories()) })
  const deactivateCategory = useMutation({ mutationFn: (id: string) => request<ExpenseCategory>({ method: 'DELETE', url: `/expense-categories/${id}` }).then((r) => r.data), onSuccess: () => invalidate(partnerKeys.categories()) })
  return { createCustomer, updateCustomer, deactivateCustomer, createSupplier, updateSupplier, deactivateSupplier, createCategory, updateCategory, deactivateCategory }
}
