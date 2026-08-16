import { useState, type FormEvent, type ReactNode } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { EmptyState, Pagination } from "../../components/AdminUI";
import { formatMoney } from "../../lib/money";
import { useBranches } from "../admin/adminApi";
import { useSuppliers } from "../partners/partnerApi";
import { useProducts } from "../products/productApi";
import {
  useOutstandingPayables,
  usePurchaseMutations,
  usePurchaseOrder,
  usePurchaseOrders,
  useSupplierPayments,
} from "./purchaseApi";
import {
  canEditPurchaseOrder,
  canOrderPurchaseOrder,
  canViewPurchaseCosts,
  buildReceivePayload,
  hasDuplicateProducts,
  isReceiveable,
  normalizePurchaseLines,
  payableMoney,
  payableRows,
  paymentRows,
  receiveLineError,
} from "./purchaseUtils";
import type {
  PaymentResult,
  PurchaseLineInput,
  PurchaseOrder,
  PurchasePayload,
  ReceiptResult,
} from "./types";

const rolesWithGlobalBranch = ["ADMIN", "HO_STAFF", "ACCOUNTS"];
const emptyLine = (): PurchaseLineInput => ({
  product_id: "",
  qty: "",
  unit_cost: "",
});
function msg(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The request could not be completed.";
}
function setUrl(
  setParams: (
    value: URLSearchParams | ((current: URLSearchParams) => URLSearchParams),
  ) => void,
  key: string,
  value: string,
) {
  setParams((current) => {
    const next = new URLSearchParams(current);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    return next;
  });
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
    <>
      <div className="page-heading purchase-header">
        <div>
          <span className="section-kicker">Procurement</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {action}
      </div>
      <nav className="purchase-tabs" aria-label="Purchasing views">
        <Link to="/purchase-orders">Purchase orders</Link>
        <Link to="/payables">Outstanding payables</Link>
      </nav>
    </>
  );
}
function Loading() {
  return (
    <div className="loading-block" role="status">
      Loading purchasing records...
    </div>
  );
}
function ErrorState({ error }: { error: unknown }) {
  return (
    <div className="inline-error" role="alert">
      <strong>Unable to complete the request</strong>
      <span>{msg(error)}</span>
    </div>
  );
}
function Status({ status }: { status: string }) {
  const tone = status.toLowerCase().replaceAll("_", "-");
  return (
    <span className={`po-status ${tone}`}>
      <span aria-hidden="true">●</span>
      {status.replaceAll("_", " ")}
    </span>
  );
}

function useBranchScope(params: URLSearchParams) {
  const auth = useAuth();
  const locked = !rolesWithGlobalBranch.includes(auth.user!.role);
  return {
    auth,
    locked,
    branchId: locked
      ? auth.user!.branch_id || ""
      : params.get("branch_id") || "",
  };
}
function BranchControl({
  value,
  locked,
  onChange,
}: {
  value: string;
  locked: boolean;
  onChange: (value: string) => void;
}) {
  const query = useBranches({ active: "true", per_page: "100" });
  const row = query.data?.rows.find((branch) => branch.id === value);
  return (
    <label>
      Branch
      {locked ? (
        <input
          aria-label="Assigned purchase branch"
          value={row ? `${row.code} · ${row.name}` : value}
          readOnly
        />
      ) : (
        <select
          aria-label="Purchase branch"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">All branches</option>
          {query.data?.rows.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.code} · {branch.name}
            </option>
          ))}
        </select>
      )}
    </label>
  );
}

export function PurchaseOrdersPage() {
  const [params, setParams] = useSearchParams();
  const { auth, locked, branchId } = useBranchScope(params);
  const filters = {
    branch_id: branchId,
    supplier_id: params.get("supplier_id") || "",
    status: params.get("status") || "",
    from: params.get("from") || "",
    to: params.get("to") || "",
    page: params.get("page") || "1",
    per_page: "20",
  };
  const query = usePurchaseOrders(filters);
  const suppliers = useSuppliers({ active: "true", per_page: "100" });
  const costs = canViewPurchaseCosts(auth.user?.role);
  const rows = query.data?.rows || [];
  const set = (key: string, value: string) => setUrl(setParams, key, value);
  return (
    <div className="purchase-page">
      <Header
        title="Purchase orders"
        description="Draft, receive, and settle supplier orders using server-calculated totals."
        action={
          <Link className="primary-link" to="/purchase-orders/new">
            Create purchase order
          </Link>
        }
      />
      <div className="purchase-toolbar">
        <BranchControl
          value={branchId}
          locked={locked}
          onChange={(v) => set("branch_id", v)}
        />
        <label>
          Supplier
          <select
            aria-label="Filter purchase supplier"
            value={filters.supplier_id}
            onChange={(e) => set("supplier_id", e.target.value)}
          >
            <option value="">All suppliers</option>
            {suppliers.data?.rows.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.code} · {supplier.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            aria-label="Filter purchase status"
            value={filters.status}
            onChange={(e) => set("status", e.target.value)}
          >
            <option value="">All statuses</option>
            <option>DRAFT</option>
            <option>ORDERED</option>
            <option>PARTIALLY_RECEIVED</option>
            <option>RECEIVED</option>
            <option>CLOSED</option>
          </select>
        </label>
        <label>
          From
          <input
            aria-label="Purchase orders from"
            type="date"
            value={filters.from}
            onChange={(e) => set("from", e.target.value)}
          />
        </label>
        <label>
          To
          <input
            aria-label="Purchase orders to"
            type="date"
            value={filters.to}
            onChange={(e) => set("to", e.target.value)}
          />
        </label>
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState error={query.error} />
      ) : !rows.length ? (
        <EmptyState title="No purchase orders found">
          Create an order or adjust the register filters.
        </EmptyState>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table po-table">
            <thead>
              <tr>
                <th>Purchase order</th>
                <th>Supplier</th>
                <th>Branch</th>
                <th>Order date</th>
                <th>Status</th>
                {costs && (
                  <>
                    <th>Total</th>
                    <th>Balance</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((po) => (
                <tr key={po.id}>
                  <td>
                    <Link to={`/purchase-orders/${po.id}`}>
                      <strong>{po.po_no}</strong>
                    </Link>
                  </td>
                  <td>
                    {po.supplier_code}
                    <small>{po.supplier_name}</small>
                  </td>
                  <td>{po.branch_code}</td>
                  <td>{po.order_date}</td>
                  <td>
                    <Status status={po.status} />
                  </td>
                  {costs && (
                    <>
                      <td>{formatMoney(po.total_amount)}</td>
                      <td>
                        <strong>{formatMoney(po.balance)}</strong>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        page={Number(filters.page)}
        pages={query.data?.meta?.pages || 1}
        onPage={(page) => set("page", String(page))}
      />
    </div>
  );
}

export function PurchaseOrderEditorPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const existing = usePurchaseOrder(id);
  const mutations = usePurchaseMutations();
  const editing = Boolean(id);
  const po = existing.data;
  if (editing && existing.isPending) return <Loading />;
  if (editing && (!po || existing.isError))
    return <ErrorState error={existing.error} />;
  if (po && !canEditPurchaseOrder(po.status))
    return (
      <div className="purchase-page">
        <Header
          title="Purchase order is read only"
          description="Draft-only editing ended after the lifecycle transition."
        />
        <Link className="primary-link" to={`/purchase-orders/${po.id}`}>
          View purchase order
        </Link>
      </div>
    );
  return (
    <PurchaseForm
      initial={po}
      branchId={auth.user?.branch_id || ""}
      locked={!rolesWithGlobalBranch.includes(auth.user!.role)}
      pending={mutations.create.isPending || mutations.update.isPending}
      error={mutations.create.error || mutations.update.error}
      onSubmit={async (payload) => {
        const saved = editing
          ? await mutations.update.mutateAsync({ id, payload })
          : await mutations.create.mutateAsync(payload);
        navigate(`/purchase-orders/${saved.id}`);
      }}
    />
  );
}

function PurchaseForm({
  initial,
  branchId,
  locked,
  pending,
  error,
  onSubmit,
}: {
  initial?: PurchaseOrder;
  branchId: string;
  locked: boolean;
  pending: boolean;
  error: unknown;
  onSubmit: (payload: PurchasePayload) => Promise<void>;
}) {
  const [supplierId, setSupplierId] = useState(initial?.supplier_id || "");
  const [branch, setBranch] = useState(initial?.branch_id || branchId);
  const [orderDate, setOrderDate] = useState(initial?.order_date || "");
  const [expectedDate, setExpectedDate] = useState(
    initial?.expected_date || "",
  );
  const [broughtForward, setBroughtForward] = useState(
    initial?.brought_forward || "0.00",
  );
  const [remarks, setRemarks] = useState(initial?.remarks || "");
  const [lines, setLines] = useState<PurchaseLineInput[]>(
    initial?.lines.map((line) => ({
      product_id: line.product_id,
      qty: line.qty,
      unit_cost: line.unit_cost || "",
    })) || [emptyLine()],
  );
  const suppliers = useSuppliers({ active: "true", per_page: "100" });
  const products = useProducts({ active: "true", per_page: "100" });
  const branches = useBranches({ active: "true", per_page: "100" });
  const duplicate = hasDuplicateProducts(lines);
  const updateLine = (
    index: number,
    key: keyof PurchaseLineInput,
    value: string,
  ) =>
    setLines((current) =>
      current.map((line, i) =>
        i === index ? { ...line, [key]: value } : line,
      ),
    );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizePurchaseLines(lines);
    if (
      !supplierId ||
      !branch ||
      duplicate ||
      normalized.length !== lines.length
    )
      return;
    void onSubmit({
      supplier_id: supplierId,
      branch_id: branch,
      order_date: orderDate || undefined,
      expected_date: expectedDate || undefined,
      brought_forward: broughtForward || undefined,
      remarks: remarks || undefined,
      lines: normalized,
    });
  };
  return (
    <div className="purchase-page wide">
      <Link
        className="back-link"
        to={initial ? `/purchase-orders/${initial.id}` : "/purchase-orders"}
      >
        ← Back to purchase orders
      </Link>
      <Header
        title={initial ? `Edit ${initial.po_no}` : "New purchase order"}
        description="Enter draft lines once per product. Totals appear after the backend saves the order."
      />
      <form className="po-editor" onSubmit={submit}>
        <section className="po-fields">
          <label>
            Supplier
            <select
              aria-label="Purchase order supplier"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
            >
              <option value="">Select supplier</option>
              {suppliers.data?.rows.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.code} · {supplier.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Branch
            {locked ? (
              <input
                aria-label="Purchase order assigned branch"
                value={
                  branches.data?.rows.find((row) => row.id === branch)?.name ||
                  branch
                }
                readOnly
              />
            ) : (
              <select
                aria-label="Purchase order branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                required
              >
                <option value="">Select branch</option>
                {branches.data?.rows.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.code} · {row.name}
                  </option>
                ))}
              </select>
            )}
          </label>
          <label>
            Order date
            <input
              aria-label="Purchase order date"
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
            />
          </label>
          <label>
            Expected date
            <input
              aria-label="Purchase expected date"
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
            />
          </label>
          <label>
            Brought forward
            <input
              aria-label="Purchase brought forward"
              inputMode="decimal"
              value={broughtForward}
              onChange={(e) => setBroughtForward(e.target.value)}
            />
          </label>
          <label>
            Remarks
            <input
              aria-label="Purchase remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </label>
        </section>
        <section className="po-line-editor">
          <div className="po-line heading">
            <span>Product</span>
            <span>Quantity</span>
            <span>Unit cost</span>
            <span>Action</span>
          </div>
          {lines.map((line, index) => (
            <div
              className={`po-line ${lines.filter((item) => item.product_id === line.product_id && line.product_id).length > 1 ? "invalid" : ""}`}
              key={index}
            >
              <select
                aria-label={`Line ${index + 1} product`}
                value={line.product_id}
                onChange={(e) =>
                  updateLine(index, "product_id", e.target.value)
                }
                required
              >
                <option value="">Select product</option>
                {products.data?.rows.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.code} · {product.name}
                  </option>
                ))}
              </select>
              <input
                aria-label={`Line ${index + 1} quantity`}
                inputMode="decimal"
                value={line.qty}
                onChange={(e) => updateLine(index, "qty", e.target.value)}
                required
              />
              <input
                aria-label={`Line ${index + 1} unit cost`}
                inputMode="decimal"
                value={line.unit_cost}
                onChange={(e) => updateLine(index, "unit_cost", e.target.value)}
                required
              />
              <button
                type="button"
                className="table-button"
                disabled={lines.length === 1}
                onClick={() =>
                  setLines((current) => current.filter((_, i) => i !== index))
                }
              >
                Remove
              </button>
            </div>
          ))}
        </section>
        {duplicate && (
          <div className="form-message error" role="alert">
            Each product can appear only once.
          </div>
        )}
        <div className="po-editor-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setLines((current) => [...current, emptyLine()])}
          >
            Add line
          </button>
          <button disabled={pending || duplicate}>
            {pending ? "Saving draft..." : "Save draft purchase order"}
          </button>
        </div>
        {Boolean(error) && <ErrorState error={error} />}
      </form>
    </div>
  );
}

export function PurchaseOrderDetailPage() {
  const { id = "" } = useParams();
  const auth = useAuth();
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const query = usePurchaseOrder(id, auth.user?.branch_id || undefined);
  const payments = useSupplierPayments(id);
  const costs = canViewPurchaseCosts(auth.user?.role);
  const po = query.data;
  const paymentHistory = paymentRows(payments.data);
  if (query.isPending) return <Loading />;
  if (!po || query.isError) return <ErrorState error={query.error} />;
  return (
    <div className="purchase-page wide">
      <Link className="back-link" to="/purchase-orders">
        ← Back to purchase orders
      </Link>
      <Header
        title={po.po_no}
        description={`${po.supplier_code} · ${po.supplier_name}`}
        action={
          <div className="header-actions">
            {canOrderPurchaseOrder(auth.user?.role, po.status) && (
              <button onClick={() => setOrderOpen(true)}>Mark as ordered</button>
            )}
            {canEditPurchaseOrder(po.status) && (
              <Link
                className="primary-link"
                to={`/purchase-orders/${po.id}/edit`}
              >
                Edit draft
              </Link>
            )}
            {isReceiveable(po.status) && (
              <button onClick={() => setReceiptOpen(true)}>
                Receive goods
              </button>
            )}
            {!canEditPurchaseOrder(po.status) &&
              costs &&
              po.balance !== "0.00" && (
                <button onClick={() => setPaymentOpen(true)}>
                  Record payment
                </button>
              )}
          </div>
        }
      />
      <section className="po-summary">
        <article>
          <span>Status</span>
          <Status status={po.status} />
        </article>
        <article>
          <span>Branch</span>
          <strong>{po.branch_code}</strong>
        </article>
        <article>
          <span>Order date</span>
          <strong>{po.order_date}</strong>
        </article>
        {costs && (
          <>
            <article>
              <span>Total amount</span>
              <strong>{formatMoney(po.total_amount)}</strong>
            </article>
            <article>
              <span>Amount paid</span>
              <strong>{formatMoney(po.amount_paid)}</strong>
            </article>
            <article>
              <span>Balance</span>
              <strong>{formatMoney(po.balance)}</strong>
            </article>
          </>
        )}
      </section>
      <PurchaseLines po={po} costs={costs} />
      <section className="payment-history">
        <h2>Supplier payment history</h2>
        {payments.isPending ? (
          <Loading />
        ) : payments.isError ? (
          <ErrorState error={payments.error} />
        ) : !paymentHistory.length ? (
          <EmptyState title="No supplier payments">
            Payments recorded against this purchase order appear here.
          </EmptyState>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.payment_date}</td>
                    <td>{payment.method}</td>
                    <td>{payment.reference || "—"}</td>
                    <td>{formatMoney(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {receiptOpen && (
        <ReceiptDialog po={po} onClose={() => setReceiptOpen(false)} />
      )}
      {orderOpen && (
        <OrderPurchaseDialog po={po} onClose={() => setOrderOpen(false)} />
      )}
      {paymentOpen && (
        <PaymentDialog po={po} onClose={() => setPaymentOpen(false)} />
      )}
    </div>
  );
}

function OrderPurchaseDialog({
  po,
  onClose,
}: {
  po: PurchaseOrder;
  onClose: () => void;
}) {
  const mutation = usePurchaseMutations().update;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await mutation.mutateAsync({
      id: po.id,
      payload: { status: "ORDERED", remarks: "Confirmed with supplier" },
    });
    onClose();
  };
  return (
    <Modal title="Update purchase order to ordered" onClose={onClose}>
      <form onSubmit={submit}>
        <p>
          Confirm that this draft has been agreed with the supplier. The order
          will become read only and ready for goods receipt.
        </p>
        <dl>
          <div>
            <dt>Status</dt>
            <dd>ORDERED</dd>
          </div>
          <div>
            <dt>Remarks</dt>
            <dd>Confirmed with supplier</dd>
          </div>
        </dl>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button disabled={mutation.isPending}>
            {mutation.isPending ? "Updating order..." : "Confirm order"}
          </button>
        </div>
        {mutation.error && <ErrorState error={mutation.error} />}
      </form>
    </Modal>
  );
}

function PurchaseLines({ po, costs }: { po: PurchaseOrder; costs: boolean }) {
  return (
    <div className="data-table-wrap">
      <table className="data-table po-lines-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Ordered</th>
            <th>Previously received</th>
            <th>Outstanding</th>
            {costs && (
              <>
                <th>Unit cost</th>
                <th>Server line total</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {po.lines.map((line) => (
            <tr key={line.id}>
              <td>
                <strong>{line.product_code}</strong>
                <small>{line.product_name}</small>
              </td>
              <td>{line.qty}</td>
              <td>{line.received_qty}</td>
              <td>
                <strong>{line.outstanding_qty}</strong>
              </td>
              {costs && (
                <>
                  <td>{line.unit_cost ? formatMoney(line.unit_cost) : "—"}</td>
                  <td>{formatMoney(line.line_total)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReceiptDialog({
  po,
  onClose,
}: {
  po: PurchaseOrder;
  onClose: () => void;
}) {
  const mutation = usePurchaseMutations().receive;
  const [date, setDate] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>(
    Object.fromEntries(po.lines.map((line) => [line.id, line.outstanding_qty])),
  );
  const [result, setResult] = useState<ReceiptResult | null>(null);
  const errors = po.lines.map((line) =>
    receiveLineError(quantities[line.id] || "", line.outstanding_qty),
  );
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (errors.some(Boolean)) return;
    try {
      const received = await mutation.mutateAsync({
        id: po.id,
        payload: buildReceivePayload(
          date,
          po.lines.map((line) => ({
            line_id: line.id,
            quantity: quantities[line.id] || "0",
          })),
        ),
      });
      setResult(received);
    } catch {
      // The mutation exposes the backend validation error in the dialog.
    }
  };
  return (
    <Modal title="Receive goods" onClose={onClose}>
      {result ? (
        <div className="receipt-success">
          <div className="form-message success">
            Goods receipt posted successfully.
          </div>
          <strong>{result.movements.length} stock movement(s) created.</strong>
          <button onClick={onClose}>Done</button>
        </div>
      ) : (
        <form className="receipt-form" onSubmit={submit}>
          <p>
            Receipt posts stock movements. Confirm each quantity against the
            server-returned outstanding units.
          </p>
          <label>
            Received date
            <input
              aria-label="Goods received date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <div className="receipt-lines">
            <div className="receipt-line heading">
              <span>Product</span>
              <span>Ordered</span>
              <span>Received</span>
              <span>Outstanding</span>
              <span>Receive now</span>
            </div>
            {po.lines.map((line, index) => (
              <div className="receipt-line" key={line.id}>
                <strong>
                  {line.product_code}
                  <small>{line.product_name}</small>
                </strong>
                <span>{line.qty}</span>
                <span>{line.received_qty}</span>
                <span>{line.outstanding_qty}</span>
                <label>
                  <input
                    aria-label={`Receive ${line.product_code} quantity`}
                    inputMode="decimal"
                    value={quantities[line.id]}
                    onChange={(e) =>
                      setQuantities({
                        ...quantities,
                        [line.id]: e.target.value,
                      })
                    }
                  />
                  <small className="field-error">{errors[index]}</small>
                </label>
              </div>
            ))}
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button disabled={mutation.isPending || errors.some(Boolean)}>
              {mutation.isPending ? "Posting receipt..." : "Post goods receipt"}
            </button>
          </div>
          {mutation.error && <ErrorState error={mutation.error} />}
        </form>
      )}
    </Modal>
  );
}

function PaymentDialog({
  po,
  onClose,
}: {
  po: PurchaseOrder;
  onClose: () => void;
}) {
  const mutation = usePurchaseMutations().pay;
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [result, setResult] = useState<PaymentResult | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setResult(
      await mutation.mutateAsync({
        id: po.id,
        payload: {
          payment_date: date || undefined,
          amount,
          method,
          reference: reference || undefined,
        },
      }),
    );
  };
  return (
    <Modal title="Record supplier payment" onClose={onClose}>
      {result ? (
        <div className="payment-result">
          <div className="form-message success">Supplier payment recorded.</div>
          <dl>
            <div>
              <dt>Balance before</dt>
              <dd>{formatMoney(po.balance)}</dd>
            </div>
            <div>
              <dt>Balance after</dt>
              <dd>{formatMoney(result.purchase_order.balance)}</dd>
            </div>
          </dl>
          <button onClick={onClose}>Done</button>
        </div>
      ) : (
        <form className="payment-form" onSubmit={submit}>
          <div className="balance-before">
            <span>Current server balance</span>
            <strong>{formatMoney(po.balance)}</strong>
          </div>
          <label>
            Payment date
            <input
              aria-label="Supplier payment date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label>
            Amount
            <input
              aria-label="Supplier payment amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>
          <label>
            Method
            <select
              aria-label="Supplier payment method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option>BANK_TRANSFER</option>
              <option>CASH</option>
              <option>CHEQUE</option>
              <option>CARD</option>
            </select>
          </label>
          <label>
            Reference
            <input
              aria-label="Supplier payment reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </label>
          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button disabled={mutation.isPending}>
              {mutation.isPending ? "Recording payment..." : "Record payment"}
            </button>
          </div>
          {mutation.error && <ErrorState error={mutation.error} />}
        </form>
      )}
    </Modal>
  );
}

export function PayablesPage() {
  const [params, setParams] = useSearchParams();
  const { locked, branchId } = useBranchScope(params);
  const filters = {
    branch_id: branchId,
    supplier_id: params.get("supplier_id") || "",
    as_of: params.get("as_of") || "",
  };
  const query = useOutstandingPayables(filters);
  const suppliers = useSuppliers({ active: "true", per_page: "100" });
  const set = (key: string, value: string) => setUrl(setParams, key, value);
  const data = query.data;
  const rows = payableRows(data);
  return (
    <div className="purchase-page">
      <Header
        title="Outstanding payables"
        description="Supplier obligations and totals exactly as returned by the backend."
      />
      <div className="purchase-toolbar payables">
        <BranchControl
          value={branchId}
          locked={locked}
          onChange={(v) => set("branch_id", v)}
        />
        <label>
          Supplier
          <select
            aria-label="Payables supplier"
            value={filters.supplier_id}
            onChange={(e) => set("supplier_id", e.target.value)}
          >
            <option value="">All suppliers</option>
            {suppliers.data?.rows.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.code} · {supplier.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          As of
          <input
            aria-label="Payables as of date"
            type="date"
            value={filters.as_of}
            onChange={(e) => set("as_of", e.target.value)}
          />
        </label>
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState error={query.error} />
      ) : (
        data && (
          <>
            <section className="payables-total">
              <span>Total outstanding as of {data.as_of}</span>
              <strong>{formatMoney(payableMoney(data.total_balance))}</strong>
            </section>
            {!rows.length ? (
              <EmptyState title="No outstanding payables">
                No supplier balances were returned for these filters.
              </EmptyState>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Purchase order</th>
                      <th>Supplier</th>
                      <th>Branch</th>
                      <th>Order date</th>
                      <th>Total</th>
                      <th>Paid</th>
                      <th>Brought forward</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.purchase_order_id}>
                        <td>
                          <Link
                            to={`/purchase-orders/${row.purchase_order_id}`}
                          >
                            {row.po_no}
                          </Link>
                        </td>
                        <td>
                          {row.supplier_code}
                          <small>{row.supplier_name}</small>
                        </td>
                        <td>{row.branch_code}</td>
                        <td>{row.order_date}</td>
                        <td>{formatMoney(payableMoney(row.total_amount))}</td>
                        <td>{formatMoney(payableMoney(row.amount_paid))}</td>
                        <td>
                          {formatMoney(payableMoney(row.brought_forward))}
                        </td>
                        <td>
                          <strong>
                            {formatMoney(payableMoney(row.balance))}
                          </strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )
      )}
    </div>
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
        className="modal purchase-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-modal-title"
      >
        <div className="modal-heading">
          <h2 id="purchase-modal-title">{title}</h2>
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
