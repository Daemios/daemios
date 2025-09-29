import type { Response } from 'express';

export type ApiSuccessResponse<TData = unknown> = {
  success: true;
  data: TData;
  message?: string;
  meta?: Record<string, unknown>;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: Record<string, unknown>;
};

export type ApiResponse<TData = unknown> = ApiSuccessResponse<TData> | ApiErrorResponse;

export const buildSuccess = <TData>(
  data: TData,
  message?: string,
  meta?: Record<string, unknown>,
): ApiSuccessResponse<TData> => {
  const response: ApiSuccessResponse<TData> = {
    success: true,
    data,
  };

  if (message) response.message = message;
  if (meta) response.meta = meta;

  return response;
};

export const buildError = (
  code: string,
  message?: string,
  details?: Record<string, unknown>,
  meta?: Record<string, unknown>,
): ApiErrorResponse => {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message: message ?? code,
    },
  };

  if (details && Object.keys(details).length > 0) response.error.details = details;
  if (meta) response.meta = meta;

  return response;
};

export const respondSuccess = <TData>(
  res: Response,
  status: number,
  data: TData,
  message?: string,
  meta?: Record<string, unknown>,
): Response<ApiSuccessResponse<TData>> => res.status(status).json(buildSuccess(data, message, meta));

export const respondError = (
  res: Response,
  status: number,
  code: string,
  message?: string,
  details?: Record<string, unknown>,
  meta?: Record<string, unknown>,
): Response<ApiErrorResponse> => res.status(status).json(buildError(code, message, details, meta));
