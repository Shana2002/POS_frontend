import { FormEvent, useState, type ReactNode } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ApiClientError } from "../../api/client";
import { useAuth } from "../../auth/authContext";
import {
  ConfirmationDialog,
  EmptyState,
  Pagination,
} from "../../components/AdminUI";
import { formatMoney } from "../../lib/money";
import {
  usePriceHistory,
  useProduct,
  useProductMovement,
  useProductMutations,
  useProducts,
} from "./productApi";
import { canShowProductCost, productDeactivationMessage } from "./productUtils";
import type { Product, ProductFormValues } from "./types";

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The request could not be completed.";
}
function fieldError(error: unknown, field: string): string | undefined {
  const value =
    error instanceof ApiClientError ? error.details?.[field] : undefined;
  return typeof value === "string"
    ? value
    : Array.isArray(value)
      ? String(value[0])
      : undefined;
}
function canManage(role?: string): boolean {
  return role === "ADMIN" || role === "HO_STAFF";
}
function money(value?: string): string {
  return value ? formatMoney(value) : "Not priced";
}

export function ProductsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const mutations = useProductMutations();
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<Product | null>(null);
  const filters = {
    search: params.get("search") || "",
    category: params.get("category") || "",
    active: params.get("active") || "",
    page: params.get("page") || "1",
    per_page: params.get("per_page") || "20",
  };
  const query = useProducts(filters);
  const rows = query.data?.rows || [];
  const manage = canManage(auth.user?.role);
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    setParams(next);
  };
  return (
    <div className="catalogue-page">
      <Header
        title="Products"
        description="Search the catalogue, review pricing, and inspect stock activity."
        action={
          manage ? (
            <button onClick={() => setCreating(true)}>Create product</button>
          ) : undefined
        }
      />
      <div className="catalogue-toolbar">
        <input
          aria-label="Search products"
          placeholder="Search by code or name"
          value={filters.search}
          onChange={(event) => setFilter("search", event.target.value)}
        />
        <input
          aria-label="Filter by category"
          placeholder="Category"
          value={filters.category}
          onChange={(event) => setFilter("category", event.target.value)}
        />
        <select
          aria-label="Filter by active status"
          value={filters.active}
          onChange={(event) => setFilter("active", event.target.value)}
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <button
          className="secondary-button"
          onClick={() => void query.refetch()}
        >
          Refresh
        </button>
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState title="Unable to load products" error={query.error} />
      ) : rows.length === 0 ? (
        <EmptyState title="No products found">
          Adjust the catalogue filters or create a product.
        </EmptyState>
      ) : (
        <div className="product-grid">
          {rows.map((product) => (
            <article className="product-card" key={product.id}>
              <Link
                to={`/products/${product.id}`}
                className="product-image"
                aria-label={`View ${product.name}`}
              >
                {product.image_path ? (
                  <img src={product.image_path} alt="" />
                ) : (
                  <span aria-hidden="true">{product.code.slice(0, 2)}</span>
                )}
              </Link>
              <div className="product-card-body">
                <div className="product-card-heading">
                  <span>{product.category}</span>
                  {product.is_low && (
                    <span className="low-stock">! Low stock</span>
                  )}
                </div>
                <Link to={`/products/${product.id}`}>
                  <strong>{product.name}</strong>
                </Link>
                <small>
                  {product.code} · {product.unit_of_measure}
                </small>
                <div className="product-card-price">
                  <strong>{money(product.unit_price)}</strong>
                  <span
                    className={
                      product.is_active
                        ? "availability active"
                        : "availability inactive"
                    }
                  >
                    {product.is_active ? "● Available" : "○ Inactive"}
                  </span>
                </div>
                {manage && (
                  <div className="table-actions">
                    <button
                      className="table-button"
                      onClick={() => setEditing(product)}
                    >
                      Edit
                    </button>
                    {product.is_active && (
                      <button
                        className="table-button"
                        onClick={() => setConfirm(product)}
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <Pagination
        page={Number(filters.page)}
        pages={query.data?.meta?.pages || 1}
        onPage={(page) => setFilter("page", String(page))}
      />
      {(creating || editing) && (
        <ProductForm
          product={editing}
          pending={mutations.create.isPending || mutations.update.isPending}
          error={mutations.create.error || mutations.update.error}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSubmit={async (values) => {
            if (editing)
              await mutations.update.mutateAsync({ id: editing.id, values });
            else {
              const created = await mutations.create.mutateAsync(values);
              navigate(`/products/${created.id}`);
            }
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
      <ConfirmationDialog
        open={Boolean(confirm)}
        title="Deactivate product"
        message={confirm ? productDeactivationMessage(confirm.name) : ""}
        pending={mutations.deactivate.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm)
            void mutations.deactivate
              .mutateAsync(confirm.id)
              .then(() => setConfirm(null));
        }}
      />
    </div>
  );
}

export function ProductDetailPage() {
  const auth = useAuth();
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const query = useProduct(id);
  const mutations = useProductMutations();
  const [editing, setEditing] = useState(false);
  const [pricing, setPricing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const tab = params.get("tab") || "overview";
  const product = query.data;
  const manage = canManage(auth.user?.role);
  const selectTab = (value: string) => {
    const next = new URLSearchParams(params);
    next.set("tab", value);
    setParams(next);
  };
  if (query.isPending) return <Loading />;
  if (query.isError || !product)
    return <ErrorState title="Unable to load product" error={query.error} />;
  return (
    <div className="catalogue-page">
      <Link className="back-link" to="/products">
        ← Back to products
      </Link>
      <Header
        title={product.name}
        description={`${product.code} · ${product.category} · ${product.unit_of_measure}`}
        action={
          manage ? (
            <div className="header-actions">
              <button
                className="secondary-button"
                onClick={() => setEditing(true)}
              >
                Edit product
              </button>
              <button onClick={() => setPricing(true)}>Change price</button>
            </div>
          ) : undefined
        }
      />
      <div className="detail-stat-grid">
        <Stat label="Selling price" value={money(product.unit_price)} />
        {canShowProductCost(product) && (
          <Stat label="Cost price" value={money(product.cost_price)} />
        )}
        <Stat label="Reorder level" value={product.reorder_level} />
        <Stat
          label="Status"
          value={product.is_active ? "● Active" : "○ Inactive"}
        />
      </div>
      <div className="detail-tabs" role="tablist">
        <button
          className={tab === "overview" ? "active" : ""}
          onClick={() => selectTab("overview")}
        >
          Overview
        </button>
        <button
          className={tab === "prices" ? "active" : ""}
          onClick={() => selectTab("prices")}
        >
          Price history
        </button>
        <button
          className={tab === "movement" ? "active" : ""}
          onClick={() => selectTab("movement")}
        >
          Movement history
        </button>
      </div>
      {tab === "overview" && (
        <Overview
          product={product}
          manage={manage}
          onDeactivate={() => setConfirm(true)}
        />
      )}
      {tab === "prices" && (
        <PriceHistory id={id} params={params} setParams={setParams} />
      )}
      {tab === "movement" && (
        <MovementHistory id={id} params={params} setParams={setParams} />
      )}
      {editing && (
        <ProductForm
          product={product}
          pending={mutations.update.isPending}
          error={mutations.update.error}
          onCancel={() => setEditing(false)}
          onSubmit={async (values) => {
            await mutations.update.mutateAsync({ id, values });
            setEditing(false);
          }}
        />
      )}
      {pricing && (
        <PriceDialog
          product={product}
          pending={mutations.changePrice.isPending}
          error={mutations.changePrice.error}
          onCancel={() => setPricing(false)}
          onSubmit={async (values) => {
            await mutations.changePrice.mutateAsync({ id, ...values });
            setPricing(false);
            selectTab("prices");
          }}
        />
      )}
      <ConfirmationDialog
        open={confirm}
        title="Deactivate product"
        message={productDeactivationMessage(product.name)}
        pending={mutations.deactivate.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() =>
          void mutations.deactivate
            .mutateAsync(id)
            .then(() => setConfirm(false))
        }
      />
    </div>
  );
}

function Overview({
  product,
  manage,
  onDeactivate,
}: {
  product: Product;
  manage: boolean;
  onDeactivate: () => void;
}) {
  return (
    <section className="detail-panel">
      <div className="product-overview-image">
        {product.image_path ? (
          <img src={product.image_path} alt={product.name} />
        ) : (
          <span>No image</span>
        )}
      </div>
      <dl>
        <div>
          <dt>Product code</dt>
          <dd>{product.code}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{product.category}</dd>
        </div>
        <div>
          <dt>Unit of measure</dt>
          <dd>{product.unit_of_measure}</dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd>{product.updated_at || "Not available"}</dd>
        </div>
      </dl>
      {manage && product.is_active && (
        <button className="danger-button" onClick={onDeactivate}>
          Deactivate product
        </button>
      )}
    </section>
  );
}

function PriceHistory({
  id,
  params,
  setParams,
}: {
  id: string;
  params: URLSearchParams;
  setParams: (params: URLSearchParams) => void;
}) {
  const page = params.get("price_page") || "1";
  const query = usePriceHistory(id, page);
  const move = (value: number) => {
    const next = new URLSearchParams(params);
    next.set("price_page", String(value));
    setParams(next);
  };
  if (query.isPending) return <Loading />;
  if (query.isError)
    return (
      <ErrorState title="Unable to load price history" error={query.error} />
    );
  if (!query.data?.rows.length)
    return (
      <EmptyState title="No price changes recorded">
        Price changes will appear here with their effective date.
      </EmptyState>
    );
  return (
    <>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Effective from</th>
              <th>Selling price</th>
              {query.data.rows.some((row) => row.cost_price !== undefined) && (
                <th>Cost price</th>
              )}
              <th>Changed by</th>
              <th>Recorded</th>
            </tr>
          </thead>
          <tbody>
            {query.data.rows.map((row) => (
              <tr key={row.id}>
                <td>{row.effective_from}</td>
                <td>
                  <strong>{money(row.price)}</strong>
                </td>
                {query.data.rows.some(
                  (entry) => entry.cost_price !== undefined,
                ) && <td>{row.cost_price ? money(row.cost_price) : "—"}</td>}
                <td>{row.changed_by}</td>
                <td>{row.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={Number(page)}
        pages={query.data.meta?.pages || 1}
        onPage={move}
      />
    </>
  );
}

function MovementHistory({
  id,
  params,
  setParams,
}: {
  id: string;
  params: URLSearchParams;
  setParams: (
    params: URLSearchParams | ((current: URLSearchParams) => URLSearchParams),
  ) => void;
}) {
  const filters = {
    branch_id: params.get("branch_id") || "",
    from: params.get("from") || "",
    to: params.get("to") || "",
    type: params.get("type") || "",
    page: params.get("movement_page") || "1",
    per_page: "20",
  };
  const query = useProductMovement(id, filters);
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "movement_page") next.set("movement_page", "1");
    setParams(next);
  };
  return (
    <section>
      <div className="movement-filters">
        <input
          aria-label="Movement branch ID"
          placeholder="Branch ID"
          value={filters.branch_id}
          onChange={(event) => set("branch_id", event.target.value)}
        />
        <input
          aria-label="Movement from date"
          type="date"
          value={filters.from}
          onChange={(event) => set("from", event.target.value)}
        />
        <input
          aria-label="Movement to date"
          type="date"
          value={filters.to}
          onChange={(event) => set("to", event.target.value)}
        />
        <input
          aria-label="Movement type"
          placeholder="Movement type"
          value={filters.type}
          onChange={(event) => set("type", event.target.value)}
        />
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState
          title="Unable to load movement history"
          error={query.error}
        />
      ) : query.data ? (
        <>
          <div className="movement-summary">
            <Stat label="Opening balance" value={query.data.opening_balance} />
            <Stat label="Quantity in" value={query.data.total_in} />
            <Stat label="Quantity out" value={query.data.total_out} />
            <Stat label="Closing balance" value={query.data.closing_balance} />
          </div>
          {query.data.rows.length === 0 ? (
            <EmptyState title="No movements found">
              Adjust the movement filters.
            </EmptyState>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Branch</th>
                    <th>Type</th>
                    <th>In</th>
                    <th>Out</th>
                    <th>Reference</th>
                    <th>Running balance</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.rows.map(({ movement, running_balance }) => (
                    <tr key={movement.id}>
                      <td>{movement.movement_date}</td>
                      <td>{movement.branch_code}</td>
                      <td>{movement.movement_type}</td>
                      <td>{movement.qty_in}</td>
                      <td>{movement.qty_out}</td>
                      <td>
                        {movement.reference_type}
                        <small>{movement.reference_id}</small>
                      </td>
                      <td>
                        <strong>{running_balance}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <nav className="pagination" aria-label="Movement pagination">
            <button
              className="secondary-button"
              disabled={Number(filters.page) <= 1}
              onClick={() =>
                set("movement_page", String(Number(filters.page) - 1))
              }
            >
              Previous
            </button>
            <span>
              Page {filters.page} · {query.data.movement_count} movements
            </span>
            <button
              className="secondary-button"
              disabled={query.data.rows.length < 20}
              onClick={() =>
                set("movement_page", String(Number(filters.page) + 1))
              }
            >
              Next
            </button>
          </nav>
        </>
      ) : null}
    </section>
  );
}

function ProductForm({
  product,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  product: Product | null;
  pending: boolean;
  error: unknown;
  onCancel: () => void;
  onSubmit: (values: ProductFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<ProductFormValues>({
    code: product?.code || "",
    name: product?.name || "",
    category: product?.category || "",
    unit_price: product?.unit_price || "",
    cost_price: product?.cost_price || "",
    reorder_level: product?.reorder_level || "",
    unit_of_measure: product?.unit_of_measure || "",
    image_path: product?.image_path || "",
    is_active: product?.is_active ?? true,
  });
  const set = (key: keyof ProductFormValues, value: string | boolean) =>
    setValues((current) => ({ ...current, [key]: value }));
  return (
    <Modal
      title={product ? "Edit product" : "Create product"}
      onClose={onCancel}
    >
      <form
        className="admin-form"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit(values);
        }}
      >
        <Field
          label="Code"
          value={values.code}
          onChange={(value) => set("code", value)}
          error={fieldError(error, "code")}
          required
          readOnly={Boolean(product)}
          hint={
            product
              ? "Product codes cannot be changed after creation."
              : undefined
          }
        />
        <Field
          label="Name"
          value={values.name}
          onChange={(value) => set("name", value)}
          error={fieldError(error, "name")}
          required
        />
        <Field
          label="Category"
          value={values.category}
          onChange={(value) => set("category", value)}
          error={fieldError(error, "category")}
          required
        />
        {!product && (
          <Field
            label="Initial selling price"
            type="text"
            inputMode="decimal"
            value={values.unit_price || ""}
            onChange={(value) => set("unit_price", value)}
            error={fieldError(error, "unit_price")}
          />
        )}
        {!product && (
          <Field
            label="Initial cost price (optional)"
            type="text"
            inputMode="decimal"
            value={values.cost_price || ""}
            onChange={(value) => set("cost_price", value)}
            error={fieldError(error, "cost_price")}
          />
        )}
        <Field
          label="Reorder level"
          type="text"
          inputMode="decimal"
          value={values.reorder_level}
          onChange={(value) => set("reorder_level", value)}
          error={fieldError(error, "reorder_level")}
          required
        />
        <Field
          label="Unit of measure"
          value={values.unit_of_measure}
          onChange={(value) => set("unit_of_measure", value)}
          error={fieldError(error, "unit_of_measure")}
          required
        />
        <Field
          label="Image URL (optional)"
          value={values.image_path || ""}
          onChange={(value) => set("image_path", value)}
          error={fieldError(error, "image_path")}
        />
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
          <button disabled={pending}>
            {pending ? "Saving..." : "Save product"}
          </button>
        </div>
        {Boolean(error) && (
          <div className="form-message error" role="alert">
            {errorMessage(error)}
          </div>
        )}
      </form>
    </Modal>
  );
}

function PriceDialog({
  product,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  product: Product;
  pending: boolean;
  error: unknown;
  onCancel: () => void;
  onSubmit: (values: {
    price: string;
    cost_price?: string;
    effective_from?: string;
  }) => Promise<void>;
}) {
  const [price, setPrice] = useState(product.unit_price || "");
  const [cost, setCost] = useState(product.cost_price || "");
  const [date, setDate] = useState("");
  return (
    <Modal title="Change product price" onClose={onCancel}>
      <form
        className="admin-form"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void onSubmit({
            price,
            cost_price: canShowProductCost(product) ? cost : undefined,
            effective_from: date || undefined,
          });
        }}
      >
        <p>
          Price changes are recorded separately from ordinary catalogue edits.
        </p>
        <Field
          label="Selling price"
          value={price}
          onChange={setPrice}
          error={fieldError(error, "price")}
          required
          inputMode="decimal"
        />
        {canShowProductCost(product) && (
          <Field
            label="Cost price (optional)"
            value={cost}
            onChange={setCost}
            error={fieldError(error, "cost_price")}
            inputMode="decimal"
          />
        )}
        <Field
          label="Effective from (optional)"
          type="date"
          value={date}
          onChange={setDate}
          error={fieldError(error, "effective_from")}
        />
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
          <button disabled={pending}>
            {pending ? "Changing..." : "Confirm price change"}
          </button>
        </div>
        {Boolean(error) && (
          <div className="form-message error" role="alert">
            {errorMessage(error)}
          </div>
        )}
      </form>
    </Modal>
  );
}

function Header({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading catalogue-header">
      <div>
        <span className="section-kicker">Catalogue</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="detail-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  error,
  required,
  readOnly,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: "decimal";
  error?: string;
  required?: boolean;
  readOnly?: boolean;
  hint?: string;
}) {
  return (
    <label>
      {label}
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        readOnly={readOnly}
      />
      {hint && <small className="field-hint">{hint}</small>}
      <small className="field-error">{error || ""}</small>
    </label>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
      >
        <div className="modal-heading">
          <h2 id="product-modal-title">{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function Loading() {
  return (
    <div className="loading-block" role="status">
      Loading catalogue...
    </div>
  );
}
function ErrorState({ title, error }: { title: string; error: unknown }) {
  return (
    <div className="inline-error" role="alert">
      <strong>{title}</strong>
      <span>{errorMessage(error)}</span>
    </div>
  );
}
