/**
 * 健澜科技杠OS - 语音电子病历：ASR 类型定义
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/** 语音转写请求 */
export interface TranscriptionRequest {
  /** 音频引用（平台对象存储 key、URL 或本地路径），不直接承载音频二进制 */
  audioRef: string;
  audioFormat?: 'wav' | 'mp3' | 'm4a' | 'pcm' | 'ogg';
  locale?: 'zh-CN' | 'en-US';
  sampleRate?: number;
  /** 是否启用说话人分离（医患对话场景） */
  speakerDiarization?: boolean;
  /** 医疗热词（科室术语、药品名、医生姓名等），提升识别准确率 */
  hotwords?: string[];
  /** 业务上下文，辅助识别与安全校验 */
  context?: {
    patientId?: string;
    department?: string;
    doctorId?: string;
  };
}

/** 转写分段（带时间戳与说话人） */
export interface TranscriptSegment {
  speakerId?: string;
  startMs: number;
  endMs: number;
  text: string;
  /** 0~1，低于阈值的片段进入待确认 */
  confidence: number;
}

/** 语音转写结果 */
export interface TranscriptionResult {
  transcriptId: string;
  fullText: string;
  segments: TranscriptSegment[];
  language: string;
  durationMs: number;
  /** 低置信、疑似剂量数字等同声转写风险提示 */
  warnings: string[];
  provider: string;
}

/** ASR 供应商标识（平台内置 Mock，商用对接讯飞/阿里/腾讯等，密钥由部署方配置） */
export type AsrProviderName = 'mock' | 'xfyun' | 'aliyun' | 'tencent' | 'azure' | string;

/** ASR 提供者统一接口 */
export interface AsrProvider {
  readonly name: AsrProviderName;
  /** 整段转写 */
  transcribe(request: TranscriptionRequest): Promise<TranscriptionResult>;
  /** 健康检查（密钥、连通性） */
  healthCheck?(): Promise<{ ok: boolean; detail?: string }>;
}

/** 医疗语音后处理结果 */
export interface MedicalSpeechPostProcessResult {
  /** 规范化后的书面语文本 */
  text: string;
  /** 发生的术语/书面语纠正 */
  corrections: { from: string; to: string; reason: string }[];
  /** 识别到的用药/剂量提及（安全关键，需医生确认） */
  medicationMentions: { raw: string; normalized?: string; reason: string }[];
  /** 移除的口语填充词数量 */
  removedFillerCount: number;
  /** 需要医生重点核对的风险提示 */
  warnings: string[];
}
