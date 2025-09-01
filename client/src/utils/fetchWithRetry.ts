// Lightweight fetch with retry, exponential backoff, and timeout support
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3,
  backoffMs = 400,
  timeoutMs = 15000
): Promise<Response> {
  let attempt = 0;
  // Use a bounded loop with explicit breaks to satisfy linters
  for (;;) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...options,
        // Avoid cached 404s during rollout
        cache: options.cache ?? "no-cache",
        signal: controller.signal,
      });
      clearTimeout(id);

      if (res.ok) return res;

      // Retry on typical transient statuses
      if ([408, 425, 429, 500, 502, 503, 504].includes(res.status)) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, backoffMs * 2 ** attempt));
          attempt += 1;
          continue;
        }
      }

      return res; // non-retriable or retries exhausted
    } catch (err) {
      clearTimeout(id);
      // Network/timeout errors: retry
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffMs * 2 ** attempt));
        attempt += 1;
        continue;
      }
      throw err;
    }
  }
}
