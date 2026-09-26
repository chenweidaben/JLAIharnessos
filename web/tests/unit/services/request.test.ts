/**
 * 健澜科技 jlmedaios - Axios 请求封装测试
 * Copyright (c) 2026 健澜科技有限公司. All Rights Reserved.
 *
 * 通过自定义 axios adapter 驱动 request.ts：
 * 成功解包 / 业务码错误提示 / 401 与业务未授权处理 / 取消 / GET 5xx 自动重试 /
 * 离线与非 GET 不重试 / 超时提示 / token 与 CSRF 注入。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';

import http, { get, post, put, patch, del, setupRequestHandlers } from '@/services/request';
import { ApiErrorCode } from '@/types/api';
import { tokenStorage } from '@/utils/auth';

type AdapterResult = unknown;

function setAdapter(handler: (config: AxiosRequestConfig) => AdapterResult) {
  http.defaults.adapter = ((config: AxiosRequestConfig) => {
    const r = handler(config);
    if (r && typeof r === 'object' && '__reject' in (r as Record<string, unknown>)) {
      return Promise.reject((r as { error: unknown }).error);
    }
    const body = r && typeof r === 'object' && 'body' in (r as Record<string, unknown>)
      ? (r as { body: unknown }).body
      : r;
    const response: AxiosResponse = {
      data: body,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    } as AxiosResponse;
    return Promise.resolve(response);
  }) as never;
}

function reject(config: AxiosRequestConfig, opts: {
  status?: number; data?: unknown; code?: string; message?: string;
}) {
  const e = new Error(opts.message ?? 'fail') as Error & {
    config: AxiosRequestConfig; isAxiosError: boolean; code?: string;
    response?: { status: number; data: unknown; statusText: string; headers: Record<string, never>; config: AxiosRequestConfig };
  };
  e.config = config;
  e.isAxiosError = true;
  e.code = opts.code;
  if (opts.status) {
    e.response = {
      status: opts.status, data: opts.data ?? {}, statusText: '', headers: {}, config,
    };
  }
  return { __reject: true, error: e };
}

beforeEach(() => {
  tokenStorage.clear();
  setupRequestHandlers({ onUnauthorized: () => undefined, onError: () => undefined });
});

describe('成功路径解包', () => {
  it('get/post/put/patch/del 均解包 ApiResponse.data', async () => {
    setAdapter((cfg) => {
      expect(cfg.method).toBeDefined();
      return { code: ApiErrorCode.SUCCESS, data: { m: cfg.method } };
    });
    await expect(get('/x')).resolves.toEqual({ m: 'get' });
    await expect(post('/x', { a: 1 })).resolves.toEqual({ m: 'post' });
    await expect(put('/x', {})).resolves.toEqual({ m: 'put' });
    await expect(patch('/x', {})).resolves.toEqual({ m: 'patch' });
    await expect(del('/x')).resolves.toEqual({ m: 'delete' });
  });

  it('请求拦截器注入 Authorization 与 X-CSRF-Token', async () => {
    tokenStorage.set({ accessToken: 'ATK', refreshToken: 'RTK', expiresIn: 3600 });
    let seen: AxiosRequestConfig | null = null;
    setAdapter((cfg) => {
      seen = cfg;
      return { code: 0, data: 1 };
    });
    await get('/x');
    const headers = seen!.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer ATK');
  });

  it('响应体无业务 code 时原样返回', async () => {
    setAdapter(() => ({ raw: true }));
    const r = await http.request({ url: '/raw', method: 'get' });
    expect(r.data).toEqual({ raw: true });
  });
});

describe('业务码错误', () => {
  it('非成功业务码拒绝并调用 onError', async () => {
    const onError = vi.fn();
    setupRequestHandlers({ onUnauthorized: vi.fn(), onError });
    setAdapter(() => ({ code: ApiErrorCode.BAD_REQUEST, message: '参数错误', data: null }));
    await expect(get('/x')).rejects.toThrow('参数错误');
    expect(onError).toHaveBeenCalledWith('参数错误');
  });

  it('业务未授权/token 过期：清 token 并回调 onUnauthorized', async () => {
    tokenStorage.set({ accessToken: 'ATK', refreshToken: 'RTK', expiresIn: 3600 });
    const onUnauthorized = vi.fn();
    setupRequestHandlers({ onUnauthorized, onError: vi.fn() });
    setAdapter(() => ({ code: ApiErrorCode.UNAUTHORIZED, message: '未登录', data: null }));
    await expect(get('/x')).rejects.toThrow();
    expect(onUnauthorized).toHaveBeenCalled();
    expect(tokenStorage.getAccessToken()).toBe('');
  });

  it('silent 选项抑制业务错误提示', async () => {
    const onError = vi.fn();
    setupRequestHandlers({ onUnauthorized: vi.fn(), onError });
    setAdapter(() => ({ code: ApiErrorCode.BAD_REQUEST, message: 'err', data: null }));
    await expect(get('/x', undefined, { silent: true })).rejects.toThrow();
    expect(onError).not.toHaveBeenCalled();
  });
});

describe('网络层错误', () => {
  it('取消的请求直接拒绝、不触发提示', async () => {
    const onError = vi.fn();
    setupRequestHandlers({ onUnauthorized: vi.fn(), onError });
    setAdapter((cfg) => reject(cfg, { code: 'ERR_CANCELED', message: 'canceled' }));
    await expect(get('/x')).rejects.toThrow('canceled');
    expect(onError).not.toHaveBeenCalled();
  });

  it('401：清 token 并回调 onUnauthorized', async () => {
    tokenStorage.set({ accessToken: 'ATK', refreshToken: 'RTK', expiresIn: 3600 });
    const onUnauthorized = vi.fn();
    setupRequestHandlers({ onUnauthorized, onError: vi.fn() });
    setAdapter((cfg) => reject(cfg, { status: 401 }));
    await expect(get('/x')).rejects.toThrow();
    expect(onUnauthorized).toHaveBeenCalled();
    expect(tokenStorage.getAccessToken()).toBe('');
  });

  it('GET 500 自动重试后成功（退避后重放）', async () => {
    let calls = 0;
    setAdapter((cfg) => {
      calls += 1;
      if (calls < 2) return reject(cfg, { status: 500, data: { message: '服务器错误' } });
      return { code: 0, data: { ok: 1 } };
    });
    const r = await get<{ ok: number }>('/x');
    expect(calls).toBe(2);
    expect(r).toEqual({ ok: 1 });
  }, 20000);

  it('离线时 GET 不重试，提示网络断开', async () => {
    const onError = vi.fn();
    setupRequestHandlers({ onUnauthorized: vi.fn(), onError });
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    let calls = 0;
    setAdapter((cfg) => {
      calls += 1;
      return reject(cfg, { code: 'ERR_NETWORK' });
    });
    await expect(get('/x')).rejects.toThrow();
    expect(calls).toBe(1);
    expect(onError.mock.calls[0][0]).toMatch(/网络/);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });

  it('非 GET 请求 500 不重试', async () => {
    let calls = 0;
    setAdapter((cfg) => {
      calls += 1;
      return reject(cfg, { status: 500 });
    });
    await expect(post('/x', {})).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it('ECONNABORTED 提示请求超时', async () => {
    const onError = vi.fn();
    setupRequestHandlers({ onUnauthorized: vi.fn(), onError });
    setAdapter((cfg) => reject(cfg, { code: 'ECONNABORTED', message: 'timeout of 30000ms' }));
    await expect(get('/x', undefined, { retry: 0 })).rejects.toThrow();
    expect(onError.mock.calls[0][0]).toMatch(/超时/);
  });
});