/**
 * 健澜科技 jlmedaios - 语音电子病历类型（M2-C）
 * 与 BFF src/bff/routes/voiceMedical.ts 契约对齐。
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

export type VoiceDictationStatus = 'draft' | 'converted' | 'discarded';
export type AudioFormat = 'wav' | 'mp3' | 'm4a' | 'pcm' | 'ogg';
export type VoiceRecordType =
  | 'outpatient'
  | 'admission'
  | 'progress'
  | 'operative'
  | 'discharge'
  | 'front_page';

/** 口语→书面术语纠正。 */
export interface CorrectionDto {
  from: string;
  to: string;
  reason: string;
}

/** 用药 / 剂量 / 频次提及（安全关键，须医师核对）。 */
export interface MedicationMentionDto {
  raw: string;
  normalized?: string;
  reason: string;
}

/** 转写分段。 */
export interface SegmentDto {
  speakerId?: string;
  startMs: number;
  endMs: number;
  text: string;
  confidence: number;
}

/** 语音口述会话。 */
export interface VoiceDictationDto {
  id: string;
  visitId: string;
  patientId: string;
  doctorId: string;
  audioRef: string;
  audioFormat: AudioFormat | null;
  durationMs: number | null;
  asrProvider: string;
  rawTranscript: string;
  normalizedText: string;
  segments: SegmentDto[];
  corrections: CorrectionDto[];
  medicationMentions: MedicationMentionDto[];
  warnings: string[];
  avgConfidence: number | null;
  status: VoiceDictationStatus;
  resultingRecordId: string | null;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDictationPayload {
  visitId: string;
  audioRef: string;
  audioFormat?: AudioFormat;
}

export interface ConvertDictationPayload {
  finalText: string;
  recordType?: VoiceRecordType;
  title?: string;
  confirmMedications?: boolean;
}
