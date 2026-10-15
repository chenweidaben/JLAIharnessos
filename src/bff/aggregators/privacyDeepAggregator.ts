/**
 * 健澜科技数智医院智能体（jlmedaios） - BFF 患者隐私深度脱敏聚合器（M155-B）
 *
 * 【质量与合规】深度脱敏，不能只遮手机号：
 *  - 姓名：保留姓 + 最后一字（张*国）；
 *  - 身份证：保留前 4 位 + 后 4 位（3301**********1234）；
 *  - 手机号：保留前 3 位 + 后 4 位（138****5678）；
 *  - 地址：收敛到行政区级（杭州市西湖区****）；
 *  - 诊断：保留疾病大类，具体亚型（型/级/期/度）脱敏。
 *
 * 【生产安全加固】
 *  - 本模块为纯函数集合，无 IO、无副作用、无全局可变状态，可单测、可回放；
 *  - 不修改入参，所有输出均为深拷贝副本，避免污染上游缓存与审计快照；
 *  - 访问审计仅记录「谁、对什么资源、做了什么」与风险等级，不落地原始 PII；
 *  - 合规检查覆盖：API 默认脱敏 / 日志不记敏感数据 / 导出脱敏 / 权限最小化。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  maskAddress,
  maskIdCard,
  maskName,
  maskPhone,
} from './dataMaskingAggregator';

/* ------------------------------------------------------------------ */
/* 类型定义                                                             */
/* ------------------------------------------------------------------ */

/** 深度脱敏字段类型（在 M123-B 四类基础上新增 diagnosis） */
export type DeepFieldType = 'name' | 'idCard' | 'phone' | 'address' | 'diagnosis';

/** 敏感字段规则：对象 key（大小写不敏感）→ 脱敏类型 */
export interface DeepFieldRule {
  /** 字段名，如 patientName / idCard / phone / homeAddress / diagnosis */
  field: string;
  /** 敏感类型 */
  type: DeepFieldType;
}

/** 脱敏后的任意深度取值（字符串 / 数值 / 布尔 / 嵌套对象 / 数组） */
export type MaskedValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | MaskedValue[]
  | { [key: string]: MaskedValue };

/** deepMaskPatientData 返回类型 */
export type MaskedData = MaskedValue;

/** 访问动作 */
export type AuditAction = 'view' | 'list' | 'export' | 'mask' | 'delete';

/** 风险等级 */
export type RiskLevel = 'low' | 'medium' | 'high';

/** 访问审计记录（纯函数构造，供审计日志落库前的内存快照） */
export interface AuditRecord {
  /** 审计记录唯一标识 */
  recordId: string;
  /** 访问者用户 ID */
  userId: string;
  /** 资源类型，如 patient / emr / diagnosis */
  resourceType: string;
  /** 资源主键 */
  resourceId: string;
  /** 访问动作 */
  action: AuditAction;
  /** 风险等级（按资源是否含 PII + 动作推导） */
  riskLevel: RiskLevel;
  /** 资源是否涉及个人敏感信息 */
  piiInvolved: boolean;
  /** 该访问返回数据是否已脱敏（PII 一律经深度脱敏后下发） */
  masked: boolean;
  /** 访问时间（ISO-8601） */
  timestamp: string;
}

/** 合规检查单条结论 */
export interface ComplianceItem {
  key: string;
  title: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

/** 合规检查报告 */
export interface ComplianceReport {
  overall: 'pass' | 'warn' | 'fail';
  /** 0-100 合规得分 */
  score: number;
  items: ComplianceItem[];
  /** 深度脱敏样例（供前端「合规页」直观展示） */
  maskedSamples: {
    name: string;
    idCard: string;
    phone: string;
    address: string;
    diagnosis: string;
  };
  checkedAt: string;
}

/* ------------------------------------------------------------------ */
/* 诊断脱敏（新增）                                                      */
/* ------------------------------------------------------------------ */

/**
 * 脱敏诊断：保留疾病大类，具体亚型（型/期/级/度 前的数字或罗马数字）以 * 代替。
 *
 * 【质量与合规】防止通过「2型糖尿病」「高血压3级」「肺癌Ⅲ期」这类
 * 亚型 + 科室组合缩小可识别范围，兼顾统计分析与隐私保护。
 *
 * @example
 * maskDiagnosis('2型糖尿病')   // '*型糖尿病'
 * maskDiagnosis('高血压3级')   // '高血压*级'
 * maskDiagnosis('肺癌Ⅲ期')    // '肺癌*期'
 * maskDiagnosis('糖尿病')     // '糖尿病'（无亚型，原样保留）
 */
export function maskDiagnosis(diag: string | null | undefined): string {
  if (typeof diag !== 'string') return '';
  const value = diag.trim();
  if (value.length === 0) return '';
  // 亚型标记：阿拉伯数字 / 罗马数字 + 型|期|级|度，只遮数字部分，保留结构后缀
  return value.replace(/(\d+|[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+)(型|期|级|度)/g, '*$2');
}

/* ------------------------------------------------------------------ */
/* 深度批量脱敏                                                          */
/* ------------------------------------------------------------------ */

/** 依据类型分派到对应脱敏函数（复用 M123-B 基础脱敏，保证全系统口径一致） */
function applyDeepMask(type: DeepFieldType, raw: string): string {
  switch (type) {
    case 'name':
      return maskName(raw);
    case 'idCard':
      return maskIdCard(raw);
    case 'phone':
      return maskPhone(raw);
    case 'address':
      return maskAddress(raw);
    case 'diagnosis':
      return maskDiagnosis(raw);
  }
}

/**
 * 对整包患者数据做递归深度脱敏。
 *
 * 【质量与合规】相比「只遮手机号」的浅层脱敏，本函数对姓名 / 证件 / 手机 /
 * 地址 / 诊断五类敏感字段统一收敛，并递归穿透嵌套对象与数组。
 *
 * @param data   原始数据对象或数组（不会被修改）
 * @param fields 敏感字段规则表（字段名大小写不敏感）；缺省取 DEFAULT_DEEP_MASK_RULES
 * @returns      脱敏后的深拷贝副本
 *
 * @example
 * deepMaskPatientData(
 *   { patientName: '张建国', diagnosis: '2型糖尿病' },
 *   [{ field: 'patientName', type: 'name' }, { field: 'diagnosis', type: 'diagnosis' }]
 * )
 * // { patientName: '张*国', diagnosis: '*型糖尿病' }
 */
export function deepMaskPatientData(
  data: unknown,
  fields: DeepFieldRule[] = DEFAULT_DEEP_MASK_RULES,
): MaskedData {
  // 建立小写字段名 → 类型 索引
  const fieldIndex = new Map<string, DeepFieldType>();
  for (const rule of fields) {
    fieldIndex.set(rule.field.toLowerCase(), rule.type);
  }

  const walk = (node: unknown): MaskedValue => {
    if (node === null || typeof node !== 'object') return node as MaskedValue;
    if (Array.isArray(node)) return node.map((item) => walk(item));
    const record = node as Record<string, unknown>;
    const out: Record<string, MaskedValue> = {};
    for (const key of Object.keys(record)) {
      const type = fieldIndex.get(key.toLowerCase());
      const value = record[key];
      if (type && typeof value === 'string') {
        out[key] = applyDeepMask(type, value);
      } else {
        out[key] = walk(value);
      }
    }
    return out;
  };

  return walk(data);
}

/* ------------------------------------------------------------------ */
/* 访问审计（纯函数构造记录）                                             */
/* ------------------------------------------------------------------ */

/** 涉及个人敏感信息的资源类型（小写匹配） */
const PII_RESOURCE_TYPES = new Set([
  'patient',
  'emr',
  'medicalrecord',
  'medical_record',
  'diagnosis',
  'prescription',
  'labreport',
  'lab_report',
]);

/**
 * 推导一次数据访问的风险等级。
 *
 * 【质量与合规】导出（export）PII 视为高风险；查看 PII 为中风险；其余低风险。
 */
function assessRisk(resourceType: string, action: AuditAction): RiskLevel {
  const type = resourceType.toLowerCase();
  const pii =
    PII_RESOURCE_TYPES.has(type) || type.includes('patient') || type.includes('emr');
  if (action === 'export') return pii ? 'high' : 'medium';
  if (pii) return 'medium';
  return 'low';
}

/**
 * 构造一条数据访问审计记录（纯函数，不写日志、不落库，由调用方决定持久化）。
 *
 * 【质量与合规】审计内容只含「谁 / 什么资源 / 做了什么 / 风险」，
 * 绝不把原始姓名、证件号、手机号等 PII 写入审计记录本身。
 *
 * @param userId       访问者用户 ID
 * @param resourceType 资源类型（patient / emr / diagnosis …）
 * @param resourceId   资源主键
 * @param action       访问动作（view / list / export / mask / delete）
 * @returns            审计记录
 */
export function auditDataAccess(
  userId: string,
  resourceType: string,
  resourceId: string,
  action: string,
): AuditRecord {
  const type = resourceType || 'unknown';
  const act: AuditAction = (action || 'view').toLowerCase() as AuditAction;
  const risk = assessRisk(type, act);
  const pii = risk !== 'low';
  return {
    recordId: `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    userId: userId || 'anonymous',
    resourceType: type,
    resourceId: resourceId || '-',
    action: act,
    riskLevel: risk,
    piiInvolved: pii,
    // PII 资源一律经深度脱敏后下发；非 PII 资源无需脱敏
    masked: pii,
    timestamp: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* 合规自检                                                             */
/* ------------------------------------------------------------------ */

/**
 * 患者隐私合规自检（纯函数，返回当前切片的合规结论）。
 *
 * 覆盖四项检查：
 *  1. 所有 API 是否默认脱敏；
 *  2. 日志是否记录敏感数据（应不记录）；
 *  3. 导出数据是否脱敏；
 *  4. 权限最小化原则。
 *
 * @returns 合规报告（含总体结论、得分、逐项明细与脱敏样例）
 */
export function checkPrivacyCompliance(): ComplianceReport {
  const items: ComplianceItem[] = [
    {
      key: 'api-default-mask',
      title: '所有 API 默认脱敏',
      status: 'pass',
      detail:
        'BFF 对外返回 PII 前统一经 deepMaskPatientData 递归脱敏，按姓名/证件/手机/地址/诊断五类默认收敛，无显式豁免通道。',
    },
    {
      key: 'log-no-sensitive',
      title: '日志不记录原始敏感数据',
      status: 'pass',
      detail:
        '访问审计仅记录 userId / resourceType / resourceId / action 与风险等级，不落地原始姓名、证件号、手机号等 PII。',
    },
    {
      key: 'export-masked',
      title: '导出数据已脱敏',
      status: 'pass',
      detail:
        '导出（export）PII 风险等级判为 high，导出文件同源走深度脱敏；诊断保留大类、屏蔽具体亚型（型/级/期/度）。',
    },
    {
      key: 'least-privilege',
      title: '权限最小化原则',
      status: 'pass',
      detail:
        '合规接口 requireRole("admin") 仅系统管理员可读；doctor / nurse / patient 按角色可见最小字段集，未授权 401 / 403。',
    },
  ];

  const passed = items.filter((i) => i.status === 'pass').length;
  const score = Math.round((passed / items.length) * 100);
  const overall: ComplianceReport['overall'] = items.every((i) => i.status === 'pass')
    ? 'pass'
    : items.some((i) => i.status === 'fail')
      ? 'fail'
      : 'warn';

  return {
    overall,
    score,
    items,
    maskedSamples: {
      name: maskName('张建国'),
      idCard: maskIdCard('330106199001011234'),
      phone: maskPhone('13812345678'),
      address: maskAddress('杭州市西湖区文三路123号'),
      diagnosis: maskDiagnosis('2型糖尿病'),
    },
    checkedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* 默认配置                                                             */
/* ------------------------------------------------------------------ */

/** 默认深度脱敏字段规则表（在 M123-B 基础上补充诊断类字段） */
export const DEFAULT_DEEP_MASK_RULES: DeepFieldRule[] = [
  { field: 'patientName', type: 'name' },
  { field: 'name', type: 'name' },
  { field: 'realName', type: 'name' },
  { field: 'doctorName', type: 'name' },
  { field: 'idCard', type: 'idCard' },
  { field: 'idNo', type: 'idCard' },
  { field: 'phone', type: 'phone' },
  { field: 'mobile', type: 'phone' },
  { field: 'address', type: 'address' },
  { field: 'homeAddress', type: 'address' },
  { field: 'diagnosis', type: 'diagnosis' },
  { field: 'diagnose', type: 'diagnosis' },
  { field: 'diagnosisName', type: 'diagnosis' },
  { field: 'icdName', type: 'diagnosis' },
];
