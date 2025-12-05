import { LOYVERSE_ACCESS_TOKEN } from '$env/static/private';

const BASE_URL = 'https://api.loyverse.com/v1.0';

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
  modifiers_ids?: string[];
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
  variants: Array<{
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

interface GetCategoriesResponse {
  categories: LoyverseCategory[];
  cursor?: string;
}

interface GetItemsResponse {
  items: LoyverseItem[];
  cursor?: string;
}

class LoyverseClient {
  private token: string;

  constructor() {
    if (!LOYVERSE_ACCESS_TOKEN) {
      throw new Error('LOYVERSE_ACCESS_TOKEN is not defined in environment variables');
    }
    this.token = LOYVERSE_ACCESS_TOKEN;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Loyverse API Error (${response.status}): ${errorText}`);
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
      allItems = allItems.concat(response.items);
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
      allCategories = allCategories.concat(response.categories);
      cursor = response.cursor;
    } while (cursor);

    return allCategories;
  }

  async createCategory(name: string): Promise<LoyverseCategory> {
    return this.request<LoyverseCategory>('/categories', {
      method: 'POST',
      body: JSON.stringify({ name }),
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

  async uploadImage(itemId: string, imageUrl: string): Promise<void> {
    // 1. Fetch the image from the source URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image from source: ${imageResponse.statusText}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/png';

    // 2. Upload to Loyverse
    // The request method returns parsed JSON, but image upload might return empty body or plain text
    // The error "Unexpected end of JSON input" happened here because request() tries to parse response.
    // We updated request() to handle empty bodies.
    await this.request<void>(`/items/${itemId}/image`, {
      method: 'POST',
      body: imageBuffer,
      headers: {
        'Content-Type': contentType
      }
    });
  }
}


export const loyverse = new LoyverseClient();

