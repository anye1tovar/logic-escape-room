type RetryOptions = {
  retries?: number;
  retryDelayMs?: number;
  backoffFactor?: number;
  timeoutMs?: number;
  retryOnStatuses?: number[];
};

const defaultRetryOnStatuses = [408, 429, 500, 502, 503, 504];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function createRetrySignal(
  externalSignal: AbortSignal | undefined,
  timeoutMs: number
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener(
        "abort",
        () => controller.abort(),
        { once: true }
      );
    }
  }

  return { controller, timeoutId };
}

export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  const {
    retries = 3,
    retryDelayMs = 800,
    backoffFactor = 1.7,
    timeoutMs = 12000,
    retryOnStatuses = defaultRetryOnStatuses,
  } = options;

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    const { controller, timeoutId } = createRetrySignal(
      init?.signal ?? undefined,
      timeoutMs
    );
    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      if (
        !res.ok &&
        retryOnStatuses.includes(res.status) &&
        attempt < retries
      ) {
        const delay = Math.round(
          retryDelayMs * Math.pow(backoffFactor, attempt)
        );
        await sleep(delay);
        attempt += 1;
        continue;
      }

      return res;
    } catch (err) {
      if (
        init?.signal?.aborted &&
        (err as { name?: string }).name === "AbortError"
      ) {
        throw err;
      }
      lastError = err;
      if (attempt >= retries) break;
      const delay = Math.round(retryDelayMs * Math.pow(backoffFactor, attempt));
      await sleep(delay);
      attempt += 1;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError ?? new Error("Request failed");
}

export async function fetchJsonWithRetry<T>(
  url: string,
  init?: RequestInit,
  options: RetryOptions = {}
): Promise<T> {
  const res = await fetchWithRetry(url, init, options);
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}
