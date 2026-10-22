// One friendly error shape for every failure the browser can see.
export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

export function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

// API routes answer 401 themselves; the proxy only redirects pages.
export function unauthorized(): Response {
  return jsonError(401, "Please sign in to continue.");
}

// Log the detail on the server and show the user only the generic message.
export function serverError(error: unknown): Response {
  console.error(error);
  return jsonError(500, GENERIC_ERROR_MESSAGE);
}
