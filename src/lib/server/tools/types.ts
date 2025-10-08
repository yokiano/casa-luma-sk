export type ScrapedProduct = {
  mainImage: string | null;
  title: string | null;
  price: string | null;
  link: string;
  storeName: string | null;
};

export type ScrapeResult = ScrapedProduct;

export type ProcurementDraft = {
  item: string;
  priceTHB: number | null;
  linkToProduct: string;
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

