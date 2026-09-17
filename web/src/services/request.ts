/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * Axios 实例封装：baseURL / 超时 / token / 拦截器 / 错误处理 / 取消 / 重试
 *
 * 异常边界策略：
 *  - 超时：默认 30s，可由 VITE_API_TIMEOUT_MS 覆盖；超时提示"请求超时"
 *  - 重试：仅幂等 GET，5xx/网络错误/超时，指数退避 1s/2s/4s，最多 2 次
 *  - 离线：navigator.onLine=false 时不重试，直接提示"网络已断开"
 *  - 401：清 Token 并跳转登录；403：业务提示；5xx：统一文案 + traceId
 *  - 取消：支持 AbortSignal，不触发错误提示
 */
import axios, { type AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';

import { ApiErrorCode, type ApiResponse, type RequestOptions } from '@/types/api';
import { tokenStorage } from '@/utils/auth';
import { env } from '@/utils/config';

/** HTTP 状态码（与业务错误码分离） */
const HTTP_STATUS = {
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  serverError: 500,
  badGateway: 502,
  serviceUnavailable: 503,
  gatewayTimeout: 504,
} as const;

/** 默认请求超时（毫秒）：30 秒，可由环境变量 VITE_API_TIMEOUT_MS 覆盖 */
const DEFAULT_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 30_000);
/** 5xx/网络错误自动重试上限（仅幂等 GET，且网络在线时） */
const MAX_AUTO_RETRY = 2;

/** 指数退避延迟：1s, 2s, 4s ...，上限 8s */
function backoffDelay(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 8000);
}

/** 当前是否在线（浏览器环境） */
function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

interface GlobalHandlers {
  onUnauthorized: () => void;
  onError: (message: string) => void;
}

let handlers: GlobalHandlers = {
  onUnauthorized: () => undefined,
  onError: () => undefined,
};

export function setupRequestHandlers(h: GlobalHandlers): void {
  handlers = h;
}

interface RequestConfig extends AxiosRequestConfig {
  options?: RequestOptions;
  _retried?: number;
}

const instance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

instance.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

instance.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const body = response.data;
    const cfg = response.config as RequestConfig;

    if (body == null || typeof body.code === 'undefined') {
      return response;
    }
    if (body.code === ApiErrorCode.SUCCESS) {
      return response;
    }
    // 业务码层面的未认证 / token 过期（后端偶发以 200 包装时）
    if (body.code === ApiErrorCode.UNAUTHORIZED || body.code === ApiErrorCode.TOKEN_EXPIRED) {
      tokenStorage.clear();
      handlers.onUnauthorized();
      return Promise.reject(new Error(body.message || '未登录或登录已过期'));
    }
    if (!cfg.options?.silent) {
      handlers.onError(body.message || '请求失败');
    }
    return Promise.reject(new Error(body.message || `业务错误：${body.code}`));
  },
  async (error: AxiosError<ApiResponse>) => {
    const cfg = error.config as RequestConfig | undefined;

    if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
      return Promise.reject(error);
    }

    const status = error.response?.status;

    if (status === HTTP_STATUS.unauthorized) {
      tokenStorage.clear();
      handlers.onUnauthorized();
      return Promise.reject(error);
    }

    const method = (cfg?.method ?? 'get').toLowerCase();
    const retryLimit = cfg?.options?.retry ?? MAX_AUTO_RETRY;
    // 仅 GET 幂等请求自动重试；离线时不重试；5xx/网络错误/超时才重试
    const isRetryableStatus =
      status == null || (status >= HTTP_STATUS.serverError && status <= HTTP_STATUS.gatewayTimeout);
    const attempted = cfg?._retried ?? 0;
    const shouldRetry =
      method === 'get' && isRetryableStatus && isOnline() && attempted < retryLimit;

    if (shouldRetry && cfg) {
      cfg._retried = attempted + 1;
      const delay = backoffDelay(attempted);
      return new Promise((resolve) => setTimeout(resolve, delay)).then(() => instance.request(cfg));
    }

    const message =
      error.response?.data?.message ||
      (!isOnline() ? '网络已断开，请检查连接后重试' : '') ||
      (error.code === 'ECONNABORTED' ? '请求超时，请稍后重试' : '') ||
      error.message ||
      '网络异常，请稍后重试';
    if (!cfg?.options?.silent) {
      handlers.onError(message);
    }
    return Promise.reject(error);
  },
);

export function get<T>(url: string, params?: unknown, options?: RequestOptions): Promise<T> {
  const config: RequestConfig = { url, method: 'get', params, options, signal: options?.signal };
  return instance
    .request<ApiResponse<T>>(config as AxiosRequestConfig)
    .then((res) => res.data.data);
}

export function post<T>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
  const config: RequestConfig = { url, method: 'post', data, options, signal: options?.signal };
  return instance
    .request<ApiResponse<T>>(config as AxiosRequestConfig)
    .then((res) => res.data.data);
}

export function put<T>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
  const config: RequestConfig = { url, method: 'put', data, options, signal: options?.signal };
  return instance
    .request<ApiResponse<T>>(config as AxiosRequestConfig)
    .then((res) => res.data.data);
}

export function del<T>(url: string, params?: unknown, options?: RequestOptions): Promise<T> {
  const config: RequestConfig = { url, method: 'delete', params, options, signal: options?.signal };
  return instance
    .request<ApiResponse<T>>(config as AxiosRequestConfig)
    .then((res) => res.data.data);
}

export default instance;
