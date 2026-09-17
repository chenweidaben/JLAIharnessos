/**
 * 健澜科技数智医院智能体 - UI组件统一导出
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

// 医疗场景组件
export type { AlertBannerProps } from './AlertBanner';
export { AlertBanner, mockAlerts } from './AlertBanner';
export type {
  ConfirmationActionType,
  ConfirmationDialogProps,
  ConfirmationRiskLevel,
} from './ConfirmationDialog';
export { ConfirmationDialog } from './ConfirmationDialog';
export type { LabResultPanelProps } from './LabResultPanel';
export { LabResultPanel, mockLabResults } from './LabResultPanel';
export type { MedicalRecordViewerProps } from './MedicalRecordViewer';
export { MedicalRecordViewer, mockMedicalRecord } from './MedicalRecordViewer';
export type { OrderListPanelProps } from './OrderListPanel';
export { mockOrders, OrderListPanel } from './OrderListPanel';
export type {
  MedicalDocEntry,
  Patient360Data,
  Patient360ViewProps,
  VisitHistoryEntry,
} from './Patient360View';
export { mockPatient360, Patient360View } from './Patient360View';
export type { PatientInfoBarProps } from './PatientInfoBar';
export { mockPatient, PatientInfoBar } from './PatientInfoBar';
export type { StatusLineProps } from './StatusLine';
export { mockCurrentUser, StatusLine } from './StatusLine';
export type { VitalSignsPanelProps } from './VitalSignsPanel';
export { mockVitalSigns, VitalSignsPanel } from './VitalSignsPanel';

// 通用组件
export * from './common';

// 布局组件
export * from './layout';

// 输入组件
export type { CommandPaletteProps } from './input/CommandPalette';
export { BUILTIN_COMMANDS, CommandPalette } from './input/CommandPalette';
export type { MedicalPromptInputProps } from './input/MedicalPromptInput';
export { INPUT_MODES, MedicalPromptInput } from './input/MedicalPromptInput';

// 医疗确认对话框（增强版）
export type {
  CdsCheckResult,
  MedicalConfirmationDialogProps,
  MedicalConfirmRisk,
} from './MedicalConfirmationDialog';
export { MedicalConfirmationDialog } from './MedicalConfirmationDialog';

// 对话模块
export * from './chat';

// 临床警报模块
export * from './alerts';
