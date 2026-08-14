# POS Backend API endpoints and return structures

Base URL: `/api/v1`

Except for `GET /health`, `POST /auth/login`, and static files, endpoints require
`Authorization: Bearer <access_token>`. Role and branch restrictions still apply.

## Common response structures

Successful JSON response:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

`meta` is omitted for non-paginated responses. Paginated endpoints normally use:

```json
{
  "page": 1,
  "per_page": 20,
  "total": 125,
  "pages": 7
}
```

Error response:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message.",
    "details": {}
  }
}
```

Validation, authentication, authorization, missing-resource, conflict and rate-limit
errors use the same envelope, generally with HTTP `400`, `401`, `403`, `404`, `409`
and `429`. Money fields are JSON strings such as `"1250.00"`.

PDF and XLSX successes are raw binary responses, not JSON. Their errors remain JSON.

## Reusable resource structures

- `User`: `{id, full_name, email, role, branch_id, phone, is_active, last_login_at, created_at, updated_at}`
- `Branch`: `{id, code, name, address, manager_id, is_warehouse, invoice_prefix, is_active}`
- `Product`: `{id, code, name, category, unit_price?, cost_price?, reorder_level, unit_of_measure, image_path, is_active, created_at, updated_at}`. Cost fields are omitted for roles without cost access.
- `Customer`: `{id, code, name, contact, email, address, credit_limit, is_active, created_at}`
- `Supplier`: `{id, code, name, contact, email, address, payment_terms_days, is_active}`
- `StockMovement`: `{id, movement_date, product_id, product_code, product_name, branch_id, branch_code, movement_type, qty_in, qty_out, signed_qty, unit_cost?, reference_type, reference_id, notes, created_by, created_at}`
- `InvoiceLine`: `{id, invoice_id, product_id, product_code, product_name, qty, unit_price, line_total, delivered_qty, outstanding_qty, delivery_status, delivery_date}`
- `Invoice`: `{id, invoice_no, customer_id, customer_code, customer_name, branch_id, branch_code, invoice_date, due_date, status, gross_amount, discount_pct, discount_amount, net_amount, amount_paid, balance_due, sales_rep_id, notes, issued_at, cancelled_at, cancel_reason, created_by, created_at, lines:[InvoiceLine]}`
- `Payment`: `{id, invoice_id, invoice_no, customer_id, customer_code, customer_name, branch_id, branch_code, payment_date, amount, method, reference, is_reversed, reversed_at, reversed_by, reversal_reason, created_by, created_at}`
- `PurchaseLine`: `{id, po_id, product_id, product_code, product_name, qty, unit_cost?, line_total, received_qty, outstanding_qty, received_date, received_by}`
- `PurchaseOrder`: `{id, po_no, supplier_id, supplier_code, supplier_name, branch_id, branch_code, order_date, expected_date, total_amount, amount_paid, balance, brought_forward, status, remarks, created_by, created_at, lines:[PurchaseLine]}`
- `Transfer`: `{id, transfer_no, from_branch_id, from_branch_code, from_branch_name, to_branch_id, to_branch_code, to_branch_name, dispatch_date, receive_date, status, dispatched_by, received_by, remarks, total_qty, total_received_qty, has_variance, cancelled_at, cancelled_by, cancel_reason, created_by, created_at, lines:[TransferLine]}`
- `Expense`: `{id, expense_date, category_id, category_code, category_name, description, amount, branch_id, branch_code, reference_no, status, approved_by, approved_at, rejected_by, rejected_at, rejection_reason, decided_by, decided_at, created_by, created_at}`

## Health and authentication

| Method and path | Request/query | HTTP | `data` return structure |
|---|---|---:|---|
| `GET /health` | — | 200 | `{status:"ok", db:"ok"}` |
| `POST /auth/login` | `{email,password}` | 200 | `{access_token, refresh_token, user:User}` |
| `POST /auth/refresh` | Refresh bearer token | 200 | `{access_token}` |
| `POST /auth/logout` | Any bearer token | 200 | `{message:"Logged out."}` |
| `GET /auth/me` | — | 200 | `User` |
| `POST /auth/change-password` | `{current_password,new_password}` | 200 | `{message:"Password changed.", user:User}` |

## Users, branches and master data

All list endpoints return an array plus pagination `meta` unless noted otherwise.

| Method and path | Request/query | HTTP | `data` return structure |
|---|---|---:|---|
| `GET /users` | Pagination and user filters | 200 | `[User]` |
| `POST /users` | `{full_name,email,password,role,branch_id?,phone?,is_active?}` | 201 | `User` |
| `GET /users/:id` | — | 200 | `User` |
| `PUT /users/:id` | Partial user fields | 200 | `User` |
| `PATCH /users/:id/status` | `{is_active}` | 200 | `User` |
| `GET /branches` | Pagination/search filters | 200 | `[Branch]` |
| `POST /branches` | `{code,name,address?,manager_id?,is_warehouse?,invoice_prefix?,is_active?}` | 201 | `Branch` |
| `GET /branches/:id` | — | 200 | `Branch` |
| `PUT /branches/:id` | Partial branch fields | 200 | `Branch` |
| `DELETE /branches/:id` | Soft-deactivate | 200 | `Branch` |
| `GET /products` | `search, category, active, page, per_page` | 200 | `[Product]` |
| `POST /products` | Product fields | 201 | `Product` |
| `GET /products/:id` | — | 200 | `Product` |
| `PUT /products/:id` | Partial product fields | 200 | `Product` |
| `DELETE /products/:id` | Soft-deactivate | 200 | `Product` |
| `GET /products/:id/price-history` | Pagination | 200 | `[{id,product_id,price,cost_price,effective_from,changed_by,created_at}]` |
| `POST /products/:id/price` | `{price,cost_price?,effective_from?}` | 200 | `Product` |
| `GET /products/:id/movement` | `branch_id?,from?,to?,type?,page?,per_page?` | 200 | `{product_id,branch_id,from,to,opening_balance,total_in,total_out,closing_balance,movement_count,rows:[{movement:StockMovement,running_balance}]}` |
| `GET /customers` | Search/pagination filters | 200 | `[Customer]` |
| `POST /customers` | Customer fields | 201 | `Customer` |
| `GET /customers/:id` | — | 200 | `Customer` |
| `PUT /customers/:id` | Partial customer fields | 200 | `Customer` |
| `DELETE /customers/:id` | Soft-deactivate | 200 | `Customer` |
| `GET /customers/:id/statement` | `from?,to?,branch_id?` | 200 | `{customer,from,to,branch_id,opening_balance,entries:[{date,type,reference,id,debit,credit,running_balance}],closing_balance}` |
| `GET /suppliers` | Search/pagination filters | 200 | `[Supplier]` |
| `POST /suppliers` | Supplier fields | 201 | `Supplier` |
| `GET /suppliers/:id` | — | 200 | `Supplier` |
| `PUT /suppliers/:id` | Partial supplier fields | 200 | `Supplier` |
| `DELETE /suppliers/:id` | Soft-deactivate | 200 | `Supplier` |
| `GET /expense-categories` | Search/pagination filters | 200 | `[{id,code,name,is_active}]` |
| `POST /expense-categories` | `{code,name,is_active?}` | 201 | `{id,code,name,is_active}` |
| `GET /expense-categories/:id` | — | 200 | Expense category |
| `PUT /expense-categories/:id` | Partial category fields | 200 | Expense category |
| `DELETE /expense-categories/:id` | Soft-deactivate | 200 | Expense category |
| `GET /settings` | — | 200 | `[{id,key,value,data_type,updated_by,updated_at}]` |
| `GET /settings/:key` | — | 200 | `{id,key,value,data_type,updated_by,updated_at}` |
| `PUT /settings/:key` | `{value,data_type?}` | 200 | Setting |

## Stock

| Method and path | Request/query | HTTP | `data` return structure |
|---|---|---:|---|
| `GET /stock` | `branch_id?,product_id?,low_only?,as_of?` | 200 | `[{product_id,product_code,product_name,branch_id,branch_code,branch_name,quantity,reorder_level,is_low}]`; `meta:{total}` |
| `GET /stock/matrix` | `branch_id?,product_id?,as_of?` | 200 | `{as_of,branches:[{id,code,name}],rows:[{product_id,product_code,product_name,reorder_level,quantities,total,is_low}],branch_totals,grand_total}` |
| `GET /stock/valuation` | `branch_id?,as_of?` | 200 | `{as_of,branch_id,lines:[{product_id,product_code,product_name,quantity,unit_cost,value,cost_source,cost_price_missing}],total_quantity,total_value,valued_at_selling_price_count,unvalued_count,warnings:[...]}` |
| `GET /stock/movements` | `product_id?,branch_id?,from?,to?,type?,page?,per_page?` | 200 | `[StockMovement]` plus pagination `meta` |
| `POST /stock/opening` | `{movement_date?,notes?,lines:[{product_id|product_code,branch_id|branch_code,qty,movement_date?,notes?}]}` | 200/201 | `{created_count,skipped_count,created:[StockMovement],skipped:[{product_id,product_code,branch_id,branch_code,qty,reason}]}` |

## Purchasing and payables

| Method and path | Request/query | HTTP | `data` return structure |
|---|---|---:|---|
| `GET /purchase-orders` | `branch_id?,supplier_id?,status?,from?,to?,page?,per_page?` | 200 | `[PurchaseOrder]` |
| `POST /purchase-orders` | `{supplier_id,branch_id,order_date?,expected_date?,brought_forward?,remarks?,lines:[{product_id,qty,unit_cost}]}` | 201 | `PurchaseOrder` |
| `GET /purchase-orders/:id` | `branch_id?` | 200 | `PurchaseOrder` |
| `PUT /purchase-orders/:id` | Partial draft PO fields/lines | 200 | `PurchaseOrder` |
| `POST /purchase-orders/:id/receive` | `{received_date?,lines:[{line_id,qty}]}` | 200 | `{purchase_order:PurchaseOrder,movements:[StockMovement]}` |
| `POST /purchase-orders/:id/payments` | `{payment_date?,amount,method,reference?}` | 201 | `{purchase_order:PurchaseOrder,payment:{id,po_id,payment_date,amount,method,reference,created_by,created_at}}` |
| `GET /purchase-orders/:id/payments` | — | 200 | `{purchase_order_id,payments:[SupplierPayment]}` |
| `GET /payables/outstanding` | `branch_id?,supplier_id?,as_of?` | 200 | `{as_of,branch_id,rows:[{purchase_order_id,po_no,supplier_id,supplier_code,supplier_name,branch_id,branch_code,order_date,total_amount,amount_paid,brought_forward,balance}],total_balance}` |

## Invoices

| Method and path | Request/query | HTTP | `data` return structure |
|---|---|---:|---|
| `GET /invoices` | `branch_id?,customer_id?,status?,sales_rep_id?,from?,to?,search?,page?,per_page?` | 200 | `[Invoice]` |
| `POST /invoices` | `{customer_id,branch_id,invoice_date?,due_date?,discount_pct?,sales_rep_id?,notes?,lines:[{product_id,qty,unit_price?}]}` | 201 | `Invoice` |
| `GET /invoices/:id` | `branch_id?` | 200 | `Invoice` |
| `PUT /invoices/:id` | Partial draft invoice fields | 200 | `Invoice` |
| `DELETE /invoices/:id` | Draft only | 200 | `{deleted:true,id}` |
| `POST /invoices/:id/issue` | `{}` | 200 | `{invoice:Invoice,movements:[StockMovement]}` |
| `POST /invoices/:id/cancel` | `{reason}` | 200 | `{invoice:Invoice,reversals:[StockMovement]}` |
| `POST /invoices/:id/lines` | `{product_id,qty,unit_price?}` | 201 | Updated `Invoice` |
| `PUT /invoices/:id/lines/:line_id` | Partial line fields | 200 | Updated `Invoice` |
| `DELETE /invoices/:id/lines/:line_id` | — | 200 | Updated `Invoice` |
| `PATCH /invoices/:id/lines/:line_id/delivery` | `{delivered_qty,delivery_date?}` | 200 | Updated `Invoice` |
| `GET /invoices/:id/pdf` | — | 200 | Raw `application/pdf`, inline filename `invoice-<invoice_no>.pdf` |

## Payments and receivables

| Method and path | Request/query | HTTP | `data` return structure |
|---|---|---:|---|
| `GET /payments` | `branch_id?,invoice_id?,customer_id?,method?,reversed?,from?,to?,page?,per_page?` | 200 | `[Payment]` |
| `POST /payments` | `{invoice_id,payment_date?,amount,method,reference?}` | 201 | `{payment:Payment,invoice:Invoice}` |
| `GET /payments/:id` | `branch_id?` | 200 | `Payment` |
| `POST /payments/:id/reverse` | `{reason}` | 200 | `{payment:Payment,invoice:Invoice}` |
| `GET /payments/:id/receipt-pdf` | — | 200 | Raw `application/pdf`, inline filename `receipt-<payment_id>.pdf` |
| `GET /receivables/aging` | `branch_id?,as_of?` | 200 | `{as_of,branch_id,buckets:[{name,from_days,to_days,invoice_count,amount}],total_outstanding}` |
| `GET /receivables/outstanding` | `branch_id?,customer_id?,as_of?` | 200 | `{as_of,branch_id,rows:[{invoice_id,invoice_no,customer_id,customer_code,customer_name,branch_id,branch_code,invoice_date,due_date,days_overdue,net_amount,amount_paid,balance_due}],total_outstanding}` |

## Transfers, samples, disposals and stock counts

| Method and path | Request/query | HTTP | `data` return structure |
|---|---|---:|---|
| `GET /transfers` | `branch_id?,status?,from_branch?,to_branch?,page?,per_page?` | 200 | `[Transfer]` |
| `GET /transfers/in-transit` | `branch_id?,product_id?` | 200 | `{lines:[{from_branch_id,from_branch_code,from_branch_name,to_branch_id,to_branch_code,to_branch_name,product_id,product_code,product_name,quantity}],total_quantity,route_count}` |
| `POST /transfers` | `{from_branch_id,to_branch_id,remarks?,lines:[{product_id,qty}]}` | 201 | `Transfer` |
| `GET /transfers/:id` | `branch_id?` | 200 | `Transfer` |
| `POST /transfers/:id/dispatch` | `{dispatch_date?}` | 200 | `{transfer:Transfer,movements:[StockMovement]}` |
| `POST /transfers/:id/receive` | `{receive_date?,lines:[{line_id,received_qty}]}` | 200 | `{transfer:Transfer,movements:[StockMovement],variances:[{line_id,product_id,product_code,product_name,dispatched_qty,received_qty,shortfall_qty}],has_variance}` |
| `POST /transfers/:id/cancel` | `{reason}` | 200 | `{transfer:Transfer,reversals:[StockMovement]}` |
| `GET /samples` | `branch_id?,product_id?,from?,to?,page?,per_page?` | 200 | `[Sample]` |
| `POST /samples` | `{product_id,branch_id,qty,authorised_by,sample_date?,person?,purpose?}` | 201 | `{sample:Sample,movement:StockMovement}` |
| `GET /samples/:id` | `branch_id?` | 200 | `Sample` |
| `GET /disposals` | `branch_id?,product_id?,reason?,approved?,from?,to?,page?,per_page?` | 200 | `[Disposal]` |
| `POST /disposals` | `{product_id,branch_id,qty,reason,disposal_date?,remark?}` | 201 | `Disposal` |
| `GET /disposals/:id` | `branch_id?` | 200 | `Disposal` |
| `POST /disposals/:id/approve` | `{}` | 200 | `{disposal:Disposal,movement:StockMovement}` |
| `GET /stock-counts` | `branch_id?,status?,from?,to?,page?,per_page?` | 200 | `[StockCount]` |
| `POST /stock-counts` | `{branch_id,count_date?,lines:[{product_id,counted_qty}]}` | 201 | `StockCount` |
| `GET /stock-counts/:id` | `branch_id?` | 200 | `StockCount` |
| `POST /stock-counts/:id/submit` | `{}` | 200 | `StockCount` with `system_qty` and `variance` populated |
| `POST /stock-counts/:id/approve` | `{}` | 200 | `{stock_count:StockCount,movements:[StockMovement]}` |

`Sample` is `{id,sample_date,product_id,product_code,product_name,branch_id,branch_code,qty,person,purpose,authorised_by,status,created_by,created_at}`.

`Disposal` is `{id,disposal_date,product_id,product_code,product_name,branch_id,branch_code,qty,unit_price?,value?,reason,remark,is_approved,approved_by,approved_at,created_by,created_at}`. Value fields depend on role.

`StockCount` is `{id,count_no,branch_id,branch_code,count_date,status,counted_by,approved_by,submitted_at,approved_at,total_variance,created_at,lines:[{id,product_id,product_code,product_name,system_qty,counted_qty,variance,adjusted}]}`.

## Expenses

| Method and path | Request/query | HTTP | `data` return structure |
|---|---|---:|---|
| `GET /expenses` | `branch_id?,category_id?,status?,from?,to?,search?,page?,per_page?` | 200 | `[Expense]` |
| `POST /expenses` | `{category_id,description,amount,expense_date?,branch_id?,reference_no?}` | 201 | `Expense` |
| `GET /expenses/:id` | `branch_id?` | 200 | `Expense` |
| `POST /expenses/:id/approve` | `{}` | 200 | `Expense` |
| `POST /expenses/:id/reject` | `{reason}` | 200 | `Expense` |

## Reports and exports

All report endpoints accept applicable `from`, `to`, and `branch_id` query
parameters. `stock-valuation` uses `as_of` instead of a date window.

| Method and path | HTTP | `data` return structure |
|---|---:|---|
| `GET /reports/dashboard` | 200 | `{from,to,branch_id,net_revenue,collected,outstanding_receivable,discounts_given,invoices_issued,inventory_units,inventory_value,total_expenses}` |
| `GET /reports/product-performance` | 200 | `{from,to,branch_id,products:[{product_id,product_code,product_name,units_sold,revenue,current_stock,stock_value,cost_source}]}` |
| `GET /reports/sales-by-branch` | 200 | `{from,to,branch_id,branches:[{branch_id,branch_code,branch_name,invoice_count,net_revenue,discounts_given}]}` |
| `GET /reports/sales-by-rep` | 200 | `{from,to,branch_id,reps:[{sales_rep_id,sales_rep_name,invoice_count,net_revenue}]}` |
| `GET /reports/invoice-status` | 200 | `{from,to,branch_id,statuses:[{status,invoice_count,net_amount}]}` |
| `GET /reports/expense-breakdown` | 200 | `{from,to,branch_id,categories:[{category_id,category_code,category_name,expense_count,total}],category_count,expense_count,total,excluded:{pending:{expense_count,total},rejected:{expense_count,total}}}` |
| `GET /reports/profit-loss` | 200 | `{from,to,branch_id,revenue,cogs,gross_profit,approved_expenses,disposal_value,sample_value,net_profit,warnings:[{product_id,product_code,product_name,message,units,revenue_affected}]}` |
| `GET /reports/stock-valuation` | 200 | Same structure as `GET /stock/valuation` |
| `GET /reports/:name/export?format=xlsx` | 200 | Raw XLSX attachment |
| `GET /reports/:name/export?format=pdf` | 200 | Raw PDF attachment |

Export names: `dashboard`, `product-performance`, `sales-by-branch`,
`sales-by-rep`, `invoice-status`, `expense-breakdown`, `profit-loss`, and
`stock-valuation`.

## Audit log

| Method and path | Request/query | HTTP | `data` return structure |
|---|---|---:|---|
| `GET /audit-log` | `table_name?,record_id?,user_id?,action?,from?,to?,page?,per_page?` | 200 | `[{id,user_id,table_name,record_id,action,old_values,new_values,ip_address,created_at}]` plus pagination `meta` |

This endpoint is ADMIN-only. `action` is one of `CREATE`, `UPDATE`, `DELETE`,
`REVERSE`, or `APPROVE`.
