/**
 * 健澜科技数智医院智能体 - 屏幕/页面统一导出
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

export type { ChatScreenProps } from './ChatScreen';
export { ChatScreen } from './ChatScreen';
export type { DashboardScreenProps } from './DashboardScreen';
export { DashboardScreen, OTHER_ENTRIES, SCREEN_ENTRIES } from './DashboardScreen';
export type {
  BedRow,
  BedStatus,
  DepartmentManagementScreenProps,
  DeptOverview,
  Severity,
} from './DepartmentManagementScreen';
export {
  DepartmentManagementScreen,
  mockDeptBeds,
  mockDeptOverview,
} from './DepartmentManagementScreen';
export type { EmergencyPatient, EmergencyScreenProps, TriageLevel } from './EmergencyScreen';
export { EmergencyScreen, mockEmergencyPatient } from './EmergencyScreen';
export type { OutpatientScreenProps } from './OutpatientScreen';
export { OutpatientScreen } from './OutpatientScreen';
export type { QcTask, QcTaskStatus, QualityControlScreenProps } from './QualityControlScreen';
export { mockQcTasks, QualityControlScreen } from './QualityControlScreen';
export type { WardRoundScreenProps } from './WardRoundScreen';
export { WardRoundScreen } from './WardRoundScreen';
