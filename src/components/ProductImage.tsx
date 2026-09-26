import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { productImageKind } from "../features/products/productUtils";

// Object URLs are cached per id/image_path pair: a query that TanStack Query
// garbage-collects and refetches must reuse the URL rather than mint a second
// one for the same bytes (each createObjectURL holds memory until revoked).
// Bounded by the catalogue size, and dropped wholesale on page unload.
const objectUrls = new Map<string, string>();

/**
 * A server-stored product image, fetched authenticated (the JWT lives in
 * localStorage, so a plain <img src> cannot carry it) and exposed as an
 * object URL. Legacy URL images are not fetched here — they render directly.
 * Local to this module: only ProductImage consumes it.
 */
function useProductImage(product: {
  id: string;
  image_path?: string | null;
}) {
  const kind = productImageKind(product.image_path);
  const imagePath = product.image_path || "";
  return useQuery({
    queryKey: ["products", "image", product.id, imagePath],
    queryFn: async () => {
      const cacheKey = `${product.id}/${imagePath}`;
      const cached = objectUrls.get(cacheKey);
      if (cached) return cached;
      try {
        const response = await api.get<Blob>(`/products/${product.id}/image`, {
          responseType: "blob",
        });
        const url = URL.createObjectURL(response.data);
        objectUrls.set(cacheKey, url);
        return url;
      } catch {
        // A missing or unreadable image renders the placeholder, like a
        // product that never had one.
        return null;
      }
    },
    enabled: kind === "server",
    staleTime: Infinity,
  });
}

/**
 * A product's picture in all three shapes `image_path` can take: a legacy full
 * URL renders directly; a server-stored filename is fetched authenticated;
 * neither applies and the fallback shows — including while the authenticated
 * fetch is in flight, so a card keeps its height.
 */
export function ProductImage({
  product,
  alt,
  fallback,
}: {
  product: { id: string; image_path?: string | null };
  alt: string;
  fallback: ReactNode;
}) {
  const kind = productImageKind(product.image_path);
  const imageQuery = useProductImage(product);
  if (kind === "url") return <img src={product.image_path || ""} alt={alt} />;
  if (kind === "server" && imageQuery.data) {
    return <img src={imageQuery.data} alt={alt} />;
  }
  return <>{fallback}</>;
}

/** A locally chosen file, previewed before any upload happens. */
export function FilePreview({ file }: { file: File }) {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url ? <img src={url} alt="Chosen image preview" /> : null;
}
