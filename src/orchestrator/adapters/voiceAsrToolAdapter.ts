/**
 * 健澜科技杠OS - 语音 ASR 工具适配器与组合工具调用器
 *
 * - VoiceAsrToolInvoker：把 src/voice 的 AsrService 适配为编排层工具 `transcribe_voice`；
 * - CompositeToolInvoker：按顺序组合多个 IToolInvoker（医疗工具 + 语音工具 + 未来扩展），
 *   使工具节点可透明调用不同领域的能力，而引擎只依赖统一的 IToolInvoker。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import type { ToolResult } from '../../medical-tools/types.js';
import { AsrService } from '../../voice/index.js';
import type { IToolInvoker, ToolInvokeInput } from '../engine/runtime.js';

/** 编排层内置语音工具名 */
export const TRANSCRIBE_VOICE_TOOL = 'transcribe_voice';

/** 将 AsrService 适配为编排层工具 */
export class VoiceAsrToolInvoker implements IToolInvoker {
  constructor(private readonly asr: AsrService) {}

  has(toolName: string): boolean {
    return toolName === TRANSCRIBE_VOICE_TOOL;
  }

  isReadOnly(): boolean {
    return true;
  }

  riskLevel(): 'low' | 'medium' | 'high' | undefined {
    return 'low';
  }

  async invoke(input: ToolInvokeInput): Promise<ToolResult<unknown>> {
    if (input.toolName !== TRANSCRIBE_VOICE_TOOL) {
      return { success: false, error: { code: 'TOOL_NOT_FOUND', message: `语音适配器不支持工具: ${input.toolName}` } };
    }
    const p = input.input as {
      audioRef: string;
      audioFormat?: 'wav' | 'mp3' | 'm4a' | 'pcm' | 'ogg';
      hotwords?: string[];
      speakerDiarization?: boolean;
      context?: { patientId?: string; department?: string; doctorId?: string };
    };
    if (!p?.audioRef) {
      return { success: false, error: { code: 'INVALID_INPUT', message: 'transcribe_voice 需要 audioRef' } };
    }
    try {
      const { transcription, postProcessed } = await this.asr.transcribe({
        audioRef: p.audioRef,
        audioFormat: p.audioFormat,
        hotwords: p.hotwords,
        speakerDiarization: p.speakerDiarization,
        context: p.context,
        locale: 'zh-CN',
      });
      return {
        success: true,
        data: {
          transcriptId: transcription.transcriptId,
          rawText: transcription.fullText,
          text: postProcessed.text,
          segments: transcription.segments,
          corrections: postProcessed.corrections,
          medicationMentions: postProcessed.medicationMentions,
          warnings: postProcessed.warnings,
          durationMs: transcription.durationMs,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: { code: 'ASR_FAILED', message: `语音转写失败: ${(err as Error).message}` },
      };
    }
  }
}

/** 组合多个工具调用器：按注册顺序查找第一个 has() 命中的调用器 */
export class CompositeToolInvoker implements IToolInvoker {
  private readonly invokers: IToolInvoker[];

  constructor(invokers: IToolInvoker[]) {
    this.invokers = invokers.filter(Boolean);
  }

  private find(toolName: string): IToolInvoker | undefined {
    return this.invokers.find((inv) => inv.has(toolName));
  }

  has(toolName: string): boolean {
    return this.find(toolName) !== undefined;
  }

  async invoke(input: ToolInvokeInput): Promise<ToolResult<unknown>> {
    const target = this.find(input.toolName);
    if (!target) {
      return { success: false, error: { code: 'TOOL_NOT_FOUND', message: `未注册的工具: ${input.toolName}` } };
    }
    return target.invoke(input);
  }

  isReadOnly(toolName: string): boolean {
    return this.find(toolName)?.isReadOnly(toolName) ?? false;
  }

  riskLevel(toolName: string): 'low' | 'medium' | 'high' | undefined {
    return this.find(toolName)?.riskLevel(toolName);
  }
}
