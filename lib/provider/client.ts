const BASE_URL =
  process.env.PROVIDER_API_BASE!;

const API_KEY =
  process.env.PROVIDER_API_KEY!;

export async function providerFetch<T>(
  endpoint: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(
    `${BASE_URL}${endpoint}`,
    {
      ...init,

      headers: {
        "X-Client-API-Key":
          API_KEY,

        "Content-Type":
          "application/json",

        ...(init?.headers ?? {}),
      },

      cache: "no-store",
      signal:
        init?.signal ??
        AbortSignal.timeout(30000),
    },
  );

  if (!response.ok) {
    const contentType =
      response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }

    throw new Error(`Provider HTTP ${response.status}`);
  }

  return response.json();
}
