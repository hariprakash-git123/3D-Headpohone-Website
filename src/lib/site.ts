const SITE_URL_ENV_NAME = "NEXT_PUBLIC_SITE_URL";

/** Plain-HTTP site URLs are only accepted for local testing. */
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export interface SiteUrlResolution {
  /** Normalised absolute URL with no trailing slash, or undefined when unset/invalid. */
  url: string | undefined;
  /** Human-readable explanation when the URL could not be used (or was adjusted). */
  warning: string | undefined;
}

/**
 * Validates and normalises the public site URL.
 *
 * Never throws: a missing, empty, malformed, or unsafe value resolves to `url: undefined`
 * with a warning that names the environment variable, so the build keeps working and
 * URL-dependent metadata (canonical, Open Graph / Twitter images) is simply omitted.
 *
 * Rules:
 * - surrounding whitespace is trimmed
 * - must parse as an absolute URL
 * - must use https: (http: is allowed only for localhost / 127.0.0.1 / [::1])
 * - must not contain credentials
 * - query string and fragment are dropped (with a warning); trailing slashes are removed
 */
export function resolveSiteUrl(raw: string | undefined): SiteUrlResolution {
  const value = raw?.trim() ?? "";

  if (value === "") {
    return {
      url: undefined,
      warning: `${SITE_URL_ENV_NAME} is not set: canonical URL and social share image tags are omitted.`,
    };
  }

  const invalid = (reason: string): SiteUrlResolution => ({
    url: undefined,
    warning: `${SITE_URL_ENV_NAME}="${value}" is invalid (${reason}): canonical URL and social share image tags are omitted. Use a full URL such as https://example.com.`,
  });

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return invalid("not an absolute URL; include the https:// prefix");
  }

  const isLoopbackHttp =
    parsed.protocol === "http:" && LOOPBACK_HOSTS.has(parsed.hostname);
  if (parsed.protocol !== "https:" && !isLoopbackHttp) {
    return invalid(`protocol "${parsed.protocol}" is not allowed; use https://`);
  }

  if (parsed.username || parsed.password) {
    return invalid("credentials are not allowed in the site URL");
  }

  const pathname = parsed.pathname.replace(/\/+$/, "");
  const url = `${parsed.origin}${pathname}`;
  const warning =
    parsed.search || parsed.hash
      ? `${SITE_URL_ENV_NAME}: query string and fragment were ignored; using ${url}.`
      : undefined;

  return { url, warning };
}

/** Resolved once at build time (NEXT_PUBLIC_ variables are inlined by Next.js). */
export const SITE_URL_RESOLUTION = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

/**
 * Public site URL, used for absolute canonical / Open Graph / Twitter URLs.
 * Set NEXT_PUBLIC_SITE_URL at build time (e.g. https://your-domain.com).
 * Always a valid https (or loopback http) URL when defined.
 */
export const SITE_URL = SITE_URL_RESOLUTION.url;

/** Official product page, used for the "Buy" call to action. */
export const OFFICIAL_PRODUCT_URL =
  "https://boat-lifestyle.com/products/rockerz-440-wireless-bluetooth-headphone";
