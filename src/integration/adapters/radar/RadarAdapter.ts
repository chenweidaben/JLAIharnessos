/**
 * 健澜科技数智医院智能体 - RADAR 推理服务适配器
 *
 * 封装对 Python DAMO-RADAR 推理服务的调用（默认 RADAR_INFERENCE_URL=http://localhost:8090），
 * 内部鉴权头 X-Internal-Token: $RADAR_INTERNAL_TOKEN。
 *
 * 复用现有适配器框架：指数退避重试 / 滑动窗口熔断 / 超时 / 统计。
 * 服务不可用（连接拒绝、超时、熔断打开、非 2xx）时，自动降级为
 * RadarMockAdapter 的确定性结果，保证前端闭环。
 *
 * 契约：docs/RADAR_FUSION_CONTRACT.md §3
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AdapterMetadata } from '../../types';
import { createDefaultAdapterConfig } from '../AdapterConfig';
import { AdapterError } from '../AdapterError';
import { BaseAdapter } from '../BaseAdapter';
import {
  buildCatalog,
  buildFindings,
  type RadarCatalog,
  type RadarResult,
} from './radarData';

/** POST /api/v1/radar/jobs 请求体（契约 §3.4） */
export interface RadarJobSubmitRequest {
  study_uid?: string;
  source?: 'pacs' | 'upload' | 'demo';
  file_ref?: string;
}

/** POST /api/v1/radar/jobs 响应（契约 §3.4） */
export interface RadarJobSubmitResponse {
  job_id: string;
  status: 'queued' | 'completed';
  mode: 'demo' | 'production';
}

/** GET /api/v1/radar/jobs/{id} 响应（契约 §3.5） */
export interface RadarJobState {
  job_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  mode: 'demo' | 'production';
  study_uid: string;
  error: { code: string; message: string } | null;
  result: RadarResult | null;
}

function resolveBaseUrl(): string {
  return (process.env.RADAR_INFERENCE_URL ?? 'http://localhost:8090').replace(/\/+$/, '');
}

/**
 * RADAR 推理服务适配器
 *
 * - getCatalog()：透传上游目录；不可用降级内置目录。
 * - submitJob()：透传上游提交；不可用则在 BFF 本地生成同步完成的 demo 任务。
 * - getJob()：透传上游任务状态；不可用降级为该 study_uid 的确定性 demo 结果。
 */
export class RadarAdapter extends BaseAdapter {
  private readonly baseUrl: string;
  private readonly internalToken: string | undefined;

  constructor() {
    const base = resolveBaseUrl();
    super(
      createDefaultAdapterConfig({
        id: 'radar-inference',
        type: 'generic',
        vendor: 'damo-radar',
        version: 'eaec6129',
        name: 'DAMO-RADAR 推理服务适配器',
        endpoint: base,
        // 推理调用可能较慢，但 BFF 侧重试要轻量；熔断保护防止雪崩
        timeout: Number(process.env.RADAR_HTTP_TIMEOUT_MS ?? 8000),
        auth: { type: 'none' },
        retry: { maxRetries: 2, initialDelayMs: 200, maxDelayMs: 2000, backoffFactor: 2, jitter: true },
        circuitBreaker: {
          enabled: true,
          windowSize: 10,
          failureThreshold: 50,
          minimumRequests: 3,
          openDurationMs: 15000,
          halfOpenRequests: 1,
        },
      }),
    );
    this.baseUrl = base;
    this.internalToken = process.env.RADAR_INTERNAL_TOKEN;
  }

  getMetadata(): AdapterMetadata {
    return {
      id: this.config.id,
      type: 'generic',
      vendor: 'damo-radar',
      version: 'eaec6129',
      name: 'DAMO-RADAR 推理服务适配器',
      description: '调用 Python DAMO-RADAR 推理服务，不可用时降级确定性 demo 结果',
      supportedProtocols: ['http'],
    };
  }

  /** 惰性确保已初始化（execute 要求 ready/connected） */
  private async ensureInitialized(): Promise<void> {
    if (this.status === 'uninitialized') {
      await this.init();
    }
  }

  /** 带内部鉴权头的 HTTP 调用（失败抛 AdapterError，供 execute 重试/熔断） */
  private async http<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      accept: 'application/json',
    };
    // 契约 §3：内部鉴权头；未配置时也允许本地直连（开发态）
    if (this.internalToken) {
      headers['x-internal-token'] = this.internalToken;
    }
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
    });
    if (!res.ok) {
      throw AdapterError.connection(`RADAR 上游返回 ${res.status} for ${path}`, undefined, {
        httpStatus: res.status,
      });
    }
    return (await res.json()) as T;
  }

  /**
   * 静态目录：优先透传上游；不可用降级内置目录（保证前端不白屏）。
   * 返回 { catalog, degraded } 供上层标记「演示数据」水印。
   */
  async getCatalog(): Promise<{ catalog: RadarCatalog; degraded: boolean }> {
    try {
      await this.ensureInitialized();
      const catalog = await this.execute(async () =>
        this.http<RadarCatalog>('/api/v1/radar/catalog'),
      );
      return { catalog, degraded: false };
    } catch (e) {
      this.logger.warn('RADAR 推理服务不可用，降级内置 catalog', {
        error: e instanceof Error ? e.message : String(e),
      });
      return { catalog: buildCatalog(), degraded: true };
    }
  }

  /**
   * 提交推理任务：优先透传上游；不可用则本地同步生成 demo 结果。
   * 返回 { job, degraded }。
   */
  async submitJob(
    req: RadarJobSubmitRequest,
  ): Promise<{ job: RadarJobSubmitResponse; degraded: boolean; localResult: RadarResult | null }> {
    const studyUid = req.study_uid ?? `STUDY_DEMO_${Date.now()}`;
    try {
      await this.ensureInitialized();
      const job = await this.execute(async () =>
        this.http<RadarJobSubmitResponse>('/api/v1/radar/jobs', {
          method: 'POST',
          body: JSON.stringify({
            study_uid: studyUid,
            source: req.source ?? 'demo',
            file_ref: req.file_ref,
          }),
        }),
      );
      return { job, degraded: false, localResult: null };
    } catch (e) {
      this.logger.warn('RADAR 推理服务不可用，本地降级 demo 任务', {
        error: e instanceof Error ? e.message : String(e),
      });
      // 本地同步完成的确定性 demo 结果
      const localResult = buildFindings(studyUid, 'demo');
      return {
        degraded: true,
        localResult,
        job: { job_id: `job_demo_${Date.now()}`, status: 'completed', mode: 'demo' },
      };
    }
  }

  /**
   * 查询任务状态：优先透传上游；不可用降级为该 study_uid 的确定性 demo 结果。
   */
  async getJob(jobId: string, studyUid: string): Promise<{ state: RadarJobState; degraded: boolean }> {
    try {
      await this.ensureInitialized();
      const state = await this.execute(async () =>
        this.http<RadarJobState>(`/api/v1/radar/jobs/${encodeURIComponent(jobId)}`),
      );
      return { state, degraded: false };
    } catch (e) {
      this.logger.warn('RADAR 推理服务不可用，降级本地 demo 结果', {
        jobId,
        error: e instanceof Error ? e.message : String(e),
      });
      return {
        degraded: true,
        state: {
          job_id: jobId,
          status: 'completed',
          progress: 1,
          mode: 'demo',
          study_uid: studyUid,
          error: null,
          result: buildFindings(studyUid, 'demo'),
        },
      };
    }
  }
}
