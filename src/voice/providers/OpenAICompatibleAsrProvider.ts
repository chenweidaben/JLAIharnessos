/**
 * 健澜科技 jlmedaios - OpenAI 兼容 ASR 提供者（真实 HTTP）
 *
 * 对接任何 OpenAI `/v1/audio/transcriptions` 兼容的语音识别服务
 * （OpenAI Whisper、自建 faster-whisper 服务、各类兼容网关）：
 *   1. 按 audioRef 读取音频（http(s) URL 拉取，或本地文件读取）；
 *   2. multipart/form-data 上传，response_format=verbose_json，取回分段；
 *   3. 归一化为 TranscriptionResult。
 *
 * 安全：API Key 仅从配置注入、用于 Authorization 头，不打印、不落库；
 *   网络 / 鉴权失败明确抛错，绝不返回假转写。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { readFile } from 'node:fs/promises';
import type { AsrProvider, TranscriptionRequest, TranscriptionResult } from '../types.js';

export interface OpenAICompatibleAsrConfig {
  /** 服务根地址，例如 https://api.openai.com/v1 或自建 http://host:9000/v1 */
  baseURL: string;
  apiKey: string;
  /** 识别模型，例如 whisper-1 / large-v3 */
  model: string;
  /** 拉取音频 / 调用接口的超时（毫秒） */
  timeoutMs?: number;
}

interface VerboseSegment {
  start?: number;
  end?: number;
  text?: string;
  avg_logprob?: number;
}
interface VerboseJsonResponse {
  text?: string;
  duration?: number;
  segments?: VerboseSegment[];
}

export class OpenAICompatibleAsrProvider implements AsrProvider {
  readonly name = 'openai';
  private readonly cfg: OpenAICompatibleAsrConfig;

  constructor(config: OpenAICompatibleAsrConfig) {
    this.cfg = { timeoutMs: 30_000, ...config };
  }

  /** 读取音频字节：支持 http(s) URL 与本地文件路径。 */
  private async readAudio(audioRef: string): Promise<{ bytes: Uint8Array; filename: string }> {
    if (/^https?:\/\//i.test(audioRef)) {
      const res = await fetch(audioRef);
      if (!res.ok) {
        throw new Error(`拉取音频失败 HTTP ${res.status}: ${audioRef}`);
      }
      const buf = new Uint8Array(await res.arrayBuffer());
      const filename = audioRef.split('?')[0].split('/').pop() || 'audio';
      return { bytes: buf, filename };
    }
    const bytes = await readFile(audioRef);
    return { bytes: new Uint8Array(bytes), filename: audioRef.split(/[\\/]/).pop() || 'audio' };
  }

  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResult> {
    const { bytes, filename } = await this.readAudio(request.audioRef);

    const form = new FormData();
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/octet-stream' });
    form.append('file', blob, filename);
    form.append('model', this.cfg.model);
    form.append('response_format', 'verbose_json');
    if (request.locale) form.append('language', request.locale === 'en-US' ? 'en' : 'zh');
    if (request.hotwords?.length) form.append('prompt', request.hotwords.join('，'));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.cfg.timeoutMs);
    let res: Response;
    try {
      res = await fetch(`${this.cfg.baseURL.replace(/\/$/, '')}/audio/transcriptions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.cfg.apiKey}` },
        body: form,
        signal: controller.signal,
      });
    } catch (err) {
      throw new Error(`调用 ASR 服务失败：${(err as Error).message}`);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`ASR 服务返回 HTTP ${res.status}${detail ? `：${detail.slice(0, 200)}` : ''}`);
    }

    const data = (await res.json()) as VerboseJsonResponse;
    const rawSegments = data.segments ?? [];
    const segments = rawSegments.map((s, idx) => {
      const startMs = Math.round((s.start ?? 0) * 1000);
      const endMs = Math.round((s.end ?? startMs) * 1000);
      // Whisper 不直接给置信度；avg_logprob 通常在 -0.1~-0.5，粗略折算，缺省按 1。
      const confidence =
        typeof s.avg_logprob === 'number' ? Math.min(1, Math.max(0.5, 1 + s.avg_logprob)) : 1;
      return { startMs, endMs, text: (s.text ?? '').trim(), confidence };
    });

    return {
      transcriptId: `openai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fullText: data.text ?? segments.map((s) => s.text).join(''),
      segments,
      language: request.locale ?? 'zh-CN',
      durationMs: Math.round((data.duration ?? 0) * 1000),
      provider: this.name,
      warnings: [],
    };
  }

  async healthCheck(): Promise<{ ok: boolean; detail?: string }> {
    try {
      const res = await fetch(`${this.cfg.baseURL.replace(/\/$/, '')}/models`, {
        headers: { Authorization: `Bearer ${this.cfg.apiKey}` },
      });
      if (res.ok) return { ok: true };
      return { ok: false, detail: `HTTP ${res.status}` };
    } catch (err) {
      return { ok: false, detail: (err as Error).message };
    }
  }
}
