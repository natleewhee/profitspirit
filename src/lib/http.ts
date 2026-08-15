// Shared fetch-and-parse helper so error handling (network failure, non-OK
// response, malformed JSON) is written once instead of copy-pasted at every
// call site — see docs/dashboard-ux-review.md C3.
export class ApiError extends Error {}

export async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    throw new ApiError("Network error — check your connection and try again.");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.error ?? `Request failed (${res.status}).`);
  }

  return res.json();
}
