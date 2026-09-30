export interface ApiErrorLike extends Error {
  status: number;
  code: string;
  details?: unknown;
}

export function isApiError(error: unknown): error is ApiErrorLike {
  return (
    error instanceof Error &&
    error.name === "ApiError" &&
    typeof (error as Partial<ApiErrorLike>).code === "string" &&
    typeof (error as Partial<ApiErrorLike>).status === "number"
  );
}
