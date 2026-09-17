/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 质控与管理工具统一导出
 */

export type { CoreSystemCheckInputType, CoreSystemCheckOutputType } from './coreSystemCheck.js';
export { coreSystemCheckTool } from './coreSystemCheck.js';
export type {
  MedicalRecordFrontPageCheckInputType,
  MedicalRecordFrontPageCheckOutputType,
} from './medicalRecordFrontPageCheck.js';
export { medicalRecordFrontPageCheckTool } from './medicalRecordFrontPageCheck.js';
export type {
  MedicalRecordQualityCheckInputType,
  MedicalRecordQualityCheckOutputType,
} from './medicalRecordQualityCheck.js';
export { medicalRecordQualityCheckTool } from './medicalRecordQualityCheck.js';
