export type ScrapedProduct = {
  mainImage: string | null;
  title: string | null;
  price: string | null;
  link: string;
  storeName: string | null;
};

export type ScrapeResult = ScrapedProduct & {
  error?: string;
};

export type ProcurementDraft = {
  item: string;
  priceTHB: number | null;
  linkToProduct: string | null;
  supplier: string | null;
  imageUrl: string | null;
  department: string | null;
  status: string | null;
  objectCategories: string[];
  quantity: number | null;
  trackingNumber: string | null;
  invoice: string | null;
  description: string | null;
};

export type ProcurementImportResult = {
  index: number;
  item: string;
  success: boolean;
  pageId?: string;
  url?: string;
  error?: string;
};

export type ProcurementMetadata = {
  departments: string[];
  statuses: string[];
  objectCategories: string[];
};

