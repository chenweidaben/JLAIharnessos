/**
 * 健澜科技 jlmedaios - 数据安全与隐私保护深化纯函数（M198-A）
 *
 * buildDataSecurityReport / classifyDataLevel / maskSensitiveData
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 数据分类分级（纯函数）。
 *
 * @param data 数据描述
 * @returns 分级
 */
export function classifyDataLevel(data: string): { level: 'public' | 'internal' | 'sensitive' | 'core'; handling: string } {
  if (data.includes('身份证') || data.includes('病历') || data.includes('基因')) {
    return { level: 'core', handling: '加密存储+严格访问控制+审计' };
  }
  if (data.includes('手机号') || data.includes('住址') || data.includes('银行账户')) {
    return { level: 'sensitive', handling: '脱敏展示+访问日志' };
  }
  if (data.includes('内部') || data.includes('制度')) {
    return { level: 'internal', handling: '内部访问+水印' };
  }
  return { level: 'public', handling: '公开发布' };
}

/**
 * 敏感数据脱敏（纯函数）。
 *
 * @param data 原始数据
 * @param rule 脱敏规则（phone/id/name）
 * @returns 脱敏后数据
 */
export function maskSensitiveData(data: string, rule: 'phone' | 'id' | 'name'): string {
  if (rule === 'phone') return data.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  if (rule === 'id') return data.replace(/(\d{6})\d{8}(\w{4})/, '$1********$2');
  if (rule === 'name') return data.replace(/^(.)(.*)(.)$/, '$1**$3');
  return data;
}

/** 数据安全报告输出 */
export interface DataSecurityReport {
  timeRange: string;
  classification: { public: number; internal: number; sensitive: number; core: number };
  encryption: { tls: boolean; aes: boolean; fieldLevel: number; keyRotation: number };
  masking: { static: number; dynamic: number; coverage: number };
  access: { rbac: boolean; abac: boolean; leastPrivilege: number; unauthorizedAttempts: number };
  dlp: { rules: number; blocked: number };
  backup: { daily: boolean; recoveryTimeHours: number; recoveryPointMinutes: number };
  lifecycle: { archived: number; deleted: number };
  privacy: { pia: number; consentRate: number };
  suggestions: string[];
}

/**
 * 构建数据安全报告。
 *
 * @param timeRange 时间范围
 * @returns 数据安全报告
 */
export function buildDataSecurityReport(timeRange: string): DataSecurityReport {
  return {
    timeRange,
    classification: { public: 100, internal: 500, sensitive: 200, core: 50 },
    encryption: { tls: true, aes: true, fieldLevel: 50, keyRotation: 12 },
    masking: { static: 200, dynamic: 150, coverage: 0.95 },
    access: { rbac: true, abac: false, leastPrivilege: 300, unauthorizedAttempts: 5 },
    dlp: { rules: 80, blocked: 20 },
    backup: { daily: true, recoveryTimeHours: 4, recoveryPointMinutes: 15 },
    lifecycle: { archived: 1000, deleted: 200 },
    privacy: { pia: 10, consentRate: 0.98 },
    suggestions: ['启用 ABAC 细粒度访问控制', '增加字段级加密覆盖'],
  };
}
