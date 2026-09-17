/**
 * 健澜科技数智医院智能体 - integration/protocols/fhir/FHIRClient.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - FHIR R4 客户端
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * 提供 FHIR R4 RESTful API 客户端，支持：
 * - 标准交互：read / vread / update / delete / history / search
 * - 认证：OAuth2 Client Credentials、SMART on FHIR 启动握手
 * - 分页处理（Bundle link=next）
 * - 统一错误处理
 *
 * HTTP 基于运行时内置 fetch（Bun/Node 18+），不引入新的外部依赖。
 *
 * @module integration/protocols/fhir/FHIRClient
 */

import { AdapterError, AdapterErrorCode, AdapterErrorType } from '../../adapters/AdapterError';
import type { FHIRBundle } from './FHIRParser';
import { FHIRResourceModel } from './FHIRResource';

/** FHIR 客户端配置 */
export interface FHIRClientConfig {
  /** FHIR Server Base URL，如 https://hapi.fhir.org/baseR4 */
  baseUrl: string;
  /** 认证类型 */
  auth?: {
    type: 'none' | 'bearer' | 'oauth2';
    /** bearer 类型的固定令牌 */
    token?: string;
    /** OAuth2 令牌端点 */
    tokenUrl?: string;
    clientId?: string;
    clientSecret?: string;
    scope?: string;
  };
  /** 默认请求头 */
  defaultHeaders?: Record<string, string>;
  /** 请求超时（毫秒） */
  timeout?: number;
  /** 遵循 Bundle next 链接时的最大分页页数（防止死循环） */
  maxPages?: number;
}

/** FHIR 搜索参数 */
export type FHIRSearchParams = Record<
  string,
  string | number | boolean | (string | number)[] | undefined
>;

/** FHIR 操作响应 */
export interface FHIROperationResult<T = FHIRResourceModel> {
  resource?: T;
  status: number;
  etag?: string;
  lastModified?: string;
}

/** FHIR 搜索响应 */
export interface FHIRSearchResult {
  bundle: FHIRBundle;
  resources: FHIRResourceModel[];
  total: number;
}

/** FHIR 错误 */
export class FHIRClientError extends Error {
  /** HTTP 状态码 */
  public readonly status: number;
  /** FHIR 操作 */
  public readonly operation?: string;
  /** 响应体 */
  public readonly body?: unknown;

  constructor(message: string, status: number, operation?: string, body?: unknown) {
    super(message);
    this.name = 'FHIRClientError';
    this.status = status;
    this.operation = operation;
    this.body = body;
    Object.setPrototypeOf(this, FHIRClientError.prototype);
  }
}

/**
 * FHIR R4 RESTful 客户端
 *
 * @example
 * ```typescript
 * const client = new FHIRClient({
 *   baseUrl: 'https://hapi.fhir.org/baseR4',
 *   auth: { type: 'none' },
 * });
 * const patient = await client.read('Patient', 'P001');
 * const results = await client.search('Patient', { 'family': '张' });
 * ```
 */
export class FHIRClient {
  private readonly config: Required<FHIRClientConfig>;
  private bearerToken?: string;
  private tokenExpiresAt = 0;

  constructor(config: FHIRClientConfig) {
    this.config = {
      baseUrl: config.baseUrl.replace(/\/+$/, ''),
      auth: config.auth ?? { type: 'none' },
      defaultHeaders: config.defaultHeaders ?? {},
      timeout: config.timeout ?? 30000,
      maxPages: config.maxPages ?? 20,
    };
  }

  // ============================================================
  // 认证
  // ============================================================

  /**
   * 确保已获取有效令牌（OAuth2）
   */
  private async ensureToken(): Promise<void> {
    const auth = this.config.auth;
    if (!auth) return;

    if (auth.type === 'bearer') {
      this.bearerToken = auth.token;
      return;
    }

    if (auth.type === 'oauth2') {
      // 令牌未过期则复用
      if (this.bearerToken && Date.now() < this.tokenExpiresAt) {
        return;
      }
      if (!auth.tokenUrl || !auth.clientId || !auth.clientSecret) {
        throw new AdapterError(
          AdapterErrorType.AUTHENTICATION,
          AdapterErrorCode.INVALID_CREDENTIALS,
          'FHIR OAuth2 配置不完整（缺少 tokenUrl/clientId/clientSecret）',
          { retryable: false },
        );
      }
      // OAuth2 Client Credentials
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: auth.clientId,
        client_secret: auth.clientSecret,
        ...(auth.scope ? { scope: auth.scope } : {}),
      });
      const resp = await fetch(auth.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      if (!resp.ok) {
        throw new AdapterError(
          AdapterErrorType.AUTHENTICATION,
          AdapterErrorCode.AUTHENTICATION_FAILED,
          `FHIR OAuth2 令牌获取失败（HTTP ${resp.status}）`,
          { retryable: true },
        );
      }
      const data = (await resp.json()) as { access_token: string; expires_in?: number };
      this.bearerToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000 - 60000;
    }
  }

  /**
   * SMART on FHIR 启动握手
   *
   * 基于 EHR 启动流程：用 iss（FHIR Server URL）和 launch 上下文完成令牌获取。
   *
   * @param iss - FHIR Server 发行方URL
   * @param launch - launch token
   * @param clientId - 客户端ID
   * @param clientSecret - 客户端密钥
   */
  async smartOnFhirLaunch(
    iss: string,
    launch: string,
    clientId: string,
    clientSecret: string,
  ): Promise<string> {
    // 1. 读取 SMART 配置：{iss}/.well-known/smart-configuration
    const smartConfigResp = await fetch(`${iss}/.well-known/smart-configuration`);
    if (!smartConfigResp.ok) {
      throw new FHIRClientError('SMART 配置读取失败', smartConfigResp.status, 'smart-launch');
    }
    const smartConfig = (await smartConfigResp.json()) as { token_endpoint: string };
    // 2. 请求令牌
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: launch,
      client_id: clientId,
      client_secret: clientSecret,
    });
    const resp = await fetch(smartConfig.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!resp.ok) {
      throw new FHIRClientError('SMART on FHIR 令牌获取失败', resp.status, 'smart-launch');
    }
    const data = (await resp.json()) as { access_token: string; expires_in?: number };
    this.bearerToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000 - 60000;
    return this.bearerToken;
  }

  // ============================================================
  // 标准交互
  // ============================================================

  /**
   * 读取资源（read）
   *
   * @param resourceType - 资源类型
   * @param id - 资源ID
   */
  async read(resourceType: string, id: string): Promise<FHIROperationResult> {
    return this.request<FHIRResourceModel>('GET', `${resourceType}/${id}`, undefined, (data) =>
      FHIRResourceModel.fromObject(data),
    );
  }

  /**
   * 读取指定版本资源（vread）
   *
   * @param resourceType - 资源类型
   * @param id - 资源ID
   * @param versionId - 版本ID
   */
  async vread(resourceType: string, id: string, versionId: string): Promise<FHIROperationResult> {
    return this.request<FHIRResourceModel>(
      'GET',
      `${resourceType}/${id}/_history/${versionId}`,
      undefined,
      (data) => FHIRResourceModel.fromObject(data),
    );
  }

  /**
   * 更新资源（update）
   *
   * @param resourceType - 资源类型
   * @param id - 资源ID
   * @param resource - 资源对象
   */
  async update(
    resourceType: string,
    id: string,
    resource: Record<string, unknown>,
  ): Promise<FHIROperationResult> {
    return this.request<FHIRResourceModel>('PUT', `${resourceType}/${id}`, resource, (data) =>
      FHIRResourceModel.fromObject(data),
    );
  }

  /**
   * 删除资源（delete）
   *
   * @param resourceType - 资源类型
   * @param id - 资源ID
   */
  async delete(resourceType: string, id: string): Promise<number> {
    const result = await this.request<void>('DELETE', `${resourceType}/${id}`);
    return result.status;
  }

  /**
   * 查询资源历史（history）
   *
   * @param resourceType - 资源类型
   * @param id - 资源ID
   */
  async history(resourceType: string, id: string): Promise<FHIRBundle> {
    const result = await this.request<FHIRBundle>('GET', `${resourceType}/${id}/_history`);
    return result.resource! ?? { resourceType: 'Bundle', type: 'history', entry: [] };
  }

  /**
   * 搜索资源（search），自动跟随 next 分页
   *
   * @param resourceType - 资源类型
   * @param params - 搜索参数
   */
  async search(resourceType: string, params: FHIRSearchParams = {}): Promise<FHIRSearchResult> {
    const query = this.buildQueryString(params);
    let url = `${resourceType}?${query}`;
    const all: FHIRResourceModel[] = [];
    let total = 0;
    let pages = 0;

    while (url && pages < this.config.maxPages) {
      const result = await this.request<FHIRBundle>('GET', url);
      const bundle = result.resource;
      if (!bundle) break;
      total = bundle.total ?? total;
      for (const entry of bundle.entry ?? []) {
        if (entry.resource) {
          all.push(FHIRResourceModel.fromObject(entry.resource));
        }
      }
      // 查找 next 链接
      const nextLink = (bundle.link ?? []).find(
        (l: { relation: string; url: string }) => l.relation === 'next',
      );
      url = nextLink ? this.resolveNextUrl(nextLink.url) : '';
      pages++;
    }

    return {
      bundle: {
        resourceType: 'Bundle',
        type: 'searchset',
        total: all.length,
        entry: all.map((r) => ({ resource: r.toJSON() })),
      },
      resources: all,
      total,
    };
  }

  // ============================================================
  // 内部请求
  // ============================================================

  /**
   * 构建查询字符串
   */
  private buildQueryString(params: FHIRSearchParams): string {
    const usp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        usp.set(key, value.join(','));
      } else {
        usp.set(key, String(value));
      }
    }
    return usp.toString();
  }

  /**
   * 解析 next 链接（支持绝对/相对）
   */
  private resolveNextUrl(rawUrl: string): string {
    if (rawUrl.startsWith('http')) {
      // 提取 baseUrl 之后的路径
      const idx = rawUrl.indexOf(this.config.baseUrl);
      if (idx >= 0) {
        return rawUrl.slice(idx + this.config.baseUrl.length + 1);
      }
    }
    return rawUrl.replace(/^\//, '');
  }

  /**
   * 执行 HTTP 请求
   *
   * @param method - HTTP 方法
   * @param path - 相对路径
   * @param body - 请求体
   * @param transform - 响应体转换
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    transform?: (data: unknown) => T,
  ): Promise<FHIROperationResult<T>> {
    await this.ensureToken();

    const headers: Record<string, string> = {
      Accept: 'application/fhir+json',
      ...this.config.defaultHeaders,
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/fhir+json';
    }
    if (this.bearerToken) {
      headers.Authorization = `Bearer ${this.bearerToken}`;
    }

    const url = path.startsWith('http') ? path : `${this.config.baseUrl}/${path}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeout);

    let resp: Response;
    try {
      resp = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      throw new AdapterError(
        AdapterErrorType.TIMEOUT,
        AdapterErrorCode.REQUEST_TIMEOUT,
        `FHIR 请求失败: ${error instanceof Error ? error.message : String(error)}`,
        { retryable: true },
      );
    } finally {
      clearTimeout(timer);
    }

    // 204 No Content（delete）
    if (resp.status === 204) {
      return { status: resp.status };
    }

    const text = await resp.text();
    const data = text ? (JSON.parse(text) as unknown) : undefined;

    if (!resp.ok) {
      const outcome = data as { issue?: { diagnostics?: string }[] } | undefined;
      const diagnostics =
        outcome?.issue?.[0]?.diagnostics ?? `FHIR 请求失败（HTTP ${resp.status}）`;
      throw new FHIRClientError(diagnostics, resp.status, `${method} ${path}`, data);
    }

    return {
      resource: transform && data ? transform(data) : (data as T),
      status: resp.status,
      etag: resp.headers.get('ETag') ?? undefined,
      lastModified: resp.headers.get('Last-Modified') ?? undefined,
    };
  }
}
