/**
 * 健澜科技杠OS - 语音转写服务（门面）
 *
 * 组合 ASR 提供者与医疗语音后处理器，输出可直接进入病历生成流程的规范化文本，
 * 并携带用药剂量核对、低置信片段等安全提示。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { MedicalSpeechPostProcessor } from './MedicalSpeechPostProcessor.js';
import type {
  AsrProvider,
  MedicalSpeechPostProcessResult,
  TranscriptionRequest,
  TranscriptionResult,
} from './types.js';

export interface VoiceToTextOutput {
  transcription: TranscriptionResult;
  postProcessed: MedicalSpeechPostProcessResult;
}

export class AsrService {
  private readonly provider: AsrProvider;
  private readonly postProcessor: MedicalSpeechPostProcessor;

  constructor(provider: AsrProvider, postProcessor?: MedicalSpeechPostProcessor) {
    this.provider = provider;
    this.postProcessor = postProcessor ?? new MedicalSpeechPostProcessor();
  }

  /** 语音转写 + 医疗后处理 */
  async transcribe(request: TranscriptionRequest): Promise<VoiceToTextOutput> {
    const transcription = await this.provider.transcribe(request);
    const postProcessed = this.postProcessor.process(transcription.segments);
    // 合并 ASR 与后处理的风险提示
    postProcessed.warnings = [...transcription.warnings, ...postProcessed.warnings];
    return { transcription, postProcessed };
  }

  /** 仅后处理（已有文本，如医生手动粘贴口述稿） */
  postProcess(text: string): MedicalSpeechPostProcessResult {
    return this.postProcessor.process(text);
  }
}
