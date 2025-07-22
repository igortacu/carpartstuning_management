// src/types.ts

// What the stock-table & sale-modal read:
export interface StockItem {
  id:              string;
  name:            string;
  category:        string;
  line_number:     number;
  description:     string;
  unit:            string;
  quantity:        number;
  unit_price:      number;
  value:           number;
  vat:             number;
  supplier:        string;
  proforma_number: string;
  serie:           string;
  date:            string;
  currency:        string;
  created_at:      string;
  updated_at:      string;
}
// What you send when inserting/updating stock:
// types/index.ts (excerpt)
export interface StockItemInsert {
  line_number:     number;
  proforma_number: string;
  description:     string;
  unit:            string;
  quantity:        number;
  unit_price:      number;
  value:           number;
  vat:             number;
  supplier:        string;
  serie:           string;
  date:            string;
  currency:        string;
}


// ——————————————————————————————————————————————
// What the sold-table actually reads (your DB has no `name` or `category`):
// src/types.ts
export interface SoldItem {
  id:              string;
  stock_item_id:   string;
  name:            string;
  category:        string;
  description:     string;
  unit:            string;
  quantity_sold:   number;
  sale_price:      number;
  total_value:     number;
  sold_by:         string;
  sold_date:       string;
  created_at:      string;
  sursa:           string;
}


// when inserting, you omit `id` (and Postgres will fill it for you):
export type SoldItemInsert = Omit<SoldItem, 'id' | 'created_at'> & {
  sursa: string;
}

export interface InAsteptareItem {
  id:           string;
  stock_item_id: string;
  description:  string;
  unit:         string;
  qty_total:    number;
  qty_sold:     number;
  qty_pending:  number;
  comment:      string | null;
  created_at:   string;
}

export type InAsteptareInsert = Omit<
  InAsteptareItem,
  "id" | "created_at" | "qty_pending"
>;
// A type that covers what the modal needs:
export type SaleItem = StockItem | InAsteptareItem;
export type SaleContext = 'stock' | 'pending';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}


export interface AnalyticsData {
  totalStockValue: number;
  totalSales: number;
  topSellingItems: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  salesByCategory: Array<{
    category: string;
    total: number;
  }>;
  salesOverTime: Array<{
    date: string;
    sales: number;
  }>;
}