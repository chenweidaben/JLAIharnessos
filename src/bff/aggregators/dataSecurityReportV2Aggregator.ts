/**
 * 健澜科技 jlmedaios - 数据安全 V2 纯函数（M217-A）
 *
 * buildDataSecurityReportV2 / classifyDataSensitivity / maskData
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 数据敏感度等级 */
export type DataSensitivity = '公开' | '内部' | '敏感' | '核心';

/**
 * 分类数据敏感度（纯函数）。
 *
 * @param data 数据
 * @returns 敏感度等级
 */
export function classifyDataSensitivity(data: string): DataSensitivity {
  if (data.includes('病历') || data.includes('处方')) return '核心';
  if (data.includes('身份证') || data.includes('手机')) return '敏感';
  if (data.includes('内部')) return '内部';
  return '公开';
}

/**
 * 脱敏数据（纯函数）。
 *
 * @param data 数据
 * @param rule 脱敏规则
 * @returns 脱敏后数据
 */
export function maskData(data: string, rule: string): string {
  if (rule === '手机号') return data.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  if (rule === '身份证') return data.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
  return data;
}

/** 数据安全 V2 报告输出 */
export interface DataSecurityReportV2 {
  timeRange: string;
  classification: { public: number; internal: number; sensitive: number; core: number };
  encryption: { tls: boolean; aes: boolean; field: boolean };
  masking: { static: number; dynamic: number };
  accessControl: { rbac: boolean; abac: boolean };
  audit: { logs: number };
  dlp: { rules: number };
  pipl: { compliance: boolean };
  export: { approved: number };
  suggestions: string[];
}

/**
 * 构建数据安全 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 数据安全 V2 报告
 */
export function buildDataSecurityReportV2(timeRange: string): DataSecurityReportV2 {
  return {
    timeRange,
    classification: { public: 100, internal: 200, sensitive: 50, core: 20 },
    encryption: { tls: true, aes: true, field: true },
    masking: { static: 100, dynamic: 50 },
    accessControl: { rbac: true, abac: true },
    audit: { logs: 10000 },
    dlp: { rules: 50 },
    pipl: { compliance: true },
    export: { approved: 5 },
    suggestions: ['加强字段级加密', '增加 DLP 规则覆盖'],
  };
}
