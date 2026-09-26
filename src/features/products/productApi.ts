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
  ProductCategory,
  ProductCategoryFilters,
  ProductCategoryPayload,
  ProductFormValues,
  ProductListFilters,
  ProductMovement,
} from "./types";

function listParams(
  filters: ProductListFilters | ProductCategoryFilters,
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
  categories: () => ["product-categories"] as const,
  categoryList: (filters: ProductCategoryFilters) =>
    ["product-categories", "list", filters] as const,
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
      // The endpoint sends the ledger rows in `data` and the window summary
      // (opening/closing balance, totals, movement_count) in `meta` — combine
      // them into the ProductMovement shape the pages expect.
      const response = await request<ProductMovement["rows"]>({
        method: "GET",
        url: `/products/${id}/movement`,
        params: buildMovementParams(filters),
      });
      const summary = response.meta as unknown as Omit<
        ProductMovement,
        "rows"
      >;
      return { ...summary, rows: response.data };
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
  const uploadImage = useMutation({
    // A FormData body. The instance's default JSON Content-Type must be
    // removed for this one request, or axios stringifies the FormData into a
    // JSON body (defaults transformRequest) and the backend sees no file
    // part. `false` is axios's "send without this header": the browser then
    // sets multipart/form-data with the boundary itself. It must not be set
    // to 'multipart/form-data' manually — this axios build would send it
    // without a boundary.
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      const data = new FormData();
      data.append("image", file);
      return request<Product>({
        method: "POST",
        url: `/products/${id}/image`,
        data,
        headers: { "Content-Type": false },
      }).then((result) => result.data);
    },
    onSuccess: (product) => invalidateProducts(product.id),
  });
  const removeImage = useMutation({
    mutationFn: (id: string) =>
      request<Product>({ method: "DELETE", url: `/products/${id}/image` }).then(
        (result) => result.data,
      ),
    onSuccess: (product) => invalidateProducts(product.id),
  });
  return { create, update, deactivate, changePrice, uploadImage, removeImage };
}

export function useProductCategories(filters: ProductCategoryFilters) {
  return useQuery({
    queryKey: productKeys.categoryList(filters),
    queryFn: async () => {
      const response = await request<ProductCategory[]>({
        method: "GET",
        url: "/product-categories",
        params: listParams(filters),
      });
      return {
        rows: response.data,
        meta: response.meta as Pagination | undefined,
      };
    },
  });
}

export function useProductCategoryMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: productKeys.categories() });
    // Products embed category_code/name, so a rename must refresh them too.
    void queryClient.invalidateQueries({ queryKey: productKeys.lists() });
  };
  const create = useMutation({
    mutationFn: (payload: ProductCategoryPayload) =>
      request<ProductCategory>({
        method: "POST",
        url: "/product-categories",
        data: payload,
      }).then((result) => result.data),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProductCategoryPayload }) =>
      request<ProductCategory>({
        method: "PUT",
        url: `/product-categories/${id}`,
        data: payload,
      }).then((result) => result.data),
    onSuccess: invalidate,
  });
  const deactivate = useMutation({
    mutationFn: (id: string) =>
      request<ProductCategory>({
        method: "DELETE",
        url: `/product-categories/${id}`,
      }).then((result) => result.data),
    onSuccess: invalidate,
  });
  return { create, update, deactivate };
}
