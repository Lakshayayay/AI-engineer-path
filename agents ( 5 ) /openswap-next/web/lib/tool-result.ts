// Every tool answers in this one shape, and the message tells the model what to try next.
export interface ToolResult<T = unknown> {
  status: "ok" | "no_results" | "error";
  retryable: boolean;
  message: string;
  result?: T;
}

export function okResult<T>(result: T, message: string): ToolResult<T> {
  return { status: "ok", retryable: false, message, result };
}

export function noResults(message: string): ToolResult<never> {
  return { status: "no_results", retryable: false, message };
}

export function failure(message: string, retryable = false): ToolResult<never> {
  return { status: "error", retryable, message };
}
