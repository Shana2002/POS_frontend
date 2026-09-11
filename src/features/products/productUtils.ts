import type { MovementFilters, Product, ProductFormValues, ProductPayload } from './types'

export function canShowProductCost(product: Product): boolean {
  return Object.prototype.hasOwnProperty.call(product, 'cost_price')
}

/**
 * How a product's `image_path` should be rendered: a legacy full URL (rows
 * created before uploads existed) renders directly; anything else is a
 * server-stored filename fetched authenticated via GET /products/:id/image.
 */
export type ProductImageKind = 'none' | 'url' | 'server'

export function productImageKind(imagePath: string | null | undefined): ProductImageKind {
  if (!imagePath) return 'none'
  if (/^(https?:)?\/\//i.test(imagePath) || imagePath.startsWith('data:')) return 'url'
  return 'server'
}

export function productUpdatePayload(values: ProductFormValues): ProductPayload {
  // image_path is deliberately absent: the image is managed by the dedicated
  // upload/remove endpoints, never the JSON create/update body.
  return {
    code: values.code,
    name: values.name,
    category_id: values.category_id,
    reorder_level: values.reorder_level,
    unit_of_measure: values.unit_of_measure,
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

export function productCategoryDeactivationMessage(name: string): string {
  return `Deactivate ${name}? Existing products keep this category, but it can no longer be chosen when registering or editing a product.`
}
