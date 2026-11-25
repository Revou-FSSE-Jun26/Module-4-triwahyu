export type ErrorDetails = Record<string, string[]>;

/** Thrown by apiClient for every non-2xx response and for network failures (statusCode 0). */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
    public readonly details?: ErrorDetails,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const isApiError = (error: unknown): error is ApiError =>
  error instanceof ApiError;
