/**
 * 健澜科技 jlmedaios - 第三方实名认证提供方（M3-J）
 *
 * 通过 HTTP 调用持证实名认证服务（腾讯云/阿里云/公安授权服务商等），
 * 接口契约以"统一实名网关"封装，便于多厂商切换：
 *  - 凭证（URL/API Key）一律由环境变量注入，禁止硬编码；
 *  - 未配置或连不上时明确报错，不冒充、不静默降级；
 *  - 超时、重试由调用方控制，失败结果可追溯。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type RealnameProvider, type RealnameRequest, type RealnameResult } from './types';

export interface ThirdPartyProviderConfig {
  /** 实名认证网关地址 */
  url: string;
  /** 网关 API Key（鉴权头） */
  apiKey: string;
  /** 请求超时（毫秒） */
  timeoutMs?: number;
  /** 提供方名称 */
  name?: string;
}

export class ThirdPartyRealnameProvider implements RealnameProvider {
  readonly name: string;
  readonly isDemo = false;
  private readonly url: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(config: ThirdPartyProviderConfig) {
    this.url = config.url;
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs ?? 10_000;
    this.name = config.name ?? 'third-party';
  }

  async verify(request: RealnameRequest): Promise<RealnameResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const resp = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          realName: request.realName,
          idCard: request.idCard,
          faceImageBase64: request.faceImageBase64,
          phone: request.phone,
        }),
        signal: controller.signal,
      });
      if (!resp.ok) {
        return {
          passed: false,
          provider: this.name,
          reason: `实名认证网关返回 ${resp.status}`,
          isDemo: false,
        };
      }
      const data = (await resp.json()) as {
        passed?: boolean;
        reason?: string;
        score?: number;
      };
      return {
        passed: data.passed === true,
        provider: this.name,
        reason: data.reason,
        score: data.score,
        isDemo: false,
      };
    } catch (err) {
      // 连不上/超时：明确抛出，由上层返回结构化错误，不冒充结果
      throw new Error(
        `实名认证网关调用失败（${this.name}）: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
