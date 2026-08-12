export type Env = {
  Bindings: {
    DB: D1Database;
    SESSION_SECRET: string;
    OAUTH_CLIENT_ID: string;
    OAUTH_CLIENT_SECRET: string;
    UI_USERNAME: string;
    UI_PASSWORD: string;
  };
  Variables: {
    apiClientId?: string;
  };
};

export type QuoteStatus = "Draft" | "Sent" | "Won" | "Lost";

export interface Customer {
  id: number;
  name: string;
  ref_id: string;
  industry: string;
  country: string;
  account_owner: string;
  created_at: string;
}

export interface QuoteItem {
  id: number;
  quote_id: number;
  sku: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Quote {
  id: number;
  ref: string;
  customer_id: number;
  vendor: string;
  status: QuoteStatus;
  margin_pct: number;
  subtotal: number;
  total_amount: number;
  created_at: string;
}

export interface QuoteWithItems extends Quote {
  items: QuoteItem[];
}
