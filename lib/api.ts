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
};

export type ProductDetail = Product & {
  description?: string;
  short_description?: string;
  other_images?: string;
  category_slug?: string;
  category_id?: number;
  is_returnable?: number;
  cod_allowed?: number;
  minimum_order_quantity?: number | null;
  total_allowed_quantity?: number | null;
  quantity_step_size?: number | null;
  tax_percentage?: number;
  is_prices_inclusive_tax?: number;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  status: number;
  page_url?: string;
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

export type ProductRating = {
  id: number;
  rating: number;
  comment: string;
  images: string;
  data_added: string;
  username: string;
  user_image?: string;
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

  sliders: (params?: Record<string, string | number>) =>
    get<Paginated<Slider>>('/sliders', params),

  settings: () =>
    get<SiteSettings>('/settings'),

  addresses: () =>
    get<{ rows: Address[] }>('/addresses'),

  collections: () =>
    get<{ rows: Collection[] }>('/collections'),
};

export function imgUrl(path: string) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${process.env.NEXT_PUBLIC_UPLOADS_URL ?? 'http://localhost:3000/uploads'}/${path}`;
}
