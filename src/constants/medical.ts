/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import type { RiskLevel } from '@/types/tools';

// ============================================================
// 科室列表
// ============================================================

/** 临床科室定义 */
export interface DepartmentInfo {
  /** 科室编码 */
  code: string;
  /** 科室名称 */
  name: string;
  /** 科室类别 */
  category: 'clinical' | 'medical_technology' | 'administrative' | 'other';
  /** 是否为手术科室 */
  isSurgical: boolean;
  /** 描述 */
  description?: string;
}

/** 全院科室列表 */
export const DEPARTMENTS: readonly DepartmentInfo[] = [
  // 内科系统
  { code: 'cardiology', name: '心血管内科', category: 'clinical', isSurgical: false },
  { code: 'neurology', name: '神经内科', category: 'clinical', isSurgical: false },
  { code: 'respiratory', name: '呼吸与危重症医学科', category: 'clinical', isSurgical: false },
  { code: 'gastroenterology', name: '消化内科', category: 'clinical', isSurgical: false },
  { code: 'nephrology', name: '肾内科', category: 'clinical', isSurgical: false },
  { code: 'endocrinology', name: '内分泌科', category: 'clinical', isSurgical: false },
  { code: 'hematology', name: '血液内科', category: 'clinical', isSurgical: false },
  { code: 'rheumatology', name: '风湿免疫科', category: 'clinical', isSurgical: false },
  { code: 'infectious', name: '感染性疾病科', category: 'clinical', isSurgical: false },
  { code: 'oncology', name: '肿瘤内科', category: 'clinical', isSurgical: false },
  { code: 'geriatrics', name: '老年医学科', category: 'clinical', isSurgical: false },
  // 外科系统
  { code: 'general_surgery', name: '普通外科', category: 'clinical', isSurgical: true },
  { code: 'orthopedics', name: '骨科', category: 'clinical', isSurgical: true },
  { code: 'neurosurgery', name: '神经外科', category: 'clinical', isSurgical: true },
  { code: 'thoracic_surgery', name: '胸外科', category: 'clinical', isSurgical: true },
  { code: 'cardiac_surgery', name: '心脏大血管外科', category: 'clinical', isSurgical: true },
  { code: 'urology', name: '泌尿外科', category: 'clinical', isSurgical: true },
  { code: 'burns', name: '烧伤整形科', category: 'clinical', isSurgical: true },
  // 妇儿
  { code: 'obstetrics_gynecology', name: '妇产科', category: 'clinical', isSurgical: true },
  { code: 'pediatrics', name: '儿科', category: 'clinical', isSurgical: false },
  { code: 'neonatology', name: '新生儿科', category: 'clinical', isSurgical: false },
  // 其他临床
  { code: 'emergency', name: '急诊科', category: 'clinical', isSurgical: false },
  { code: 'icu', name: '重症医学科', category: 'clinical', isSurgical: false },
  { code: 'dermatology', name: '皮肤科', category: 'clinical', isSurgical: false },
  { code: 'ophthalmology', name: '眼科', category: 'clinical', isSurgical: true },
  { code: 'ent', name: '耳鼻咽喉头颈外科', category: 'clinical', isSurgical: true },
  { code: 'stomatology', name: '口腔科', category: 'clinical', isSurgical: true },
  { code: 'tcm', name: '中医科', category: 'clinical', isSurgical: false },
  { code: 'rehabilitation', name: '康复医学科', category: 'clinical', isSurgical: false },
  { code: 'anesthesiology', name: '麻醉科', category: 'clinical', isSurgical: false },
  // 医技科室
  { code: 'laboratory', name: '检验科', category: 'medical_technology', isSurgical: false },
  { code: 'radiology', name: '放射科', category: 'medical_technology', isSurgical: false },
  { code: 'ultrasound', name: '超声医学科', category: 'medical_technology', isSurgical: false },
  { code: 'nuclear_medicine', name: '核医学科', category: 'medical_technology', isSurgical: false },
  { code: 'pathology', name: '病理科', category: 'medical_technology', isSurgical: false },
  { code: 'pharmacy', name: '药学部', category: 'medical_technology', isSurgical: false },
  { code: 'nutrition', name: '临床营养科', category: 'medical_technology', isSurgical: false },
  // 行政科室
  { code: 'medical_affairs', name: '医务部', category: 'administrative', isSurgical: false },
  { code: 'nursing_department', name: '护理部', category: 'administrative', isSurgical: false },
  { code: 'quality_control', name: '质控办', category: 'administrative', isSurgical: false },
  { code: 'information', name: '信息科', category: 'administrative', isSurgical: false },
] as const;

/** 科室名称到编码的映射 */
export const DEPARTMENT_NAME_TO_CODE: ReadonlyMap<string, string> = new Map(
  DEPARTMENTS.map((d) => [d.name, d.code]),
);

/** 科室编码到信息的映射 */
export const DEPARTMENT_CODE_TO_INFO: ReadonlyMap<string, DepartmentInfo> = new Map(
  DEPARTMENTS.map((d) => [d.code, d]),
);

// ============================================================
// 就诊类型
// ============================================================

/** 就诊类型定义 */
export interface VisitTypeInfo {
  /** 类型编码 */
  code: string;
  /** 类型名称 */
  name: string;
  /** 描述 */
  description: string;
  /** 典型时长（分钟） */
  typicalDurationMinutes: number;
}

/** 就诊类型枚举 */
export const VISIT_TYPES: readonly VisitTypeInfo[] = [
  { code: 'outpatient', name: '门诊', description: '门诊医生接诊', typicalDurationMinutes: 15 },
  { code: 'inpatient', name: '住院', description: '住院患者诊疗', typicalDurationMinutes: 30 },
  { code: 'emergency', name: '急诊', description: '急诊急救', typicalDurationMinutes: 10 },
  { code: 'followup', name: '随访', description: '出院后随访', typicalDurationMinutes: 10 },
  { code: 'consultation', name: '会诊', description: '多科室会诊', typicalDurationMinutes: 45 },
  { code: 'physical_exam', name: '体检', description: '健康体检', typicalDurationMinutes: 30 },
] as const;

// ============================================================
// 医嘱类型
// ============================================================

/** 医嘱类型定义 */
export interface OrderTypeInfo {
  /** 类型编码 */
  code: string;
  /** 类型名称 */
  name: string;
  /** 默认风险等级 */
  defaultRiskLevel: RiskLevel;
  /** 是否需要药师审核 */
  requiresPharmacistReview: boolean;
}

/** 医嘱类型枚举 */
export const ORDER_TYPES: readonly OrderTypeInfo[] = [
  {
    code: 'medication',
    name: '药物医嘱',
    defaultRiskLevel: 'high',
    requiresPharmacistReview: true,
  },
  {
    code: 'lab_test',
    name: '检验医嘱',
    defaultRiskLevel: 'medium',
    requiresPharmacistReview: false,
  },
  {
    code: 'imaging',
    name: '影像检查医嘱',
    defaultRiskLevel: 'medium',
    requiresPharmacistReview: false,
  },
  {
    code: 'treatment',
    name: '治疗医嘱',
    defaultRiskLevel: 'medium',
    requiresPharmacistReview: false,
  },
  {
    code: 'procedure',
    name: '操作医嘱',
    defaultRiskLevel: 'medium',
    requiresPharmacistReview: false,
  },
  { code: 'surgery', name: '手术医嘱', defaultRiskLevel: 'high', requiresPharmacistReview: false },
  { code: 'nursing', name: '护理医嘱', defaultRiskLevel: 'low', requiresPharmacistReview: false },
  { code: 'diet', name: '饮食医嘱', defaultRiskLevel: 'low', requiresPharmacistReview: false },
  {
    code: 'consultation',
    name: '会诊医嘱',
    defaultRiskLevel: 'low',
    requiresPharmacistReview: false,
  },
  { code: 'other', name: '其他医嘱', defaultRiskLevel: 'medium', requiresPharmacistReview: false },
] as const;

// ============================================================
// 检验检查类型
// ============================================================

/** 检验类别定义 */
export interface LabCategoryInfo {
  /** 类别编码 */
  code: string;
  /** 类别名称 */
  name: string;
  /** 常见项目数 */
  typicalTestCount: number;
  /** 报告时效（小时） */
  reportTurnaroundHours: number;
}

/** 检验类别枚举 */
export const LAB_CATEGORIES: readonly LabCategoryInfo[] = [
  { code: 'clinical_chemistry', name: '临床生化', typicalTestCount: 30, reportTurnaroundHours: 2 },
  { code: 'hematology', name: '血液学', typicalTestCount: 20, reportTurnaroundHours: 1 },
  { code: 'immunology', name: '免疫学', typicalTestCount: 25, reportTurnaroundHours: 4 },
  { code: 'microbiology', name: '微生物学', typicalTestCount: 15, reportTurnaroundHours: 48 },
  { code: 'molecular', name: '分子诊断', typicalTestCount: 10, reportTurnaroundHours: 24 },
  { code: 'urinalysis', name: '尿液分析', typicalTestCount: 12, reportTurnaroundHours: 1 },
  { code: 'coagulation', name: '凝血功能', typicalTestCount: 8, reportTurnaroundHours: 1 },
  { code: 'blood_gas', name: '血气分析', typicalTestCount: 6, reportTurnaroundHours: 0.5 },
  { code: 'toxicology', name: '毒理学', typicalTestCount: 10, reportTurnaroundHours: 4 },
  { code: 'other', name: '其他检验', typicalTestCount: 5, reportTurnaroundHours: 24 },
] as const;

/** 影像检查类型定义 */
export interface ImagingTypeInfo {
  /** 类型编码 */
  code: string;
  /** 类型名称 */
  name: string;
  /** 是否有辐射 */
  hasRadiation: boolean;
  /** 是否需要造影剂 */
  mayNeedContrast: boolean;
  /** 报告时效（小时） */
  reportTurnaroundHours: number;
}

/** 影像检查类型枚举 */
export const IMAGING_TYPES: readonly ImagingTypeInfo[] = [
  {
    code: 'xray',
    name: 'X线',
    hasRadiation: true,
    mayNeedContrast: false,
    reportTurnaroundHours: 1,
  },
  { code: 'ct', name: 'CT', hasRadiation: true, mayNeedContrast: true, reportTurnaroundHours: 2 },
  {
    code: 'mri',
    name: 'MRI',
    hasRadiation: false,
    mayNeedContrast: true,
    reportTurnaroundHours: 4,
  },
  {
    code: 'ultrasound',
    name: '超声',
    hasRadiation: false,
    mayNeedContrast: false,
    reportTurnaroundHours: 1,
  },
  {
    code: 'nuclear',
    name: '核医学',
    hasRadiation: true,
    mayNeedContrast: true,
    reportTurnaroundHours: 24,
  },
  {
    code: 'interventional',
    name: '介入放射',
    hasRadiation: true,
    mayNeedContrast: true,
    reportTurnaroundHours: 4,
  },
  {
    code: 'mammography',
    name: '乳腺钼靶',
    hasRadiation: true,
    mayNeedContrast: false,
    reportTurnaroundHours: 2,
  },
  {
    code: 'fluoroscopy',
    name: '透视',
    hasRadiation: true,
    mayNeedContrast: true,
    reportTurnaroundHours: 1,
  },
  {
    code: 'other',
    name: '其他影像',
    hasRadiation: false,
    mayNeedContrast: false,
    reportTurnaroundHours: 24,
  },
] as const;

// ============================================================
// 风险等级定义
// ============================================================

/** 风险等级配置 */
export interface RiskLevelConfig {
  /** 风险等级 */
  level: RiskLevel;
  /** 等级名称 */
  name: string;
  /** 描述 */
  description: string;
  /** 是否需要用户确认 */
  requiresUserConfirm: boolean;
  /** 是否需要双重确认 */
  requiresDoubleConfirm: boolean;
  /** 是否需要CA签名 */
  requiresCASign: boolean;
  /** 确认超时时间（毫秒） */
  confirmationTimeoutMs: number;
  /** 审计日志保留天数 */
  auditRetentionDays: number;
}

/** 风险等级配置表 */
export const RISK_LEVEL_CONFIGS: readonly RiskLevelConfig[] = [
  {
    level: 'low',
    name: '低风险',
    description: '只读查询，不修改任何数据，不影响患者安全',
    requiresUserConfirm: false,
    requiresDoubleConfirm: false,
    requiresCASign: false,
    confirmationTimeoutMs: 0,
    auditRetentionDays: 180,
  },
  {
    level: 'medium',
    name: '中风险',
    description: '数据修改/创建，可能影响病历完整性，但不直接影响患者安全',
    requiresUserConfirm: true,
    requiresDoubleConfirm: false,
    requiresCASign: false,
    confirmationTimeoutMs: 300000,
    auditRetentionDays: 365,
  },
  {
    level: 'high',
    name: '高风险',
    description: '涉及医嘱/处方/用药安全，直接影响患者诊疗',
    requiresUserConfirm: true,
    requiresDoubleConfirm: true,
    requiresCASign: true,
    confirmationTimeoutMs: 600000,
    auditRetentionDays: 2555,
  },
] as const;

/** 风险等级到配置的映射 */
export const RISK_LEVEL_TO_CONFIG: ReadonlyMap<RiskLevel, RiskLevelConfig> = new Map(
  RISK_LEVEL_CONFIGS.map((c) => [c.level, c]),
);

// ============================================================
// Token 预算配置
// ============================================================

/** Token 预算分配配置 */
export interface TokenBudgetAllocation {
  /** 分配项名称 */
  name: string;
  /** 占比（0-1） */
  percentage: number;
  /** 描述 */
  description: string;
}

/** 默认 Token 预算分配（医疗上下文构建策略） */
export const DEFAULT_TOKEN_BUDGET_ALLOCATION: readonly TokenBudgetAllocation[] = [
  { name: 'system_prompt', percentage: 0.1, description: '系统提示词（医疗伦理+角色设定）' },
  { name: 'patient_summary', percentage: 0.15, description: '患者摘要（基本信息+过敏史+既往史）' },
  {
    name: 'encounter_summary',
    percentage: 0.15,
    description: '就诊摘要（主诉+现病史+查体+初步诊断）',
  },
  { name: 'active_orders', percentage: 0.1, description: '活跃医嘱与处方' },
  { name: 'recent_labs', percentage: 0.1, description: '近期检验检查结果（异常值高亮）' },
  { name: 'tool_results', percentage: 0.2, description: '工具调用结果' },
  { name: 'conversation_history', percentage: 0.1, description: '对话历史（最近N轮）' },
  { name: 'reserved', percentage: 0.1, description: '预留缓冲' },
] as const;

/** Token 预算配置 */
export const TOKEN_BUDGET_CONFIG = {
  /** 默认总 Token 预算 */
  DEFAULT_TOTAL_TOKENS: 200000,
  /** 最小 Token 预算 */
  MIN_TOTAL_TOKENS: 50000,
  /** 最大 Token 预算 */
  MAX_TOTAL_TOKENS: 500000,
  /** 单条工具结果最大 Token 数（超过触发 Snip 压缩） */
  MAX_TOOL_RESULT_TOKENS: 2000,
  /** 触发 Microcompact 的上下文使用百分比 */
  MICROCOMPACT_THRESHOLD_PERCENT: 60,
  /** 触发 ContextCollapse 的上下文使用百分比 */
  COLLAPSE_THRESHOLD_PERCENT: 80,
  /** 触发 Autocompact 的上下文使用百分比 */
  AUTOCOMPACT_THRESHOLD_PERCENT: 95,
  /** 输出 Token 最大预算 */
  MAX_OUTPUT_TOKENS: 8192,
  /** 默认分配 */
  DEFAULT_ALLOCATION: DEFAULT_TOKEN_BUDGET_ALLOCATION,
} as const;

// ============================================================
// 工具执行配置
// ============================================================

/** 工具执行默认配置 */
export const TOOL_EXECUTION_CONFIG = {
  /** 默认工具执行超时（毫秒） */
  DEFAULT_TIMEOUT_MS: 30000,
  /** 最大工具执行超时（毫秒） */
  MAX_TIMEOUT_MS: 300000,
  /** 最大并发工具数 */
  MAX_CONCURRENT_TOOLS: 10,
  /** 最大重试次数（仅只读工具） */
  MAX_RETRIES: 1,
  /** 重试间隔（毫秒） */
  RETRY_INTERVAL_MS: 1000,
  /** 工具结果最大字符数（超过则持久化到文件） */
  MAX_RESULT_SIZE_CHARS: 30000,
  /** 确认令牌有效期（毫秒） */
  CONFIRMATION_TOKEN_TTL_MS: 600000,
  /** 确认令牌长度 */
  CONFIRMATION_TOKEN_LENGTH: 32,
} as const;

// ============================================================
// 医疗会话配置
// ============================================================

/** 医疗会话配置 */
export const MEDICAL_SESSION_CONFIG = {
  /** 会话最大消息数（超过触发归档） */
  MAX_MESSAGES_PER_SESSION: 500,
  /** 会话最大持续时间（毫秒，8小时） */
  MAX_SESSION_DURATION_MS: 8 * 60 * 60 * 1000,
  /** 会话空闲超时（毫秒，30分钟） */
  IDLE_TIMEOUT_MS: 30 * 60 * 1000,
  /** 每批加载消息数 */
  MESSAGES_PER_PAGE: 50,
} as const;

// ============================================================
// 数据脱敏配置
// ============================================================

/** 敏感字段配置 */
export const SENSITIVE_FIELDS_CONFIG = {
  /** 需要脱敏的字段列表 */
  FIELDS: [
    'idCard',
    'idCardMasked',
    'phone',
    'phoneMasked',
    'address',
    'addressMasked',
    'emergencyContact',
    'emergencyContactMasked',
    'emergencyContactPhone',
    'emergencyContactPhoneMasked',
    'realName',
    'email',
    'bankCard',
    'socialSecurityNumber',
  ] as const,
  /** 身份证脱敏格式：保留前3位和后4位 */
  ID_CARD_MASK: /^(.{3}).*(.{4})$/,
  /** 手机号脱敏格式：保留前3位和后4位 */
  PHONE_MASK: /^(.{3}).*(.{4})$/,
  /** 姓名脱敏格式：保留姓，名用*代替 */
  NAME_MASK: /^(.).+$/,
} as const;
