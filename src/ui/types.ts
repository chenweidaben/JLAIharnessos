/**
 * 健澜科技数智医院智能体 - UI相关类型定义
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

// ============================================================================
// 患者相关类型
// ============================================================================

/** 患者性别 */
export type PatientGender = '男' | '女';

/** 患者就诊类型 */
export type PatientVisitType = '住院' | '门诊' | '急诊' | 'ICU' | '留观';

/** 患者状态 */
export type PatientStatus = 'stable' | 'monitoring' | 'critical' | 'discharged';

/** 患者基本信息 */
export interface PatientInfo {
  /** 患者唯一ID */
  patientId: string;
  /** 住院号/门诊号 */
  visitNo: string;
  /** 姓名 */
  name: string;
  /** 性别 */
  gender: PatientGender;
  /** 年龄 */
  age: number;
  /** 科室 */
  department: string;
  /** 床号 */
  bedNo: string;
  /** 诊断 */
  diagnosis: string;
  /** 过敏史 */
  allergies: string[];
  /** 就诊类型 */
  visitType: PatientVisitType;
  /** 患者状态 */
  status: PatientStatus;
  /** 主治医师 */
  attendingDoctor: string;
  /** 入院时间 */
  admissionTime: string;
}

// ============================================================================
// 生命体征类型
// ============================================================================

/** 生命体征趋势方向 */
export type VitalTrend = 'up' | 'down' | 'stable';

/** 生命体征异常等级 */
export type VitalAbnormalLevel = 'normal' | 'borderline' | 'abnormal' | 'critical';

/** 单项生命体征 */
export interface VitalSign {
  /** 指标名称 */
  name: string;
  /** 指标值 */
  value: number;
  /** 单位 */
  unit: string;
  /** 参考范围下限 */
  normalMin: number;
  /** 参考范围上限 */
  normalMax: number;
  /** 趋势 */
  trend: VitalTrend;
  /** 异常等级 */
  abnormalLevel: VitalAbnormalLevel;
  /** 测量时间 */
  measuredAt: string;
}

/** 生命体征集合 */
export interface VitalSigns {
  /** 体温 (℃) */
  temperature: VitalSign;
  /** 脉搏 (次/分) */
  pulse: VitalSign;
  /** 呼吸 (次/分) */
  respiration: VitalSign;
  /** 收缩压 (mmHg) */
  systolicBP: VitalSign;
  /** 舒张压 (mmHg) */
  diastolicBP: VitalSign;
  /** 血氧饱和度 (%) */
  spo2: VitalSign;
}

// ============================================================================
// 检验结果类型
// ============================================================================

/** 检验结果异常标记 */
export type LabAbnormalFlag = 'normal' | 'high' | 'low' | 'critical-high' | 'critical-low';

/** 检验类别 */
export type LabCategory =
  '血常规' | '生化' | '免疫' | '凝血' | '血气' | '尿常规' | '便常规' | '其他';

/** 单项检验结果 */
export interface LabResultItem {
  /** 项目代码 */
  code: string;
  /** 项目名称 */
  name: string;
  /** 结果值 */
  value: string;
  /** 单位 */
  unit: string;
  /** 参考范围 */
  referenceRange: string;
  /** 异常标记 */
  abnormalFlag: LabAbnormalFlag;
  /** 是否危急值 */
  isCritical: boolean;
  /** 检验类别 */
  category: LabCategory;
  /** 报告时间 */
  reportedAt: string;
  /** 检验仪器 */
  instrument?: string;
}

// ============================================================================
// 医嘱类型
// ============================================================================

/** 医嘱类型 */
export type OrderType = '长期医嘱' | '临时医嘱';

/** 医嘱状态 */
export type OrderStatus = 'pending' | 'executing' | 'completed' | 'discontinued';

/** 医嘱优先级 */
export type OrderPriority = '常规' | '紧急' | '立即';

/** 医嘱条目 */
export interface OrderItem {
  /** 医嘱ID */
  orderId: string;
  /** 医嘱内容 */
  content: string;
  /** 医嘱类型 */
  type: OrderType;
  /** 医嘱状态 */
  status: OrderStatus;
  /** 优先级 */
  priority: OrderPriority;
  /** 开嘱时间 */
  orderedAt: string;
  /** 开嘱医生 */
  orderedBy: string;
  /** 执行时间 */
  executedAt?: string;
  /** 停止时间 */
  discontinuedAt?: string;
  /** 频次 */
  frequency?: string;
  /** 剂量 */
  dosage?: string;
}

// ============================================================================
// 警报类型
// ============================================================================

/** 警报级别 */
export type AlertLevel = 'danger' | 'warning' | 'info';

/** 警报类型 */
export type AlertType =
  'critical-value' | 'drug-interaction' | 'allergy' | 'duplicate-order' | 'dose-warning' | 'system';

/** 警报条目 */
export interface AlertItem {
  /** 警报ID */
  alertId: string;
  /** 警报级别 */
  level: AlertLevel;
  /** 警报类型 */
  type: AlertType;
  /** 警报标题 */
  title: string;
  /** 警报内容 */
  content: string;
  /** 建议操作 */
  suggestion?: string;
  /** 发生时间 */
  createdAt: string;
  /** 是否已确认 */
  acknowledged: boolean;
  /** 是否需要确认 */
  requiresAcknowledgment: boolean;
}

// ============================================================================
// 病历类型
// ============================================================================

/** 病历类型 */
export type MedicalRecordType =
  | '入院记录'
  | '首次病程'
  | '日常病程'
  | '上级医师查房'
  | '会诊记录'
  | '手术记录'
  | '出院记录'
  | '死亡记录'
  | '知情同意书';

/** 病历质控状态 */
export type RecordQcStatus = 'draft' | 'submitted' | 'qc-passed' | 'qc-failed' | 'signed';

/** 病历条目 */
export interface MedicalRecord {
  /** 病历ID */
  recordId: string;
  /** 病历类型 */
  type: MedicalRecordType;
  /** 标题 */
  title: string;
  /** 内容 */
  content: string;
  /** 作者 */
  author: string;
  /** 创建时间 */
  createdAt: string;
  /** 最后修改时间 */
  updatedAt: string;
  /** 质控状态 */
  qcStatus: RecordQcStatus;
  /** 质控意见 */
  qcComment?: string;
  /** 签名状态 */
  isSigned: boolean;
  /** 签名医生 */
  signedBy?: string;
  /** 签名时间 */
  signedAt?: string;
}

// ============================================================================
// 用户/会话类型
// ============================================================================

/** 用户角色 */
export type UserRole = 'doctor' | 'nurse' | 'pharmacist' | 'admin' | 'medical-student';

/** 当前用户信息 */
export interface CurrentUser {
  /** 用户ID */
  userId: string;
  /** 姓名 */
  name: string;
  /** 角色 */
  role: UserRole;
  /** 职称 */
  title: string;
  /** 科室 */
  department: string;
}

/** 会话状态 */
export type SessionState =
  'idle' | 'thinking' | 'tool-executing' | 'waiting-confirmation' | 'error';

// ============================================================================
// 输入模式类型
// ============================================================================

/** 医疗输入模式 */
export type MedicalInputMode = 'consultation' | 'order' | 'ward-round' | 'consultation-md';

/** 输入模式元信息 */
export interface InputModeInfo {
  /** 模式标识 */
  mode: MedicalInputMode;
  /** 显示名称 */
  label: string;
  /** 前缀字符 */
  prefix: string;
  /** 描述 */
  description: string;
  /** 占位符 */
  placeholder: string;
}

// ============================================================================
// 命令类型
// ============================================================================

/** 医疗命令类型 */
export type MedicalCommandType = 'local' | 'prompt' | 'local-jsx';

/** 医疗命令定义 */
export interface MedicalCommand {
  /** 命令名（不含斜杠） */
  name: string;
  /** 描述 */
  description: string;
  /** 别名 */
  aliases?: string[];
  /** 命令类型 */
  type: MedicalCommandType;
  /** 分类 */
  category: string;
  /** 是否隐藏 */
  isHidden?: boolean;
  /** 参数说明 */
  usage?: string;
}

// ============================================================================
// 键位绑定类型
// ============================================================================

/** 键位修饰键 */
export interface KeyModifiers {
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
}

/** 键位绑定定义 */
export interface Keybinding {
  /** 键位字符串，如 "ctrl+k" */
  key: string;
  /** 动作名称 */
  action: string;
  /** 描述 */
  description: string;
  /** 上下文 */
  context: string;
  /** 修饰键 */
  modifiers?: KeyModifiers;
}

// ============================================================================
// 屏幕/页面类型
// ============================================================================

/** 屏幕类型 */
export type ScreenType = 'dashboard' | 'outpatient' | 'ward-round' | 'consultation';

/** 屏幕元信息 */
export interface ScreenInfo {
  /** 屏幕标识 */
  type: ScreenType;
  /** 显示名称 */
  label: string;
  /** 描述 */
  description: string;
  /** 图标（终端字符） */
  icon: string;
}
