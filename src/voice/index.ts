/**
 * 健澜科技杠OS - 语音电子病历模块公共出口
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

export type {
  TranscriptionRequest,
  TranscriptionResult,
  TranscriptSegment,
  AsrProvider,
  AsrProviderName,
  MedicalSpeechPostProcessResult,
} from './types.js';
export { MedicalSpeechPostProcessor } from './MedicalSpeechPostProcessor.js';
export type { PostProcessorOptions } from './MedicalSpeechPostProcessor.js';
export { MockAsrProvider } from './providers/MockAsrProvider.js';
export { AsrService } from './AsrService.js';
export type { VoiceToTextOutput } from './AsrService.js';
