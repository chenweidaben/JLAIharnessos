/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 统一 fetch 封装：baseURL / Authorization / 统一响应信封解析 / 错误处理 / 超时控制。
 *
 * 响应信封（与 BFF src/bff/types.ts 的 ApiResponse 对齐）：
 *   { code: number, message: string, data: T, timestamp, traceId? }
 *  - code === 0  → 成功，resolve(data)
 *  - code !== 0  → 抛 ApiError（携带 code/message/traceId）
 *  - HTTP 401    → 清 Token 并跳转登录页
 *
 * 注意：本模块只负责“真实请求”，绝不内置假数据。
 * 演示模式（isDemoMode）的 Mock fallback 由上层各领域 API 模块自行短路处理。
 */
import { API_BASE_URL, API_TIMEOUT_MS } from '@/config';
import { tokenStorage } from '@/utils/auth';
import { getCsrfToken } from '@/utils/cookie';

/** 统一响应信封 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  timestamp?: string;
  traceId?: string;
}

/** 业务错误码（与后端 ErrorCode 对齐） */
export const ApiErrorCode = {
  SUCCESS: 0,
  BAD_REQUEST: 40000,
  UNAUTHORIZED: 40100,
  TOKEN_EXPIRED: 40101,
  FORBIDDEN: 40300,
  NOT_FOUND: 40400,
  RATE_LIMITED: 42900,
  INTERNAL_ERROR: 50000,
} as const;

/** 业务/网络错误统一类型 */
export class ApiError extends Error {
  code: number;
  status?: number;
  traceId?: string;

  constructor(message: string, code: number, opts?: { status?: number; traceId?: string }) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = opts?.status;
    this.traceId = opts?.traceId;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  /** 超时（毫秒），默认 API_TIMEOUT_MS */
  timeoutMs?: number;
  /** 外部 AbortSignal（如组件卸载） */
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  if (!query) return url;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) qs.append(k, String(v));
  }
  const s = qs.toString();
  return s ? `${url}?${s}` : url;
}

function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  // 避免在登录页重复跳转
  if (!window.location.pathname.startsWith('/login')) {
    window.location.assign('/login');
  }
}

/**
 * 核心请求方法：resolve 解包后的 data；失败抛 ApiError。
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, timeoutMs = API_TIMEOUT_MS, signal } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // 外部 signal 联动
  const onExternalAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const token = tokenStorage.getAccessToken();
  const csrfToken = getCsrfToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  // 双重提交 Cookie：状态变更请求回传 X-CSRF-Token（GET 服务端不校验，注入无副作用）
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

  try {
    const res = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    // 尝试解析 JSON（即使非 2xx 也可能带信封错误信息）
    let payload: ApiResponse<T> | null = null;
    try {
      payload = (await res.json()) as ApiResponse<T>;
    } catch {
      payload = null;
    }

    // HTTP 401：未登录 / token 失效
    if (res.status === 401) {
      tokenStorage.clear();
      redirectToLogin();
      throw new ApiError(payload?.message || '未登录或登录已过期', ApiErrorCode.UNAUTHORIZED, {
        status: 401,
        traceId: payload?.traceId,
      });
    }

    // 信封缺失：视为网关错误
    if (!payload || typeof payload.code === 'undefined') {
      throw new ApiError(`服务响应异常（HTTP ${res.status}）`, res.status, { status: res.status });
    }

    if (payload.code === ApiErrorCode.SUCCESS) {
      return payload.data;
    }

    // 业务码层面的未认证
    if (payload.code === ApiErrorCode.UNAUTHORIZED || payload.code === ApiErrorCode.TOKEN_EXPIRED) {
      tokenStorage.clear();
      redirectToLogin();
    }

    throw new ApiError(payload.message || `请求失败（code=${payload.code}）`, payload.code, {
      status: res.status,
      traceId: payload.traceId,
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Abort / 网络错误
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('请求超时，请稍后重试', ApiErrorCode.INTERNAL_ERROR);
    }
    throw new ApiError('网络异常，请检查连接后重试', ApiErrorCode.INTERNAL_ERROR);
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onExternalAbort);
  }
}

export function get<T>(path: string, query?: RequestOptions['query'], signal?: AbortSignal) {
  return request<T>(path, { method: 'GET', query, signal });
}

export function post<T>(path: string, body?: unknown, signal?: AbortSignal) {
  return request<T>(path, { method: 'POST', body, signal });
}

export function put<T>(path: string, body?: unknown, signal?: AbortSignal) {
  return request<T>(path, { method: 'PUT', body, signal });
}

export function del<T>(path: string, signal?: AbortSignal) {
  return request<T>(path, { method: 'DELETE', signal });
}
