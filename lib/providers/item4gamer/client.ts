import "server-only";

const DEFAULT_BASE_URL = "https://item4gamer.com/wp-json/reseller/v1";

type ApiEnvelope<T extends Record<string, unknown>> = {
  data?: ({ status?: number; message?: string } & T) | null;
  message?: string;
};

export class Item4GamerApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload: unknown,
  ) {
    super(message);
    this.name = "Item4GamerApiError";
  }
}

function getConfig() {
  const apiKey = process.env.ITEM4GAMER_API_KEY?.trim();
  if (!apiKey) throw new Error("ITEM4GAMER_API_KEY is missing");

  const configured = process.env.ITEM4GAMER_API_BASE_URL?.trim() || DEFAULT_BASE_URL;
  const marker = "/wp-json/reseller/v1";
  const markerIndex = configured.indexOf(marker);
  const baseUrl = (markerIndex >= 0
    ? configured.slice(0, markerIndex + marker.length)
    : configured
  ).replace(/\/+$/, "");

  return { apiKey, baseUrl };
}

export async function item4gamerRequest<T extends Record<string, unknown>>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { apiKey, baseUrl } = getConfig();
  const response = await fetch(`${baseUrl}/${path.replace(/^\/+/, "")}`, {
    ...init,
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(20_000),
    headers: {
      Accept: "application/json",
      "User-Agent": "DevPlayStudio/1.0 (+https://devplaystudio.com)",
      "api-key": apiKey,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  const text = await response.text();
  let payload: ApiEnvelope<T> | null;
  try {
    payload = text ? (JSON.parse(text) as ApiEnvelope<T>) : null;
  } catch {
    const contentType = response.headers.get("content-type") ?? "unknown";
    const preview = text
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 240);
    throw new Item4GamerApiError(
      `Item4Gamer returned non-JSON (HTTP ${response.status}, ${contentType})${preview ? `: ${preview}` : ""}`,
      response.status,
      { status: response.status, contentType, preview },
    );
  }

  const data = payload?.data;
  const apiStatus = Number(data?.status ?? response.status);
  if (!response.ok || !data || apiStatus < 200 || apiStatus >= 300) {
    throw new Item4GamerApiError(
      data?.message || payload?.message || `Item4Gamer request failed (${apiStatus})`,
      apiStatus,
      payload,
    );
  }

  return data as T;
}
