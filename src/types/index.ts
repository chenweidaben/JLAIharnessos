/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

// 医疗领域类型
export type {
  AllergyInfo,
  CurrentMedication,
  Encounter,
  EncounterStatus,
  EncounterSummary,
  // 患者
  Gender,
  ImagingResult,
  ImagingResultStatus,
  ImagingType,
  LabAbnormalFlag,
  LabResult,
  LabResultItem,
  // 检验检查
  LabResultStatus,
  MedicalMessage,
  MedicalRecord,
  MedicalRecordStatus,
  // 电子病历
  MedicalRecordType,
  MedicalSession,
  MedicalSessionStatus,
  // 会话与消息
  MedicalSessionType,
  MedicalTitle,
  MedicalUser,
  MessageRole,
  Order,
  OrderFrequency,
  OrderStatus,
  // 医嘱与处方
  OrderType,
  PastHistory,
  Patient,
  PatientDetail,
  PatientStatus,
  PatientSummary,
  Prescription,
  PrescriptionItem,
  PrescriptionRightLevel,
  PrescriptionStatus,
  ToolCallReference,
  ToolResultReference,
  // 用户与角色
  UserRole,
  // 就诊
  VisitType,
  VitalSigns,
} from './medical';

// 工具相关类型
export type {
  // 审计日志
  AuditLogEntry,
  AuditLogger,
  BuiltMedicalTool,
  ConfirmationCallbacks,
  // 风险确认
  ConfirmationTokenInfo,
  // 工具执行上下文
  MedicalConfig,
  MedicalPermissionResult,
  MedicalToolContext,
  // 工具定义
  MedicalToolDefinition,
  // 医疗校验与权限
  MedicalValidationResult,
  PermissionChecker,
  // 权限检查
  PermissionCheckResult,
  RiskConfirmationDecision,
  // 风险等级
  RiskLevel,
  // 工具调用与结果
  ToolCall,
  ToolExecutionError,
  ToolExecutionEvent,
  ToolExecutionResult,
  ToolResult,
} from './tools';
export { MedicalToolCategory } from './tools';

// Agent 相关类型
export type {
  AgentEvent,
  // Agent 事件
  AgentEventType,
  AgentRequest,
  AgentResponse,
  // 上下文信息
  CompactionLevel,
  ContextInfo,
  IntentClassification,
  // Agent 请求与响应
  RequestPriority,
  RoutingDecision,
  SessionState,
  // 会话状态
  SessionStatus,
  // 路由决策
  TargetAgentType,
  TokenBudget,
  TokenUsage,
} from './agent';
