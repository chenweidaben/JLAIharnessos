/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 子代理（Buddy）系统统一导出。
 */

export { BuddyContext, type PatientBrief } from './BuddyContext';
export { BuddyManager, defaultTimeoutFor } from './BuddyManager';
export { InMemoryPatientCache, MedicalBuddy, type SharedPatientCache } from './MedicalBuddy';
export {
  ALL_SPECIALTIES,
  emergencyConfig,
  icuConfig,
  internalMedicineConfig,
  medicalTechnologyConfig,
  obstetricsGynecologyConfig,
  operatingRoomConfig,
  pediatricsConfig,
  SPECIALTY_CONFIGS,
  surgeryConfig,
} from './specialties';
export type {
  BuddyResult,
  BuddySnapshot,
  BuddyStatus,
  BuddyTask,
  LLMClient,
  LLMRequest,
  LLMResponse,
  MemoryScope,
  PermissionMode,
  SpecialtyConfig,
} from './types';
