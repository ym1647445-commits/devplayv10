export type Product = {
  id: number;
  category: string | null;
  game: string | null;
  name: string | null;
  price_buy: number | null;
  profit_type: string | null;
  profit_value: number | null;
  price_sell: number | null;
  image: string | null;
  need: string | null;
  popular: boolean | null;
  active: boolean | null;
  delivery_type: string | null;
  sort_order: number | null;
  badge: string | null;
  region: string | null;
  featured: boolean | null;
  stock: number | null;
  tags: string | null;
};

export type Category = {
  id: number;
  name: string;
  image: string | null;
  active: boolean | null;
  sort_order: number | null;
};

export type Order = {
  id: number;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  product_name: string | null;
  quantity: number | null;
  total_price: number | null;
  order_data: string | null;
  status: string | null;
  delivery_type: string | null;
  delivery_code: string | null;
  delivery_note: string | null;
  admin_note: string | null;
  cancel_reason: string | null;
  device_id: string | null;
  created_at: string | null;
  completed_at: string | null;
};