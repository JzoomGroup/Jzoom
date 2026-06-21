export const REQUEST_ID_HEADER = "X-Request-Id";

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  fieldErrors: ApiFieldError[];
  requestId: string;
  timestamp: string;
  path: string;
}

export interface RequestContext {
  requestId: string;
}
