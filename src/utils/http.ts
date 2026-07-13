export async function fetchJson<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 15_000,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": "alberdi/1.0",
        ...init.headers,
      },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status} ${response.statusText}: ${body.slice(0, 500)}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}
