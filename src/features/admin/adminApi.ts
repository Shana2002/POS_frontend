import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { request } from '../../api/client'
import type { User } from '../../auth/types'
import { buildListParams } from './adminUtils'
import type { Branch, BranchPayload, ListFilters, Pagination, Setting, UserPayload } from './types'

export const adminKeys = {
  users: (filters: ListFilters = {}) => ['admin', 'users', filters] as const,
  user: (id: string) => ['admin', 'user', id] as const,
  branches: (filters: ListFilters = {}) => ['admin', 'branches', filters] as const,
  branch: (id: string) => ['admin', 'branch', id] as const,
  settings: ['admin', 'settings'] as const,
  setting: (key: string) => ['admin', 'setting', key] as const,
}

export function useUsers(filters: ListFilters) {
  return useQuery({ queryKey: adminKeys.users(filters), queryFn: async () => { const result = await request<User[]>({ method: 'GET', url: '/users', params: buildListParams(filters) }); return { rows: result.data, meta: result.meta as Pagination | undefined } } })
}
export function useUser(id: string) { return useQuery({ queryKey: adminKeys.user(id), queryFn: async () => (await request<User>({ method: 'GET', url: `/users/${id}` })).data, enabled: Boolean(id) }) }
export function useBranches(filters: ListFilters) {
  return useQuery({ queryKey: adminKeys.branches(filters), queryFn: async () => { const result = await request<Branch[]>({ method: 'GET', url: '/branches', params: buildListParams(filters) }); return { rows: result.data, meta: result.meta as Pagination | undefined } } })
}
export function useBranch(id: string) { return useQuery({ queryKey: adminKeys.branch(id), queryFn: async () => (await request<Branch>({ method: 'GET', url: `/branches/${id}` })).data, enabled: Boolean(id) }) }
export function useSettings() { return useQuery({ queryKey: adminKeys.settings, queryFn: async () => (await request<Setting[]>({ method: 'GET', url: '/settings' })).data }) }
export function useSetting(key: string) { return useQuery({ queryKey: adminKeys.setting(key), queryFn: async () => (await request<Setting>({ method: 'GET', url: `/settings/${key}` })).data, enabled: Boolean(key) }) }

export function useAdminMutations() {
  const queryClient = useQueryClient()
  const invalidateUsers = () => { void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] }) }
  const invalidateBranches = () => { void queryClient.invalidateQueries({ queryKey: ['admin', 'branches'] }); void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }) }
  const invalidateSettings = () => { void queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] }) }
  const createUser = useMutation({ mutationFn: (payload: UserPayload) => request<User>({ method: 'POST', url: '/users', data: payload }).then((result) => result.data), onSuccess: invalidateUsers })
  const updateUser = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: Partial<UserPayload> }) => request<User>({ method: 'PUT', url: `/users/${id}`, data: payload }).then((result) => result.data), onSuccess: invalidateUsers })
  const setUserStatus = useMutation({ mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => request<User>({ method: 'PATCH', url: `/users/${id}/status`, data: { is_active } }).then((result) => result.data), onSuccess: invalidateUsers })
  const createBranch = useMutation({ mutationFn: (payload: BranchPayload) => request<Branch>({ method: 'POST', url: '/branches', data: payload }).then((result) => result.data), onSuccess: invalidateBranches })
  const updateBranch = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: Partial<BranchPayload> }) => request<Branch>({ method: 'PUT', url: `/branches/${id}`, data: payload }).then((result) => result.data), onSuccess: invalidateBranches })
  const deactivateBranch = useMutation({ mutationFn: (id: string) => request<Branch>({ method: 'DELETE', url: `/branches/${id}` }).then((result) => result.data), onSuccess: invalidateBranches })
  const updateSetting = useMutation({ mutationFn: ({ key, value, data_type }: { key: string; value: string; data_type?: string }) => request<Setting>({ method: 'PUT', url: `/settings/${key}`, data: { value, data_type } }).then((result) => result.data), onSuccess: invalidateSettings })
  return { createUser, updateUser, setUserStatus, createBranch, updateBranch, deactivateBranch, updateSetting }
}
