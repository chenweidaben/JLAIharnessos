/**
 * 健澜科技数智医院智能体 - 临床警报模块统一导出
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

export type { AlertSystemProps } from './AlertSystem';
export { AlertSystem, MOCK_CLINICAL_ALERTS } from './AlertSystem';
export type {
  AlertPatient,
  AllergyData,
  ClinicalAlert,
  ClinicalAlertKind,
  ClinicalAlertLevel,
  CriticalValueData,
  DrugInteractionData,
  NotifyRecord,
} from './alertTypes';
export { ALERT_LEVEL_PRIORITY, beep, sortAlertsByPriority } from './alertTypes';
export type { AllergyAlertProps } from './AllergyAlert';
export { AllergyAlert } from './AllergyAlert';
export type { CriticalValueAlertProps } from './CriticalValueAlert';
export { CriticalValueAlert } from './CriticalValueAlert';
export type { DrugInteractionAlertProps } from './DrugInteractionAlert';
export { DrugInteractionAlert } from './DrugInteractionAlert';
