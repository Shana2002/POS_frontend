import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "../../api/client";
import {
  buildMovementParams,
  productCreatePayload,
  productUpdatePayload,
} from "./productUtils";
import type {
  MovementFilters,
  Pagination,
  PriceHistoryEntry,
  Product,
  ProductFormValues,
  ProductListFilters,
  ProductMovement,
} from "./types";

function listParams(
  filters: ProductListFilters,
): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(filters).flatMap(([key, value]) =>
      value
        ? [[key, key === "page" || key === "per_page" ? Number(value) : value]]
        : [],
    ),
  );
}

export const productKeys = {
  lists: () => ["products", "list"] as const,
  list: (filters: ProductListFilters) => ["products", "list", filters] as const,
  detail: (id: string) => ["products", "detail", id] as const,
  priceHistory: (id: string, page: string) =>
    ["products", "price-history", id, page] as const,
  movement: (id: string, filters: MovementFilters) =>
    ["products", "movement", id, filters] as const,
};

export function useProducts(filters: ProductListFilters) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: async () => {
      const response = await request<Product[]>({
        method: "GET",
        url: "/products",
        params: listParams(filters),
      });
      return {
        rows: response.data,
        meta: response.meta as Pagination | undefined,
      };
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: async () =>
      (await request<Product>({ method: "GET", url: `/products/${id}` })).data,
    enabled: Boolean(id),
  });
}

export function usePriceHistory(id: string, page: string) {
  return useQuery({
    queryKey: productKeys.priceHistory(id, page),
    queryFn: async () => {
      const response = await request<PriceHistoryEntry[]>({
        method: "GET",
        url: `/products/${id}/price-history`,
        params: { page: Number(page) },
      });
      return {
        rows: response.data,
        meta: response.meta as Pagination | undefined,
      };
    },
    enabled: Boolean(id),
  });
}

export function useProductMovement(id: string, filters: MovementFilters) {
  return useQuery({
    queryKey: productKeys.movement(id, filters),
    queryFn: async () => {
      const response = await request<ProductMovement>({
        method: "GET",
        url: `/products/${id}/movement`,
        params: buildMovementParams(filters),
      });
      if (response.data) return response.data;

      const payload = response.response.data as unknown as {
        meta: Omit<ProductMovement, "rows">;
        rows: ProductMovement["rows"];
      };
      return { ...payload.meta, rows: payload.rows };
    },
    enabled: Boolean(id),
  });
}

export function useProductMutations() {
  const queryClient = useQueryClient();
  const invalidateProducts = (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    if (id) {
      void queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
      void queryClient.invalidateQueries({
        queryKey: ["products", "price-history", id],
      });
      void queryClient.invalidateQueries({
        queryKey: ["products", "movement", id],
      });
    }
    void queryClient.invalidateQueries({ queryKey: ["stock"] });
  };
  const create = useMutation({
    mutationFn: (values: ProductFormValues) =>
      request<Product>({
        method: "POST",
        url: "/products",
        data: productCreatePayload(values),
      }).then((result) => result.data),
    onSuccess: () => invalidateProducts(),
  });
  const update = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ProductFormValues }) =>
      request<Product>({
        method: "PUT",
        url: `/products/${id}`,
        data: productUpdatePayload(values),
      }).then((result) => result.data),
    onSuccess: (product) => invalidateProducts(product.id),
  });
  const deactivate = useMutation({
    mutationFn: (id: string) =>
      request<Product>({ method: "DELETE", url: `/products/${id}` }).then(
        (result) => result.data,
      ),
    onSuccess: (product) => invalidateProducts(product.id),
  });
  const changePrice = useMutation({
    mutationFn: ({
      id,
      price,
      cost_price,
      effective_from,
    }: {
      id: string;
      price: string;
      cost_price?: string;
      effective_from?: string;
    }) =>
      request<Product>({
        method: "POST",
        url: `/products/${id}/price`,
        data: {
          price,
          cost_price: cost_price || undefined,
          effective_from: effective_from || undefined,
        },
      }).then((result) => result.data),
    onSuccess: (product) => invalidateProducts(product.id),
  });
  return { create, update, deactivate, changePrice };
}
