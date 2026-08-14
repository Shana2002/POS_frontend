type QueryClientLike = {
  invalidateQueries: (options: { queryKey: readonly unknown[] }) => Promise<unknown> | unknown
}

export const financialQueryFamilies = ['reports'] as const

export function invalidateFinancialQueries(client: QueryClientLike, families: readonly string[]): void {
  for (const family of families) {
    void client.invalidateQueries({ queryKey: [family] })
  }
}
