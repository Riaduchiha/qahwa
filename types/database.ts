// Types manuels reflétant la structure réelle de la base Supabase.
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

export type Employee = {
  id: string;
  name: string;
  position: string;
  phone: string;
  salary: number;
  code: string;
  photo_url: string | null;
  active: boolean;
  created_at: string;
};

export type EmployeeSchedule = {
  id: string;
  employee_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  created_at: string;
};

export type ClockEventType = "in" | "out";

export type ClockEventType = "in" | "out";

export type ClockOutType = "temporary" | "final" | null;

export type EmployeeClockEvent = {
  id: string;
  employee_id: string;
  event_type: ClockEventType;
  out_type: ClockOutType;
  photo_url: string | null;
  created_at: string;
};

export type EmployeeAdvance = {
  id: string;
  employee_id: string;
  amount: number;
  note: string | null;
  advance_date: string;
  created_at: string;
};

export type Ingredient = {
  id: string;
  name: string;
  quantity_in_stock: number;
  unit: string;
  alert_threshold: number;
  cost_per_unit: number;
  created_at: string;
};

export type ProductIngredient = {
  product_id: string;
  ingredient_id: string;
  quantity_used: number;
};

export type Supplier = {
  id: string;
  name: string;
  phone: string;
  address: string;
  created_at: string;
};

export type IngredientSupplier = {
  id: string;
  ingredient_id: string;
  supplier_id: string;
  price: number;
};

export type CafeEvent = {
  id: string;
  title: string;
  event_date: string;
  recurring: boolean;
  type: string | null;
  created_at: string;
};

export type DuoGameStatus = "waiting" | "ready" | "playing" | "finished";

export type DuoGame = {
  id: string;
  code: string;
  status: DuoGameStatus;
  current_round: number;
  describer_player: number;
  round_end_at: string | null;
  created_at: string;
};

export type DuoPlayer = {
  id: string;
  game_id: string;
  player_number: number;
  nickname: string;
  score: number;
  created_at: string;
};

export type DuoWordStatus = "pending" | "found" | "skipped";

export type DuoWord = {
  id: string;
  game_id: string;
  round: number;
  word: string;
  order_index: number;
  status: DuoWordStatus;
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
      play_games: {
        Row: PlayGame;
        Insert: Partial<PlayGame>;
        Update: Partial<PlayGame>;
        Relationships: [];
      };
      play_players: {
        Row: PlayPlayer;
        Insert: Partial<PlayPlayer>;
        Update: Partial<PlayPlayer>;
        Relationships: [];
      };
      play_answers: {
        Row: PlayAnswer;
        Insert: Partial<PlayAnswer>;
        Update: Partial<PlayAnswer>;
        Relationships: [];
      };
      employees: {
        Row: Employee;
        Insert: Partial<Employee>;
        Update: Partial<Employee>;
        Relationships: [];
      };
      employee_schedules: {
        Row: EmployeeSchedule;
        Insert: Partial<EmployeeSchedule>;
        Update: Partial<EmployeeSchedule>;
        Relationships: [];
      };
      employee_clock_events: {
        Row: EmployeeClockEvent;
        Insert: Partial<EmployeeClockEvent>;
        Update: Partial<EmployeeClockEvent>;
        Relationships: [];
      };
      employee_advances: {
        Row: EmployeeAdvance;
        Insert: Partial<EmployeeAdvance>;
        Update: Partial<EmployeeAdvance>;
        Relationships: [];
      };
      ingredients: {
        Row: Ingredient;
        Insert: Partial<Ingredient>;
        Update: Partial<Ingredient>;
        Relationships: [];
      };
      product_ingredients: {
        Row: ProductIngredient;
        Insert: Partial<ProductIngredient>;
        Update: Partial<ProductIngredient>;
        Relationships: [];
      };
      suppliers: {
        Row: Supplier;
        Insert: Partial<Supplier>;
        Update: Partial<Supplier>;
        Relationships: [];
      };
      ingredient_suppliers: {
        Row: IngredientSupplier;
        Insert: Partial<IngredientSupplier>;
        Update: Partial<IngredientSupplier>;
        Relationships: [];
      };
      events: {
        Row: CafeEvent;
        Insert: Partial<CafeEvent>;
        Update: Partial<CafeEvent>;
        Relationships: [];
      };
      duo_games: {
        Row: DuoGame;
        Insert: Partial<DuoGame>;
        Update: Partial<DuoGame>;
        Relationships: [];
      };
      duo_players: {
        Row: DuoPlayer;
        Insert: Partial<DuoPlayer>;
        Update: Partial<DuoPlayer>;
        Relationships: [];
      };
      duo_words: {
        Row: DuoWord;
        Insert: Partial<DuoWord>;
        Update: Partial<DuoWord>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};