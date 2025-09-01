// Lightweight fetch retry helpers for static assets and API calls

export async function fetchJsonWithRetry(
  url: string,
  init?: RequestInit,
  retries = 2,
  backoffMs = 300
): Promise<unknown> {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await fetch(url, init);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      return (await res.json()) as unknown;
    } catch (err) {
      if (attempt >= retries) {
        throw err;
      }
      // Exponential backoff
      const delay = backoffMs * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
      attempt += 1;
    }
  }
}
