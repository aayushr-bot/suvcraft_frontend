const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

async function get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(`${BASE}/api/v1${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }
  const res = await fetch(url.toString(), { cache: "no-store", credentials: "include" });
  if (!res.ok) throw new Error(`API error ${res.status} on ${path}`);
  const json = await res.json();
  return json.data as T;
}

export type ProductColorSwatch = {
  id: number;
  value: string;
  swatche_value?: string | null;
};

export type Product = {
  id: number;
  name: string;
  slug: string;
  image: string;
  status: number;
  rating: number;
  no_of_ratings: number;
  stock: number;
  category_name: string;
  brand_name: string;
  price?: number;
  special_price?: number;
  tax_percentage?: number;
  is_prices_inclusive_tax?: number;
  colors?: ProductColorSwatch[];
};

export type AttributeValue = {
  id: number;
  value: string;
  swatche_type?: string | null;
  swatche_value?: string | null;
};

export type AttributeOption = {
  id: number;
  name: string;
  values: AttributeValue[];
};

export type ProductVariant = {
  id: number;
  attribute_value_ids: number[];
  price: number;
  special_price: number;
  stock: number | null;
};

export type ProductDetail = Product & {
  description?: string;
  short_description?: string;
  other_images?: string;
  size_chart?: string;
  category_slug?: string;
  category_id?: number;
  is_returnable?: number;
  cod_allowed?: number;
  minimum_order_quantity?: number | null;
  total_allowed_quantity?: number | null;
  quantity_step_size?: number | null;
  tax_percentage?: number;
  is_prices_inclusive_tax?: number;
  attribute_options?: AttributeOption[];
  variants?: ProductVariant[];
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  status: number;
  page_url?: string;
};

export type CategoryTab = {
  id: number;
  slug: string;
  label: string;
  status: number;
  row_order: number;
  category_id: number;
  category_name?: string;
};

export type Slider = {
  id: number;
  type: string;
  type_id?: number;
  image: string;
  link: string;
  discount_text: string;
  buy_now_text: string;
  buy_now_link: string;
  title?: string;
  description?: string;
  bg_color?: string;
  bg_image?: string;
  row_order?: number;
  product_name?: string;
  category_name?: string;
  name?: string;
};

export type Paginated<T> = {
  rows: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export type Collection = {
  id: number;
  title: string;
  description?: string;
  btn_text?: string;
  btn_link?: string;
  image?: string;
  row_order: number;
  status: number;
};

export type Address = {
  id: number;
  user_id?: number;
  name: string;
  type?: string;
  mobile: string;
  alternate_mobile?: string;
  email?: string;
  address: string;
  landmark?: string;
  city: string;
  area?: string;
  pincode: string;
  state?: string;
  country?: string;
  is_default: number;
};

export type SiteSettings = {
  hero_heading?: string;
  hero_heading_bold?: string;
  hero_heading_end?: string;
  hero_customer_count?: string;
  hero_customer_label?: string;
  hero_discount_text?: string;
  hero_btn_text?: string;
  hero_btn_link?: string;
  hero_avatar_1?: string;
  hero_avatar_2?: string;
  hero_avatar_3?: string;
  // Products catalog page customer banner
  products_avatar_1?: string;
  products_avatar_2?: string;
  products_avatar_3?: string;
  products_customer_count?: string;
  products_customer_label?: string;
  products_title?: string;
  products_description?: string;
  // Payment methods — only the storefront-safe flag for wallet is exposed; gateway secrets stay private.
  wallet_method?: number | string;
  // Feature Work page — admin-controlled layout
  feature_title?: string;
  feature_description?: string;
  feature_cta_text?: string;
  feature_cta_link?: string;
  feature_promo1_eyebrow?: string;
  feature_promo1_title?: string;
  feature_promo1_subtitle?: string;
  feature_promo1_cta_text?: string;
  feature_promo1_cta_link?: string;
  feature_promo2_eyebrow?: string;
  feature_promo2_title?: string;
  feature_promo2_subtitle?: string;
  feature_promo2_cta_text?: string;
  feature_promo2_cta_link?: string;
  feature_promo3_eyebrow?: string;
  feature_promo3_title?: string;
  feature_promo3_subtitle?: string;
  feature_promo3_cta_text?: string;
  feature_promo3_cta_link?: string;
  feature_section1_title?: string;
  feature_section1_subtitle?: string;
  feature_section1_product_ids?: string;
  feature_section1_min_discount?: string | number;
  feature_section1_source?: string;
  feature_section2_title?: string;
  feature_section2_subtitle?: string;
  feature_section2_product_ids?: string;
  feature_section2_min_discount?: string | number;
  feature_section2_source?: string;
  feature_section3_title?: string;
  feature_section3_subtitle?: string;
  feature_section3_product_ids?: string;
  feature_section3_min_discount?: string | number;
  feature_section3_source?: string;
  feature_section4_title?: string;
  feature_section4_subtitle?: string;
  feature_section4_product_ids?: string;
  feature_section4_min_discount?: string | number;
  feature_section4_source?: string;
  logo?: string;
  app_name?: string;
  // Top-Selling section
  topselling_heading?: string;
  topselling_subheading?: string;
  topselling_description?: string;
  topselling_btn_text?: string;
  topselling_btn_link?: string;
  topselling_more_text?: string;
  topselling_more_link?: string;
  topselling_product_ids?: string;
  // Footer
  footer_phone?: string;
  footer_email?: string;
  footer_menu_1_title?: string;
  footer_menu_1_links?: string;
  footer_menu_2_title?: string;
  footer_menu_2_links?: string;
  footer_instagram?: string;
  footer_facebook?: string;
  footer_whatsapp?: string;
  footer_playstore?: string;
  footer_appstore?: string;
  footer_copyright?: string;
  // Web General (admin Settings → General)
  site_title?: string;
  support_number?: string;
  support_email?: string;
  delivery_terms?: string;
  copyright_details?: string;
  address?: string;
  app_short_description?: string;
  map_iframe?: string;
  meta_keywords?: string;
  meta_description?: string;
  modern_theme_color?: string;
  footer_logo?: string;
  favicon?: string;
  // App download promo (admin Settings → App download Section)
  app_download_section?: string | number;
  app_download_section_title?: string;
  app_download_section_tagline?: string;
  app_download_section_short_description?: string;
  app_download_section_playstore_url?: string;
  app_download_section_appstore_url?: string;
  // Social media — admin Settings → Social Media Links is now a dynamic list
  // of { image, url, label } entries. Old individual link fields kept for
  // back-compat with any existing storefront installs.
  social_links?: { image?: string; url?: string; label?: string }[];
  twitter_link?: string;
  facebook_link?: string;
  instagram_link?: string;
  youtube_link?: string;
  // Feature Section (Shipping / Return / Support / Safety strip)
  shipping_mode?: string | number;
  shipping_title?: string;
  shipping_description?: string;
  return_mode?: string | number;
  return_title?: string;
  return_description?: string;
  support_mode?: string | number;
  support_title?: string;
  support_description?: string;
  safety_security_mode?: string | number;
  safety_security_title?: string;
  safety_security_description?: string;
};

export type TicketType = {
  id: number;
  name: string;
};

export type SupportTicket = {
  id: number;
  ticket_type_id: number | null;
  ticket_type_title?: string | null;
  subject: string;
  email: string;
  description: string;
  status: number;
  last_updated: string;
  date_created: string;
  message_count?: number;
};

export type SupportTicketMessage = {
  id: number;
  user_type: "user" | "admin" | string;
  user_id: number;
  message: string;
  attachments?: string;
  date_created: string;
};

export type SupportTicketDetail = SupportTicket & {
  messages: SupportTicketMessage[];
};

export type FaqItem = {
  id: number;
  question: string;
  answer: string;
  sort_order?: number;
};

export type FaqCategory = {
  id: number;
  slug: string;
  label: string;
  blurb?: string;
  /** Free-form key the storefront maps to an icon component. */
  icon?: string;
  sort_order?: number;
  status?: number;
  items: FaqItem[];
};

export type ProductRating = {
  id: number;
  rating: number;
  comment: string;
  images: string;
  data_added: string;
  username: string;
  user_image?: string;
  like_count?: number;
  dislike_count?: number;
  user_vote?: number;
};

export type RatingSummary = {
  total: number;
  avg_rating: number;
  r5: number; r4: number; r3: number; r2: number; r1: number;
};

export const api = {
  products: (params?: Record<string, string | number>) =>
    get<Paginated<Product>>('/products', params),

  product: (id: number | string) =>
    get<ProductDetail>(`/products/${id}`),

  productRatings: (id: number | string, limit = 10) =>
    get<{ rows: ProductRating[]; summary: RatingSummary }>(`/products/${id}/ratings`, { limit }),

  popularProducts: (params?: Record<string, string | number>) =>
    get<{ rows: Product[] }>('/products/popular', params),

  categories: () =>
    get<Paginated<Category>>('/categories', { per_page: 100, status: '1' }),

  categoryTabs: (params?: Record<string, string | number>) =>
    get<{ rows: CategoryTab[] }>('/category-tabs', params),

  sliders: (params?: Record<string, string | number>) =>
    get<Paginated<Slider>>('/sliders', params),

  settings: () =>
    get<SiteSettings>('/settings'),

  addresses: () =>
    get<{ rows: Address[] }>('/addresses'),

  collections: () =>
    get<{ rows: Collection[] }>('/collections'),

  faqs: () =>
    get<{ categories: FaqCategory[] }>('/faqs'),

  ticketTypes: () =>
    get<{ rows: TicketType[] }>('/support/ticket-types'),

  myTickets: () =>
    get<{ rows: SupportTicket[] }>('/support/tickets'),

  ticket: (id: number | string) =>
    get<{ ticket: SupportTicketDetail }>(`/support/tickets/${id}`),
};

// Reply on an existing ticket. Returns the server message so the modal can
// confirm in-context (e.g. "Reply sent.").
export async function postTicketReply(ticketId: number | string, message: string): Promise<void> {
  const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
  const res = await fetch(`${BASE}/api/v1/support/tickets/${ticketId}/messages`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  const json = await res.json();
  if (!res.ok || json?.error) {
    throw new Error(json?.message || `Request failed (${res.status})`);
  }
}

// Raise a support ticket. Returns the new ticket id on success, or throws
// with the server-provided message so the modal can display it inline.
export async function createSupportTicket(input: {
  ticket_type_id?: number | null;
  subject: string;
  description: string;
  email?: string;
}): Promise<{ id: number }> {
  const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
  const res = await fetch(`${BASE}/api/v1/support/tickets`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!res.ok || json?.error) {
    throw new Error(json?.message || `Request failed (${res.status})`);
  }
  return json.data as { id: number };
}

export function imgUrl(path: string) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${process.env.NEXT_PUBLIC_UPLOADS_URL ?? 'http://localhost:3000/uploads'}/${path}`;
}
