import type { MovementFilters, Product, ProductFormValues, ProductPayload } from './types'

export function canShowProductCost(product: Product): boolean {
  return Object.prototype.hasOwnProperty.call(product, 'cost_price')
}

export function productUpdatePayload(values: ProductFormValues): ProductPayload {
  return {
    code: values.code,
    name: values.name,
    category: values.category,
    reorder_level: values.reorder_level,
    unit_of_measure: values.unit_of_measure,
    image_path: values.image_path || undefined,
    is_active: values.is_active,
  }
}

export function productCreatePayload(values: ProductFormValues): ProductPayload {
  return {
    ...productUpdatePayload(values),
    unit_price: values.unit_price || undefined,
    cost_price: values.cost_price || undefined,
  }
}

export function buildMovementParams(filters: MovementFilters): Record<string, string | number> {
  const keys: Array<keyof MovementFilters> = ['branch_id', 'from', 'to', 'type', 'page', 'per_page']
  return Object.fromEntries(keys.flatMap((key) => {
    const value = filters[key]
    if (!value) return []
    return [[key, key === 'page' || key === 'per_page' ? Number(value) : value]]
  }))
}

export function productDeactivationMessage(name: string): string {
  return `Deactivate ${name}? It will remain visible in historical records but cannot be selected for new transactions.`
}
