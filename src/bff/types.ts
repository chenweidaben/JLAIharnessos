/**
 * 健澜科技数智医院智能体 - BFF 统一响应与错误码
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 统一响应信封（与前端 types/api/common 对齐） */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
  traceId?: string;
}

/** 业务错误码 */
export enum ErrorCode {
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

export function ok<T>(data: T, message = 'ok', traceId?: string): ApiResponse<T> {
  return { code: ErrorCode.SUCCESS, message, data, timestamp: new Date().toISOString(), traceId };
}

export function fail<T = null>(code: number, message: string, traceId?: string): ApiResponse<T> {
  return { code, message, data: null as T, timestamp: new Date().toISOString(), traceId };
}

export function json<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/** 请求上下文 */
export interface Ctx {
  req: Request;
  params: Record<string, string>;
  query: URLSearchParams;
  /** 解析后的 JSON body（按需调用） */
  body: <T = unknown>() => Promise<T>;
  /** 认证后注入的用户（未登录为 null） */
  user: { id: string; name: string; roles: string[] } | null;
  traceId: string;
}

export type Handler = (c: Ctx) => Response | Promise<Response>;

/** 路由定义 */
export interface RouteDef {
  method: string;
  path: string;
  handle: Handler;
  /** 是否需要登录 */
  auth?: boolean;
}

export function newTraceId(): string {
  return `trc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
