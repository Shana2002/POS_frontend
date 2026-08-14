import { useQuery } from '@tanstack/react-query'
import { request } from './client'

export type Health = { status: 'ok' | string; db: 'ok' | string }

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => (await request<Health>({ url: '/health' })).data,
    refetchInterval: 30_000,
    retry: 1,
  })
}
