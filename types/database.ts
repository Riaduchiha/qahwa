// Types manuels reflétant supabase/migrations/0001_menu.sql.
// À terme, remplaçables par une génération automatique :
//   npx supabase gen types typescript --project-id <id> > types/database.ts
export type Category = {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
};

export type ProductOption = {
  id: string;
  group_id: string;
  label: string;
  price_delta: number;
  is_default: boolean;
  display_order: number;
};

export type ProductOptionGroup = {
  id: string;
  product_id: string;
  name: string;
  is_required: boolean;
  allow_multiple: boolean;
  display_order: number;
  product_options: ProductOption[];
};

export type Product = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  display_order: number;
  created_at: string;
  station: Station;
  product_option_groups: ProductOptionGroup[];
};

export type Station = "barista" | "bar" | "cuisine";
export type OrderItemStatus = "new" | "preparing" | "ready";

export type OrderType = "livraison" | "emporter" | "sur_place";
export type OrderStatus =
  | "recue"
  | "preparation"
  | "prete"
  | "servi"
  | "livraison"
  | "livree"
  | "refusee"
  | "annulee";

export type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  order_type: OrderType;
  delivery_commune: string | null;
  delivery_address: string | null;
  delivery_notes: string | null;
  pickup_time: string | null;
  table_number: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  cancel_reason: string | null;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  status: OrderItemStatus;
  station: Station;
};

export type CafeTable = {
  id: string;
  number: number;
  is_active: boolean;
  reserved: boolean;
  created_at: string;
};
export type PlayGameStatus = "waiting" | "question" | "results" | "finished";

export type PlayGame = {
  id: string;
  code: string;
  status: PlayGameStatus;
  current_question: number;
  created_at: string;
};

export type PlayPlayer = {
  id: string;
  game_id: string;
  nickname: string;
  score: number;
  created_at: string;
};

export type PlayAnswer = {
  id: string;
  game_id: string;
  player_id: string;
  question_index: number;
  answer_index: number;
  is_correct: boolean;
  created_at: string;
};
export type Database = {
  public: {
    Tables: {
      categories: {
        Row: Category;
        Insert: Partial<Category>;
        Update: Partial<Category>;
        Relationships: [];
      };
      products: {
        Row: Omit<Product, "product_option_groups">;
        Insert: Partial<Omit<Product, "product_option_groups">>;
        Update: Partial<Omit<Product, "product_option_groups">>;
        Relationships: [];
      };
      product_option_groups: {
        Row: Omit<ProductOptionGroup, "product_options">;
        Insert: Partial<Omit<ProductOptionGroup, "product_options">>;
        Update: Partial<Omit<ProductOptionGroup, "product_options">>;
        Relationships: [];
      };
      product_options: {
        Row: ProductOption;
        Insert: Partial<ProductOption>;
        Update: Partial<ProductOption>;
        Relationships: [];
      };
      orders: {
        Row: Order;
        Insert: Partial<Order>;
        Update: Partial<Order>;
        Relationships: [];
      };
      order_items: {
        Row: OrderItem;
        Insert: Partial<OrderItem>;
        Update: Partial<OrderItem>;
        Relationships: [];
      };
      tables: {
        Row: CafeTable;
        Insert: Partial<CafeTable>;
        Update: Partial<CafeTable>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
