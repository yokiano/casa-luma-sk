import { Buffer } from 'node:buffer';
import sharp from 'sharp';
import type { GetReceiptsParams, LoyverseReceipt } from '$lib/receipts/types';

const BASE_URL = 'https://api.loyverse.com/v1.0';

export interface LoyverseClientOptions {
  accessToken: string;
  fetch?: typeof fetch;
}

export interface LoyverseTax {
  id: string;
  name: string;
  type: 'INCLUDED' | 'ADDED';
  rate: number;
  stores?: string[];
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface CreateLoyverseTaxPayload {
  name: string;
  type: 'INCLUDED' | 'ADDED';
  rate: number;
  stores?: string[];
}

export interface LoyversePaymentType {
  id: string;
  name: string;
  type?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface CreateLoyverseReceiptPayment {
  payment_type_id: string;
  money_amount: number;
  name?: string;
  type?: string;
  paid_at?: string;
}

export interface CreateLoyverseReceiptLineItem {
  variant_id: string;
  quantity: number;
  price?: number;
  cost?: number;
  line_note?: string;
  line_taxes?: Array<{ id: string }>;
  line_discounts?: Array<{ id: string }>;
  line_modifiers?: Array<{ modifier_option_id: string; price?: number }>;
}

export interface CreateLoyverseReceiptDiscount {
  id: string;
  scope: 'RECEIPT' | 'LINE_ITEM';
  percentage?: number;
  money_amount?: number;
}

/**
 * Writable sale create payload. Intentionally excludes customer_id and employee_id
 * at the type level for second-account mirroring; callers that need them later
 * must extend this contract deliberately.
 */
export interface CreateLoyverseReceiptPayload {
  store_id: string;
  line_items: CreateLoyverseReceiptLineItem[];
  payments: CreateLoyverseReceiptPayment[];
  receipt_date?: string;
  source?: string;
  order?: string;
  note?: string;
  total_discounts?: CreateLoyverseReceiptDiscount[];
}

export interface LoyverseCustomer {
  id: string;
  customer_code?: string;
  name: string;
  email?: string;
  phone_number?: string;
  address?: string;
  note?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface CreateLoyverseCustomerPayload {
  /**
   * Loyverse internal ID. If included, should update existing customer (if supported).
   * Prefer using email-based upsert behavior instead.
   */
  id?: string;
  /** External customer code (e.g. GR1) */
  customer_code?: string;
  name: string;
  email?: string;
  phone_number?: string;
  address?: string;
  note?: string;
}

export interface LoyverseItem {
  id: string;
  handle: string;
  item_name: string;
  description?: string;
  reference_id?: string;
  category_id?: string;
  track_stock?: boolean;
  sold_by_weight?: boolean;
  is_composite?: boolean;
  use_production?: boolean;
  components?: Array<{ variant_id: string; quantity: number }>;
  primary_supplier_id?: string;
  tax_ids?: string[];
  modifier_ids?: string[];
  form?: 'SQUARE' | 'CIRCLE' | 'SUN' | 'OCTAGON';
  color?: 'GREY' | 'RED' | 'PINK' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE' | 'PURPLE';
  image_url?: string;
  option1_name?: string;
  option2_name?: string;
  option3_name?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
  variants: LoyverseVariant[];
}

export interface LoyverseVariant {
  variant_id: string;
  item_id: string;
  sku?: string;
  reference_variant_id?: string;
  option1_value?: string;
  option2_value?: string;
  option3_value?: string;
  barcode?: string;
  cost?: number;
  purchase_cost?: number;
  default_pricing_type?: 'FIXED' | 'VARIABLE';
  default_price?: number;
  stores?: Array<{ store_id: string; price: number; pricing_type: string }>;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface CreateLoyverseItemPayload {
  item_name: string;
  description?: string;
  category_id?: string | null;
  track_stock?: boolean;
  sold_by_weight?: boolean;
  is_composite?: boolean;
  image_url?: string;
  modifier_ids?: string[];
  option1_name?: string | null;
  option2_name?: string | null;
  option3_name?: string | null;
  variants: Array<{
    variant_id?: string;
    sku?: string;
    option1_value?: string;
    option2_value?: string;
    option3_value?: string;
    barcode?: string;
    cost?: number;
    purchase_cost?: number;
    default_pricing_type?: 'FIXED' | 'VARIABLE';
    default_price?: number;
  }>;
}

export interface LoyverseCategory {
  id: string;
  name: string;
  color?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface LoyverseDiscount {
  id: string;
  name: string;
  type: 'FIXED_PERCENT' | 'FIXED_AMOUNT' | 'VARIABLE_PERCENT' | 'VARIABLE_AMOUNT' | 'DISCOUNT_BY_POINTS';
  discount_amount?: number;
  discount_percent?: number;
  stores?: string[];
  restricted_access?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface CreateLoyverseDiscountPayload {
  name: string;
  type: 'FIXED_PERCENT' | 'FIXED_AMOUNT' | 'VARIABLE_PERCENT' | 'VARIABLE_AMOUNT' | 'DISCOUNT_BY_POINTS';
  discount_amount?: number;
  discount_percent?: number;
  stores?: string[];
  restricted_access?: boolean;
}

export interface LoyverseModifierOption {
  option_id: string;
  /** Some Loyverse responses use `id` instead of `option_id`. */
  id?: string;
  name: string;
  price: number;
  ordering: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface LoyverseModifier {
  id: string;
  name: string;
  position: number;
  stores?: string[];
  modifier_options: LoyverseModifierOption[];
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface CreateLoyverseModifierPayload {
  name: string;
  position: number;
  stores?: string[];
  modifier_options: {
    name: string;
    price: number;
    ordering: number;
  }[];
}


interface GetCategoriesResponse {
  categories: LoyverseCategory[];
  cursor?: string;
}

interface GetCustomersResponse {
  customers: LoyverseCustomer[];
  cursor?: string;
}

interface GetItemsResponse {
  items: LoyverseItem[];
  cursor?: string;
}

interface GetDiscountsResponse {
  discounts: LoyverseDiscount[];
  cursor?: string;
}

interface GetModifiersResponse {
  modifiers: LoyverseModifier[];
  cursor?: string;
}

interface GetTaxesResponse {
  taxes: LoyverseTax[];
  cursor?: string;
}

interface GetPaymentTypesResponse {
  payment_types: LoyversePaymentType[];
  cursor?: string;
}

interface GetReceiptsResponse {
  receipts: LoyverseReceipt[];
  cursor?: string;
}

export class LoyverseApiError extends Error {
  readonly status: number;
  readonly bodyText: string;
  readonly endpoint: string;

  constructor(status: number, bodyText: string, endpoint: string) {
    super(`Loyverse API Error (${status}): ${bodyText}`);
    this.name = 'LoyverseApiError';
    this.status = status;
    this.bodyText = bodyText;
    this.endpoint = endpoint;
  }
}

export class LoyverseClient {
  private token: string;
  private fetchImpl: typeof fetch;

  constructor(options: LoyverseClientOptions) {
    if (!options?.accessToken) {
      throw new Error('Loyverse access token is not defined');
    }
    this.token = options.accessToken;
    this.fetchImpl = options.fetch ?? fetch;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await this.fetchImpl(url, { ...options, headers });

    if (!response.ok) {
      const errorText = await response.text();
      throw new LoyverseApiError(response.status, errorText, endpoint);
    }

    // Some endpoints might return empty body (e.g. DELETE or some 201s)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T;
    }

    try {
      const text = await response.text();
      return text ? JSON.parse(text) : {} as T;
    } catch (e) {
      // If parsing failed but request was OK, just return empty object if valid for that endpoint
      console.warn(`Loyverse API: Failed to parse JSON response from ${endpoint}`, e);
      return {} as T;
    }
  }

  // --- Customers ---

  async getCustomers(limit = 50, cursor?: string): Promise<GetCustomersResponse> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (cursor) {
      params.append('cursor', cursor);
    }

    return this.request<GetCustomersResponse>(`/customers?${params.toString()}`);
  }

  async getAllCustomers(): Promise<LoyverseCustomer[]> {
    let allCustomers: LoyverseCustomer[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.getCustomers(250, cursor);
      const activeCustomers = response.customers.filter(c => !c.deleted_at);
      allCustomers = allCustomers.concat(activeCustomers);
      cursor = response.cursor;
    } while (cursor);

    return allCustomers;
  }

  /**
   * Create (or update) a customer.
   * Loyverse behavior: if `email` matches an existing customer, it updates that customer.
   */
  async createOrUpdateCustomer(customer: CreateLoyverseCustomerPayload): Promise<LoyverseCustomer> {
    return this.request<LoyverseCustomer>('/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  }

  async getItems(limit = 50, cursor?: string): Promise<GetItemsResponse> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (cursor) {
      params.append('cursor', cursor);
    }

    return this.request<GetItemsResponse>(`/items?${params.toString()}`);
  }

  async getAllItems(): Promise<LoyverseItem[]> {
    let allItems: LoyverseItem[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.getItems(250, cursor);
      // Filter out deleted items
      const activeItems = response.items.filter(item => !item.deleted_at);
      allItems = allItems.concat(activeItems);
      cursor = response.cursor;
    } while (cursor);

    return allItems;
  }

  async getCategories(limit = 50, cursor?: string): Promise<GetCategoriesResponse> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (cursor) {
      params.append('cursor', cursor);
    }
    return this.request<GetCategoriesResponse>(`/categories?${params.toString()}`);
  }

  async getAllCategories(): Promise<LoyverseCategory[]> {
    let allCategories: LoyverseCategory[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.getCategories(250, cursor);
      // Filter out deleted categories
      const activeCategories = response.categories.filter(cat => !cat.deleted_at);
      allCategories = allCategories.concat(activeCategories);
      cursor = response.cursor;
    } while (cursor);

    return allCategories;
  }

  async createCategory(name: string, color?: string): Promise<LoyverseCategory> {
    return this.request<LoyverseCategory>('/categories', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    });
  }

  async deleteCategory(id: string): Promise<void> {
    await this.request<void>(`/categories/${id}`, {
      method: 'DELETE',
    });
  }

  async createItem(item: CreateLoyverseItemPayload): Promise<LoyverseItem> {
    return this.request<LoyverseItem>('/items', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async updateItem(id: string, item: Partial<CreateLoyverseItemPayload>): Promise<LoyverseItem> {
    return this.request<LoyverseItem>('/items', {
      method: 'POST', // Loyverse uses POST for update if ID is included in body, but documentation says POST /items creates or updates.
      // Wait, doc says: "If included in the POST request it will cause an update instead of a creating a new object."
      // So we need to include the ID in the body.
      body: JSON.stringify({ ...item, id }),
    });
  }

  async deleteItem(id: string): Promise<void> {
    await this.request<void>(`/items/${id}`, {
      method: 'DELETE',
    });
  }

  async uploadImage(itemId: string, imageUrl: string): Promise<void> {
    console.log(`[Loyverse] Starting image upload for item ${itemId}. URL: ${imageUrl}`);

    // 1. Fetch the image from the source URL
    let imageResponse;
    try {
      imageResponse = await fetch(imageUrl);
    } catch (e: any) {
      console.error(`[Loyverse] Failed to fetch source image: ${e.message}`);
      throw new Error(`Failed to fetch image from URL: ${e.message}`);
    }

    if (!imageResponse.ok) {
      console.error(`[Loyverse] Source image returned ${imageResponse.status}: ${imageResponse.statusText}`);
      throw new Error(`Source image returned status ${imageResponse.status}: ${imageResponse.statusText}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    let buffer = Buffer.from(imageBuffer);
    let contentType = imageResponse.headers.get('content-type') || 'image/png';

    console.log(`[Loyverse] Image fetched. Size: ${buffer.length} bytes. Type: ${contentType}`);

    // Loyverse often fails with WebP or other formats. Convert to PNG if needed.
    // Also, if it's too large, resize/compress it.
    if (contentType === 'image/webp' || contentType === 'image/avif' || buffer.length > 2 * 1024 * 1024) {
      console.log(`[Loyverse] Converting/Resizing image... (Original type: ${contentType}, Size: ${buffer.length})`);
      try {
        const converted = await sharp(buffer)
          .resize({ width: 1024, height: 1024, fit: 'inside' }) // Reasonable max size
          .png() // Convert to PNG
          .toBuffer();
        
        // Update buffer and content type
        buffer = Buffer.from(converted);
        contentType = 'image/png';
        console.log(`[Loyverse] Image converted to PNG. New Size: ${buffer.length} bytes.`);
      } catch (sharpError: any) {
        console.error(`[Loyverse] Sharp conversion failed: ${sharpError.message}`);
        // Fallback to original buffer if conversion fails, though it might still fail upload
      }
    }

    if (buffer.length > 5 * 1024 * 1024) {
      console.warn(`[Loyverse] Warning: Image size (${buffer.length} bytes) exceeds 5MB recommendation.`);
    }

    // 2. Upload to Loyverse
    try {
      await this.request<void>(`/items/${itemId}/image`, {
        method: 'POST',
        body: buffer as unknown as BodyInit,
        headers: {
          'Content-Type': contentType,
          'Content-Length': buffer.length.toString()
        }
      });
      console.log(`[Loyverse] Image uploaded successfully for item ${itemId}`);
    } catch (e: any) {
      console.error(`[Loyverse] Upload failed for item ${itemId}: ${e.message}`);
      throw e;
    }
  }

  // --- Discounts ---

  async getDiscounts(limit = 50, cursor?: string): Promise<GetDiscountsResponse> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (cursor) {
      params.append('cursor', cursor);
    }
    return this.request<GetDiscountsResponse>(`/discounts?${params.toString()}`);
  }

  async getAllDiscounts(): Promise<LoyverseDiscount[]> {
    let allDiscounts: LoyverseDiscount[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.getDiscounts(250, cursor);
      // Filter out deleted discounts
      const activeDiscounts = response.discounts.filter(d => !d.deleted_at);
      allDiscounts = allDiscounts.concat(activeDiscounts);
      cursor = response.cursor;
    } while (cursor);

    return allDiscounts;
  }

  async createDiscount(discount: CreateLoyverseDiscountPayload): Promise<LoyverseDiscount> {
    return this.request<LoyverseDiscount>('/discounts', {
      method: 'POST',
      body: JSON.stringify(discount),
    });
  }

  async updateDiscount(id: string, discount: Partial<CreateLoyverseDiscountPayload>): Promise<LoyverseDiscount> {
    return this.request<LoyverseDiscount>('/discounts', {
      method: 'POST',
      body: JSON.stringify({ ...discount, id }),
    });
  }

  async deleteDiscount(id: string): Promise<void> {
    await this.request<void>(`/discounts/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Modifiers ---

  async getModifiers(limit = 50, cursor?: string): Promise<GetModifiersResponse> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (cursor) {
      params.append('cursor', cursor);
    }
    return this.request<GetModifiersResponse>(`/modifiers?${params.toString()}`);
  }

  async getAllModifiers(): Promise<LoyverseModifier[]> {
    let allModifiers: LoyverseModifier[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.getModifiers(250, cursor);
      // Filter out deleted modifiers
      const activeModifiers = response.modifiers.filter(m => !m.deleted_at);
      allModifiers = allModifiers.concat(activeModifiers);
      cursor = response.cursor;
    } while (cursor);

    return allModifiers;
  }

  async createModifier(modifier: CreateLoyverseModifierPayload): Promise<LoyverseModifier> {
    return this.request<LoyverseModifier>('/modifiers', {
      method: 'POST',
      body: JSON.stringify(modifier),
    });
  }

  async updateModifier(id: string, modifier: Partial<CreateLoyverseModifierPayload>): Promise<LoyverseModifier> {
    return this.request<LoyverseModifier>('/modifiers', {
      method: 'POST',
      body: JSON.stringify({ ...modifier, id }),
    });
  }

  async deleteModifier(id: string): Promise<void> {
    await this.request<void>(`/modifiers/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Taxes ---

  async getTaxes(limit = 50, cursor?: string): Promise<GetTaxesResponse> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (cursor) {
      params.append('cursor', cursor);
    }
    return this.request<GetTaxesResponse>(`/taxes?${params.toString()}`);
  }

  async getAllTaxes(): Promise<LoyverseTax[]> {
    let allTaxes: LoyverseTax[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.getTaxes(250, cursor);
      const activeTaxes = response.taxes.filter((tax) => !tax.deleted_at);
      allTaxes = allTaxes.concat(activeTaxes);
      cursor = response.cursor;
    } while (cursor);

    return allTaxes;
  }

  async createTax(tax: CreateLoyverseTaxPayload): Promise<LoyverseTax> {
    return this.request<LoyverseTax>('/taxes', {
      method: 'POST',
      body: JSON.stringify(tax),
    });
  }

  // --- Payment types (GET only; Loyverse does not allow create via API) ---

  async getPaymentTypes(limit = 50, cursor?: string): Promise<GetPaymentTypesResponse> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (cursor) {
      params.append('cursor', cursor);
    }
    return this.request<GetPaymentTypesResponse>(`/payment_types?${params.toString()}`);
  }

  async getAllPaymentTypes(): Promise<LoyversePaymentType[]> {
    let allPaymentTypes: LoyversePaymentType[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.getPaymentTypes(250, cursor);
      const active = response.payment_types.filter((pt) => !pt.deleted_at);
      allPaymentTypes = allPaymentTypes.concat(active);
      cursor = response.cursor;
    } while (cursor);

    return allPaymentTypes;
  }

  // --- Receipts ---

  async getReceipts(params: GetReceiptsParams = {}): Promise<GetReceiptsResponse> {
    const search = new URLSearchParams();
    if (params.receipt_numbers) search.append('receipt_numbers', params.receipt_numbers);
    if (params.since_receipt_number) search.append('since_receipt_number', params.since_receipt_number);
    if (params.before_receipt_number) search.append('before_receipt_number', params.before_receipt_number);
    if (params.store_id) search.append('store_id', params.store_id);
    if (params.order) search.append('order', params.order);
    if (params.source) search.append('source', params.source);
    if (params.updated_at_min) search.append('updated_at_min', params.updated_at_min);
    if (params.updated_at_max) search.append('updated_at_max', params.updated_at_max);
    if (params.created_at_min) search.append('created_at_min', params.created_at_min);
    if (params.created_at_max) search.append('created_at_max', params.created_at_max);
    if (params.limit) search.append('limit', params.limit.toString());
    if (params.cursor) search.append('cursor', params.cursor);

    const query = search.toString();
    return this.request<GetReceiptsResponse>(`/receipts${query ? `?${query}` : ''}`);
  }

  async createReceipt(receipt: CreateLoyverseReceiptPayload): Promise<LoyverseReceipt> {
    return this.request<LoyverseReceipt>('/receipts', {
      method: 'POST',
      body: JSON.stringify(receipt),
    });
  }

}


export const createLoyverseClient = (options: LoyverseClientOptions) => new LoyverseClient(options);
