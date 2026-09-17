/**
 * 健澜科技杠OS - Mock ASR 提供者
 *
 * 用于本地开发、离线演示与自动化测试：按 audioRef 返回预置转写夹具，
 * 不访问任何外部服务。商用语音识别（讯飞/阿里/腾讯/Azure）通过实现 AsrProvider 接入。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { randomUUID } from 'node:crypto';
import type { AsrProvider, TranscriptionRequest, TranscriptionResult } from '../types.js';

interface Fixture {
  fullText: string;
  segments?: { speakerId?: string; text: string; confidence?: number; durationMs?: number }[];
  durationMs?: number;
}

export class MockAsrProvider implements AsrProvider {
  readonly name = 'mock';
  private readonly fixtures = new Map<string, Fixture>();

  /** 注册音频夹具：audioRef → 转写内容 */
  registerFixture(audioRef: string, fixture: Fixture): this {
    this.fixtures.set(audioRef, fixture);
    return this;
  }

  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResult> {
    const fixture = this.fixtures.get(request.audioRef);
    if (!fixture) {
      // 无夹具时返回明确的占位（不臆造医疗内容）
      return {
        transcriptId: `mock-${randomUUID()}`,
        fullText: '',
        segments: [],
        language: request.locale ?? 'zh-CN',
        durationMs: 0,
        warnings: ['Mock ASR 未找到该音频的转写夹具，返回空文本'],
        provider: this.name,
      };
    }

    let cursor = 0;
    const segments = (fixture.segments ?? [{ text: fixture.fullText, confidence: 0.98 }]).map((s) => {
      const dur = s.durationMs ?? Math.max(800, s.text.length * 180);
      const seg = {
        speakerId: s.speakerId,
        startMs: cursor,
        endMs: cursor + dur,
        text: s.text,
        confidence: s.confidence ?? 0.96,
      };
      cursor += dur;
      return seg;
    });

    return {
      transcriptId: `mock-${randomUUID()}`,
      fullText: fixture.fullText || segments.map((s) => s.text).join(''),
      segments,
      language: request.locale ?? 'zh-CN',
      durationMs: fixture.durationMs ?? cursor,
      warnings: [],
      provider: this.name,
    };
  }

  async healthCheck(): Promise<{ ok: boolean; detail?: string }> {
    return { ok: true, detail: 'mock provider always healthy' };
  }
}
