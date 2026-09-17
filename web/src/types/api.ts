/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * API 统一响应类型定义
 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  /** 与后端对齐：ISO 8601 字符串 */
  timestamp?: string;
  traceId?: string;
}

export interface ApiPageData<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 统一错误码体系。
 * 与后端 src/bff/types.ts 的 ErrorCode 对齐：
 *  - 业务错误码为 5 位（40100/40300/40400/50000 等），承载在响应体 code 字段；
 *  - HTTP 状态码仍为标准 4xx/5xx，由 axios 错误拦截器处理。
 */
export enum ApiErrorCode {
  SUCCESS = 0,
  BAD_REQUEST = 40000,
  UNAUTHORIZED = 40100,
  TOKEN_EXPIRED = 40101,
  FORBIDDEN = 40300,
  NOT_FOUND = 40400,
  RATE_LIMITED = 42900,
  INTERNAL_ERROR = 50000,
  SERVICE_UNAVAILABLE = 50300,
}

export interface RequestOptions {
  silent?: boolean;
  signal?: AbortSignal;
  retry?: number;
  skipAuthRefresh?: boolean;
}
