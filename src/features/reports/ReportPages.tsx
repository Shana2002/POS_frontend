import { useState, type CSSProperties, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { canAccess } from "../../auth/permissions";
import { EmptyState } from "../../components/AdminUI";
import { formatDate } from "../../lib/date";
import { downloadBlob } from "../../lib/download";
import { formatMoney } from "../../lib/money";
import { useBranches } from "../admin/adminApi";
import { exportReport, useReport } from "./reportApi";
import {
  getReportDefinition,
  reportDefinitions,
  reportScope,
} from "./reportUtils";
import {
  isReportName,
  type DashboardReport,
  type ExpenseBreakdownReport,
  type InvoiceStatusReport,
  type ProductPerformanceReport,
  type ProfitLossReport,
  type ReportData,
  type ReportFilters,
  type ReportFormat,
  type ReportName,
  type SalesByBranchReport,
  type SalesByRepReport,
  type StockValuationReport,
} from "./types";

function message(error: unknown) {
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
  const next = new URLSearchParams(window.location.search);
  if (value) next.set(key, value);
  else next.delete(key);
  setParams(next);
}
function reportFilters(
  params: URLSearchParams,
  branchId: string,
): ReportFilters {
  return {
    from: params.get("from") || "",
    to: params.get("to") || "",
    as_of: params.get("as_of") || "",
    branch_id: branchId,
  };
}

function Header({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="page-heading report-header">
      <div>
        <span className="section-kicker">Business intelligence</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  );
}
function Loading() {
  return (
    <div className="loading-block" role="status">
      Loading report...
    </div>
  );
}
function ErrorState({ error }: { error: unknown }) {
  return (
    <div className="inline-error" role="alert">
      <strong>Unable to load report</strong>
      <span>{message(error)}</span>
    </div>
  );
}

function BranchField({
  value,
  locked,
  onChange,
}: {
  value: string;
  locked: boolean;
  onChange: (value: string) => void;
}) {
  const query = useBranches({ active: "true", per_page: "100" });
  const branch = query.data?.rows.find((row) => String(row.id) === value);
  return (
    <label>
      Branch
      {locked ? (
        <input
          aria-label="Assigned report branch"
          value={branch ? `${branch.code} · ${branch.name}` : value}
          readOnly
        />
      ) : (
        <select
          aria-label="Report branch"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">All branches</option>
          {query.data?.rows.map((row) => (
            <option key={row.id} value={row.id}>
              {row.code} · {row.name}
            </option>
          ))}
        </select>
      )}
    </label>
  );
}

function ReportToolbar({
  name,
  filters,
  locked,
  refreshing,
  onChange,
  onRefresh,
}: {
  name: ReportName;
  filters: ReportFilters;
  locked: boolean;
  refreshing: boolean;
  onChange: (key: string, value: string) => void;
  onRefresh: () => void;
}) {
  const [exporting, setExporting] = useState<ReportFormat | null>(null);
  const [exportError, setExportError] = useState("");
  const asOf = name === "stock-valuation";
  const runExport = async (format: ReportFormat) => {
    setExportError("");
    setExporting(format);
    try {
      const file = await exportReport(name, format, filters);
      downloadBlob(file.blob, file.filename);
    } catch (error) {
      setExportError(message(error));
    } finally {
      setExporting(null);
    }
  };
  return (
    <>
      <div className="report-toolbar">
        <BranchField
          value={filters.branch_id || ""}
          locked={locked}
          onChange={(value) => onChange("branch_id", value)}
        />
        {asOf ? (
          <label>
            As of
            <input
              aria-label="Report as of date"
              type="date"
              value={filters.as_of || ""}
              onChange={(event) => onChange("as_of", event.target.value)}
            />
          </label>
        ) : (
          <>
            <label>
              From
              <input
                aria-label="Report from date"
                type="date"
                value={filters.from || ""}
                onChange={(event) => onChange("from", event.target.value)}
              />
            </label>
            <label>
              To
              <input
                aria-label="Report to date"
                type="date"
                value={filters.to || ""}
                onChange={(event) => onChange("to", event.target.value)}
              />
            </label>
          </>
        )}
        <div className="report-actions">
          <button
            className="secondary-button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh report"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          <button
            className="secondary-button"
            onClick={() => void runExport("xlsx")}
            disabled={Boolean(exporting)}
          >
            {exporting === "xlsx" ? "Exporting..." : "XLSX"}
          </button>
          <button
            className="secondary-button"
            onClick={() => void runExport("pdf")}
            disabled={Boolean(exporting)}
          >
            {exporting === "pdf" ? "Exporting..." : "PDF"}
          </button>
        </div>
      </div>
      {exportError && (
        <div className="inline-error" role="alert">
          <strong>Export failed</strong>
          <span>{exportError}</span>
        </div>
      )}
    </>
  );
}

function ReportTabs({ active }: { active: ReportName }) {
  return (
    <nav className="report-tabs" aria-label="Reports">
      {reportDefinitions.map((report) => (
        <Link
          key={report.name}
          className={active === report.name ? "active" : ""}
          to={`/reports/${report.name}`}
        >
          {report.label}
        </Link>
      ))}
    </nav>
  );
}
function Period({
  data,
}: {
  data: {
    from?: string;
    to?: string;
    as_of?: string;
    branch_id?: string | null;
  };
}) {
  return (
    <div className="report-context">
      <span>
        {data.as_of
          ? `As of ${formatDate(data.as_of)}`
          : data.from && data.to
            ? `${formatDate(data.from)} to ${formatDate(data.to)}`
            : "Current report period"}
      </span>
      <span>
        {data.branch_id ? `Branch ${data.branch_id}` : "All branches"}
      </span>
    </div>
  );
}
function Kpi({
  label,
  value,
  to,
  tone,
}: {
  label: string;
  value: string;
  to?: string;
  tone?: string;
}) {
  const content = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
      {to && <small>Open detailed view</small>}
    </>
  );
  return to ? (
    <Link className={`report-kpi ${tone || ""}`} to={to}>
      {content}
    </Link>
  ) : (
    <article className={`report-kpi ${tone || ""}`}>{content}</article>
  );
}
function Table({
  columns,
  children,
  label,
}: {
  columns: string[];
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="data-table-wrap report-table">
      <table className="data-table">
        <caption>{label}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function VisualBars({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <figure
      className="report-chart"
      aria-labelledby={`${title.replaceAll(" ", "-")}-title`}
    >
      <figcaption id={`${title.replaceAll(" ", "-")}-title`}>
        {title}
      </figcaption>
      <div className="visual-bars">
        {rows.slice(0, 8).map((row, index) => (
          <div key={`${row.label}-${index}`}>
            <span>{row.label}</span>
            <i
              style={
                { "--bar-order": String((index % 5) + 1) } as CSSProperties
              }
              aria-hidden="true"
            />
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </figure>
  );
}
function EmptyReport({ name }: { name: string }) {
  return (
    <EmptyState title={`No ${name.toLowerCase()} data`}>
      The API returned an empty dataset for the selected filters.
    </EmptyState>
  );
}

function Dashboard({ data }: { data: DashboardReport }) {
  const auth = useAuth();
  const link = (path: string) =>
    canAccess(path, auth.user!.role) ? path : undefined;
  const metrics = [
    { label: "Net revenue", value: formatMoney(data.net_revenue) },
    { label: "Collected", value: formatMoney(data.collected) },
    { label: "Receivables", value: formatMoney(data.outstanding_receivable) },
    { label: "Expenses", value: formatMoney(data.total_expenses) },
  ];
  return (
    <>
      <section className="report-kpis">
        <Kpi
          label="Net revenue"
          value={formatMoney(data.net_revenue)}
          to={link("/reports/sales-by-branch")}
        />
        <Kpi
          label="Collected"
          value={formatMoney(data.collected)}
          to={link("/payments")}
        />
        <Kpi
          label="Outstanding receivable"
          value={formatMoney(data.outstanding_receivable)}
          to={link("/receivables/outstanding")}
          tone="warning"
        />
        <Kpi
          label="Discounts given"
          value={formatMoney(data.discounts_given)}
          to={link("/reports/invoice-status")}
        />
        <Kpi
          label="Invoices issued"
          value={String(data.invoices_issued)}
          to={link("/invoices")}
        />
        <Kpi
          label="Inventory units"
          value={data.inventory_units}
          to={link("/stock")}
        />
        <Kpi
          label="Inventory value"
          value={formatMoney(data.inventory_value)}
          to={link("/reports/stock-valuation")}
        />
        <Kpi
          label="Approved expenses"
          value={formatMoney(data.total_expenses)}
          to={link("/reports/expense-breakdown")}
        />
      </section>
      <div className="report-pair">
        <VisualBars title="Executive financial summary" rows={metrics} />
        <Table label="Executive dashboard data" columns={["Metric", "Value"]}>
          {metrics.map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              <td>{row.value}</td>
            </tr>
          ))}
        </Table>
      </div>
    </>
  );
}
function ProductPerformance({ data }: { data: ProductPerformanceReport }) {
  if (!data.products.length) return <EmptyReport name="product performance" />;
  return (
    <div className="report-pair">
      <VisualBars
        title="Leading product revenue"
        rows={data.products.map((row) => ({
          label: row.product_name,
          value: formatMoney(row.revenue),
        }))}
      />
      <Table
        label="Product performance data"
        columns={getReportDefinition("product-performance").columns}
      >
        {data.products.map((row) => (
          <tr key={row.product_id}>
            <td>
              <strong>{row.product_code}</strong>
              <small>{row.product_name}</small>
            </td>
            <td>{row.units_sold}</td>
            <td>{formatMoney(row.revenue)}</td>
            <td>{row.current_stock}</td>
            <td>{formatMoney(row.stock_value)}</td>
            <td>{row.cost_source}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
function SalesByBranch({ data }: { data: SalesByBranchReport }) {
  if (!data.branches.length) return <EmptyReport name="sales by branch" />;
  return (
    <div className="report-pair">
      <VisualBars
        title="Branch net revenue"
        rows={data.branches.map((row) => ({
          label: row.branch_name,
          value: formatMoney(row.net_revenue),
        }))}
      />
      <Table
        label="Sales by branch data"
        columns={getReportDefinition("sales-by-branch").columns}
      >
        {data.branches.map((row) => (
          <tr key={row.branch_id}>
            <td>
              <strong>{row.branch_code}</strong>
              <small>{row.branch_name}</small>
            </td>
            <td>{row.invoice_count}</td>
            <td>{formatMoney(row.net_revenue)}</td>
            <td>{formatMoney(row.discounts_given)}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
function SalesByRep({ data }: { data: SalesByRepReport }) {
  if (!data.reps.length) return <EmptyReport name="sales by representative" />;
  return (
    <div className="report-pair">
      <VisualBars
        title="Representative net revenue"
        rows={data.reps.map((row) => ({
          label: row.sales_rep_name,
          value: formatMoney(row.net_revenue),
        }))}
      />
      <Table
        label="Sales by representative data"
        columns={getReportDefinition("sales-by-rep").columns}
      >
        {data.reps.map((row) => (
          <tr key={row.sales_rep_id}>
            <td>{row.sales_rep_name}</td>
            <td>{row.invoice_count}</td>
            <td>{formatMoney(row.net_revenue)}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
function InvoiceStatus({ data }: { data: InvoiceStatusReport }) {
  if (!data.statuses.length) return <EmptyReport name="invoice status" />;
  return (
    <div className="report-pair">
      <VisualBars
        title="Invoice amounts by status"
        rows={data.statuses.map((row) => ({
          label: row.status.replaceAll("_", " "),
          value: formatMoney(row.net_amount),
        }))}
      />
      <Table
        label="Invoice status data"
        columns={getReportDefinition("invoice-status").columns}
      >
        {data.statuses.map((row) => (
          <tr key={row.status}>
            <td>
              <span className="operation-status">
                ● {row.status.replaceAll("_", " ")}
              </span>
            </td>
            <td>{row.invoice_count}</td>
            <td>{formatMoney(row.net_amount)}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
function ExpenseBreakdown({ data }: { data: ExpenseBreakdownReport }) {
  return (
    <>
      <section className="report-kpis compact">
        <Kpi label="Approved categories" value={String(data.category_count)} />
        <Kpi label="Approved expenses" value={String(data.expense_count)} />
        <Kpi label="Approved total" value={formatMoney(data.total)} />
        <Kpi
          label="Pending excluded"
          value={`${data.excluded.pending.expense_count} · ${formatMoney(data.excluded.pending.total)}`}
          tone="warning"
        />
        <Kpi
          label="Rejected excluded"
          value={`${data.excluded.rejected.expense_count} · ${formatMoney(data.excluded.rejected.total)}`}
        />
      </section>
      {!data.categories.length ? (
        <EmptyReport name="expense breakdown" />
      ) : (
        <div className="report-pair">
          <VisualBars
            title="Approved expenses by category"
            rows={data.categories.map((row) => ({
              label: row.category_name,
              value: formatMoney(row.total),
            }))}
          />
          <Table
            label="Expense breakdown data"
            columns={getReportDefinition("expense-breakdown").columns}
          >
            {data.categories.map((row) => (
              <tr key={row.category_id}>
                <td>
                  <strong>{row.category_code}</strong>
                  <small>{row.category_name}</small>
                </td>
                <td>{row.expense_count}</td>
                <td>{formatMoney(row.total)}</td>
              </tr>
            ))}
          </Table>
        </div>
      )}
    </>
  );
}
function ProfitLoss({ data }: { data: ProfitLossReport }) {
  const rows = [
    { label: "Revenue", value: formatMoney(data.revenue) },
    { label: "Cost of goods sold", value: formatMoney(data.cogs) },
    { label: "Gross profit", value: formatMoney(data.gross_profit) },
    { label: "Approved expenses", value: formatMoney(data.approved_expenses) },
    { label: "Disposal value", value: formatMoney(data.disposal_value) },
    { label: "Sample value", value: formatMoney(data.sample_value) },
    { label: "Net profit", value: formatMoney(data.net_profit) },
  ];
  return (
    <>
      {data.warnings.length > 0 && (
        <section className="report-warnings" role="alert">
          <strong>Profit and loss valuation warnings</strong>
          {data.warnings.map((warning) => (
            <p key={`${warning.product_id}-${warning.message}`}>
              <b>
                {warning.product_code} · {warning.product_name}
              </b>{" "}
              {warning.message} ({warning.units} units;{" "}
              {formatMoney(warning.revenue_affected)} revenue affected)
            </p>
          ))}
        </section>
      )}
      <section className="report-kpis compact">
        <Kpi label="Revenue" value={formatMoney(data.revenue)} />
        <Kpi label="Gross profit" value={formatMoney(data.gross_profit)} />
        <Kpi
          label="Net profit"
          value={formatMoney(data.net_profit)}
          tone="profit"
        />
      </section>
      <div className="report-pair">
        <VisualBars title="Profit and loss summary" rows={rows} />
        <Table
          label="Profit and loss data"
          columns={getReportDefinition("profit-loss").columns}
        >
          {rows.map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              <td>{row.value}</td>
            </tr>
          ))}
        </Table>
      </div>
    </>
  );
}
function StockValuation({ data }: { data: StockValuationReport }) {
  return (
    <>
      {data.warnings.length > 0 && (
        <section className="report-warnings" role="alert">
          <strong>Stock valuation warnings</strong>
          {data.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </section>
      )}
      <section className="report-kpis compact">
        <Kpi label="Total quantity" value={data.total_quantity} />
        <Kpi label="Total value" value={formatMoney(data.total_value)} />
        <Kpi
          label="Selling-price valuations"
          value={String(data.valued_at_selling_price_count)}
          tone="warning"
        />
        <Kpi
          label="Unvalued products"
          value={String(data.unvalued_count)}
          tone={data.unvalued_count ? "danger" : ""}
        />
      </section>
      {!data.lines.length ? (
        <EmptyReport name="stock valuation" />
      ) : (
        <div className="report-pair">
          <VisualBars
            title="Stock value by product"
            rows={data.lines.map((row) => ({
              label: row.product_name,
              value: row.value ? formatMoney(row.value) : "Not valued",
            }))}
          />
          <Table
            label="Stock valuation data"
            columns={getReportDefinition("stock-valuation").columns}
          >
            {data.lines.map((row) => (
              <tr
                key={row.product_id}
                className={row.cost_price_missing ? "missing-cost-row" : ""}
              >
                <td>
                  <strong>{row.product_code}</strong>
                  <small>{row.product_name}</small>
                </td>
                <td>{row.quantity}</td>
                <td>
                  {row.unit_cost ? (
                    formatMoney(row.unit_cost)
                  ) : (
                    <span className="danger-text">Missing cost</span>
                  )}
                </td>
                <td>{row.value ? formatMoney(row.value) : "Not valued"}</td>
                <td>{row.cost_source}</td>
              </tr>
            ))}
          </Table>
        </div>
      )}
    </>
  );
}

function ReportContent({ name, data }: { name: ReportName; data: ReportData }) {
  switch (name) {
    case "dashboard":
      return <Dashboard data={data as DashboardReport} />;
    case "product-performance":
      return <ProductPerformance data={data as ProductPerformanceReport} />;
    case "sales-by-branch":
      return <SalesByBranch data={data as SalesByBranchReport} />;
    case "sales-by-rep":
      return <SalesByRep data={data as SalesByRepReport} />;
    case "invoice-status":
      return <InvoiceStatus data={data as InvoiceStatusReport} />;
    case "expense-breakdown":
      return <ExpenseBreakdown data={data as ExpenseBreakdownReport} />;
    case "profit-loss":
      return <ProfitLoss data={data as ProfitLossReport} />;
    case "stock-valuation":
      return <StockValuation data={data as StockValuationReport} />;
  }
}

export function ReportPage({
  reportName,
  showTabs = true,
}: {
  reportName?: ReportName;
  showTabs?: boolean;
}) {
  const route = useParams().name;
  const name = reportName || (isReportName(route) ? route : "dashboard");
  const auth = useAuth();
  const [params, setParams] = useSearchParams();

  const definition = getReportDefinition(name);
  const scope = reportScope(
    auth.user!.role,
    auth.user!.branch_id,
    params.get("branch_id") || "",
  );
  const filters = reportFilters(params, scope.branchId);
  const query = useReport<ReportData>(name, filters);
  const set = (key: string, value: string) => setUrl(setParams, key, value);
  return (
    <div className="report-page">
      <Header title={definition.label} description={definition.description} />
      {showTabs && <ReportTabs active={name} />}
      <ReportToolbar
        name={name}
        filters={filters}
        locked={scope.locked}
        refreshing={query.isFetching}
        onChange={set}
        onRefresh={() => void query.refetch()}
      />
      {query.isPending ? (
        <Loading />
      ) : query.isError || !query.data ? (
        <ErrorState error={query.error} />
      ) : (
        <>
          <Period data={query.data} />
          <ReportContent name={name} data={query.data} />
        </>
      )}
    </div>
  );
}

export function DashboardPage() {
  return <ReportPage reportName="dashboard" showTabs={false} />;
}
