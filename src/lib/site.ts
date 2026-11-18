/**
 * Public site URL, used for absolute Open Graph / Twitter image URLs.
 * Set NEXT_PUBLIC_SITE_URL at build time (e.g. https://your-domain.com).
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");

/** Official product page, used for the "Buy" call to action. */
export const OFFICIAL_PRODUCT_URL =
  "https://boat-lifestyle.com/products/rockerz-440-wireless-bluetooth-headphone";
