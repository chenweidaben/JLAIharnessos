/**
 * 健澜科技数智医院智能体 - security/desensitization/DesensitizationUtils.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 脱敏工具函数
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件提供数据脱敏的基础工具函数，包括字符串掩码、敏感数据检测、
 * 文本全文脱敏、对象递归脱敏等。
 *
 * @module security/desensitization/DesensitizationUtils
 */

import * as crypto from 'node:crypto';

import {
  DesensitizationAlgorithm,
  type DesensitizationRule,
  type DetectedSensitiveData,
  SensitiveFieldType,
} from '../types';
import { SENSITIVE_DATA_PATTERNS } from './rules';

/**
 * 字符串掩码
 * 保留指定前缀和后缀，中间部分用掩码字符替换
 *
 * @param str - 原始字符串
 * @param start - 保留前缀长度
 * @param end - 保留后缀长度
 * @param maskChar - 掩码字符，默认为'*'
 * @returns 掩码后的字符串
 *
 * @example
 * maskString('13812345678', 3, 4) // '138****5678'
 * maskString('110101199001011234', 6, 4) // '110101********1234'
 */
export function maskString(str: string, start: number, end: number, maskChar = '*'): string {
  if (!str || str.length === 0) {
    return str;
  }
  if (start < 0) start = 0;
  if (end < 0) end = 0;
  if (start + end >= str.length) {
    return maskChar.repeat(str.length);
  }
  const prefix = str.slice(0, start);
  const suffix = str.slice(str.length - end);
  const masked = maskChar.repeat(str.length - start - end);
  return prefix + masked + suffix;
}

/**
 * 常见中文复姓表
 * 用于在自由文本/姓名脱敏中识别复姓，复姓姓名按"保留首字、其余掩码"处理，
 * 以符合临床安全对个人标识最小化暴露的要求。
 */
const COMPOUND_SURNAMES: ReadonlySet<string> = new Set<string>([
  '欧阳',
  '司马',
  '诸葛',
  '上官',
  '夏侯',
  '司徒',
  '司空',
  '东方',
  '南宫',
  '慕容',
  '长孙',
  '宇文',
  '钟离',
  '尉迟',
  '公孙',
  '段干',
  '呼延',
  '闻人',
  '独孤',
  '万俟',
  '拓跋',
  '夹谷',
  '轩辕',
  '令狐',
  '百里',
  '东郭',
  '南门',
  '羊舌',
  '微生',
  '梁丘',
  '左丘',
  '东门',
  '西门',
  '南郭',
  '公户',
  '公玉',
  '漆雕',
  '仲孙',
  '叔孙',
  '归海',
  '申屠',
  '端木',
  '公西',
  '颛孙',
  '壤驷',
]);

/**
 * 姓名脱敏
 * 2字名：张*；3字单姓名：王*明；复姓（如欧阳峰）：欧**
 *
 * @param name - 原始姓名
 * @returns 脱敏后的姓名
 */
export function maskName(name: string): string {
  if (!name || name.length === 0) return name;
  const trimmed = name.trim();
  if (trimmed.length <= 1) return trimmed;
  if (trimmed.length === 2) {
    return trimmed[0] + '*';
  }
  // 复姓识别：以常见复姓开头时，仅保留首字，其余全部掩码
  // （临床安全标准：复姓姓名整体保留首字，避免泄露姓名结构）
  if (trimmed.length >= 3 && COMPOUND_SURNAMES.has(trimmed.slice(0, 2))) {
    return trimmed[0] + '*'.repeat(trimmed.length - 1);
  }
  if (trimmed.length === 3) {
    return trimmed[0] + '*' + trimmed[2];
  }
  // 4字及以上单姓：保留首字和末字
  return trimmed[0] + '*'.repeat(trimmed.length - 2) + trimmed[trimmed.length - 1];
}

/**
 * 邮箱脱敏
 * 用户名保留首字符，域名完整保留
 *
 * @param email - 原始邮箱
 * @returns 脱敏后的邮箱
 */
export function maskEmail(email: string): string {
  if (!email?.includes('@')) return email;
  const [username, domain] = email.split('@');
  if (username.length <= 1) {
    return username + '***@' + domain;
  }
  return username[0] + '***@' + domain;
}

/**
 * 地址脱敏
 * 保留省/市/区，详细地址用***替换
 *
 * @param address - 原始地址
 * @returns 脱敏后的地址
 */
export function maskAddress(address: string): string {
  if (!address) return address;
  // 匹配省/市/区/县部分
  const match =
    /^[\u4e00-\u9fa5]{2,8}(?:省|市|自治区|特别行政区)?[\u4e00-\u9fa5]{0,10}(?:区|县|市|旗)/.exec(
      address,
    );
  if (match) {
    return match[0] + '***';
  }
  // 至少保留前6个字符
  if (address.length > 6) {
    return address.slice(0, 6) + '***';
  }
  return '***';
}

/**
 * 年龄泛化
 * 泛化为5岁区间，>89岁统一为≥90岁
 *
 * @param age - 原始年龄
 * @param bucketSize - 区间大小，默认5
 * @returns 泛化后的年龄段描述
 */
export function generalizeAge(age: number, bucketSize = 5): string {
  if (age >= 90) {
    return '≥90岁';
  }
  if (age < 0) {
    return '未知';
  }
  const lower = Math.floor(age / bucketSize) * bucketSize;
  const upper = lower + bucketSize - 1;
  return `${lower}-${upper}岁`;
}

/**
 * 日期泛化
 *
 * @param dateStr - 日期字符串
 * @param precision - 泛化精度：year/month/day
 * @returns 泛化后的日期字符串
 */
export function generalizeDate(
  dateStr: string,
  precision: 'year' | 'month' | 'day' = 'month',
): string {
  if (!dateStr) return dateStr;
  const match = /(\d{4})[-/年](\d{1,2})?[-/月]?(\d{1,2})?日?/.exec(dateStr);
  if (!match) return dateStr;
  const year = match[1];
  const month = match[2] ? match[2].padStart(2, '0') : '01';
  if (precision === 'year') {
    return `${year}年`;
  }
  if (precision === 'month') {
    return `${year}年${month}月`;
  }
  return dateStr;
}

/**
 * 哈希脱敏（不可逆）
 * 使用SHA-256加盐哈希，用于关联分析场景
 *
 * @param value - 原始值
 * @param salt - 盐值
 * @param algorithm - 哈希算法，默认sha256
 * @returns 哈希值（十六进制）
 */
export function hashDesensitize(
  value: string,
  salt = '',
  algorithm: 'sha256' | 'sha512' = 'sha256',
): string {
  const hash = crypto.createHash(algorithm);
  hash.update(salt + value);
  return hash.digest('hex');
}

/**
 * 检测文本中的敏感数据
 * 扫描文本，识别所有匹配的敏感数据类型和位置
 *
 * @param text - 待检测文本
 * @returns 检测到的敏感数据项列表
 */
export function detectSensitiveData(text: string): DetectedSensitiveData[] {
  if (!text) return [];
  const results: DetectedSensitiveData[] = [];
  const usedRanges: [number, number][] = [];

  const fieldTypes = Object.keys(SENSITIVE_DATA_PATTERNS) as SensitiveFieldType[];

  for (const fieldType of fieldTypes) {
    const pattern = SENSITIVE_DATA_PATTERNS[fieldType];
    // 重置正则的lastIndex
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      // 检查是否与已检测的范围重叠
      const overlaps = usedRanges.some(([s, e]) => start < e && end > s);
      if (!overlaps) {
        results.push({
          type: fieldType,
          value: match[0],
          startIndex: start,
          endIndex: end,
        });
        usedRanges.push([start, end]);
      }
      // 防止零长度匹配导致的无限循环
      if (match[0].length === 0) {
        pattern.lastIndex++;
      }
    }
  }

  // 按位置排序
  results.sort((a, b) => a.startIndex - b.startIndex);
  return results;
}

/**
 * 文本全文脱敏
 * 自动检测文本中的敏感数据并按规则脱敏
 *
 * @param text - 原始文本
 * @param rules - 脱敏规则映射（可选，使用默认规则）
 * @returns 脱敏后的文本
 */
export function desensitizeText(
  text: string,
  rules?: Map<SensitiveFieldType, DesensitizationRule>,
): string {
  if (!text) return text;
  const detected = detectSensitiveData(text);
  if (detected.length === 0) return text;

  let result = '';
  let lastIndex = 0;

  for (const item of detected) {
    result += text.slice(lastIndex, item.startIndex);
    const rule = rules?.get(item.type);
    result += applyRuleToValue(item.value, item.type, rule);
    lastIndex = item.endIndex;
  }
  result += text.slice(lastIndex);
  return result;
}

/**
 * IP地址脱敏
 * 保留前两段，后两段用*替换（IPv4）
 * 示例：192.168.1.100 → 192.168.*.*
 *
 * @param ip - 原始IP地址
 * @returns 脱敏后的IP
 */
export function maskIp(ip: string): string {
  if (!ip) return ip;
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.*`;
  }
  // IPv6或其他格式：保留首段，其余掩码
  if (ip.includes(':')) {
    const v6 = ip.split(':');
    return `${v6[0]}:****`;
  }
  return '***';
}

/**
 * 对单个值应用脱敏规则
 *
 * @param value - 原始值
 * @param fieldType - 字段类型
 * @param rule - 脱敏规则（可选）
 * @returns 脱敏后的值
 */
export function applyRuleToValue(
  value: string,
  fieldType: SensitiveFieldType,
  rule?: DesensitizationRule,
): string {
  if (!value) return value;

  switch (fieldType) {
    case SensitiveFieldType.ID_CARD:
      return maskString(value, rule?.keepPrefix ?? 6, rule?.keepSuffix ?? 4, rule?.maskChar);
    case SensitiveFieldType.PHONE:
      return maskString(value, rule?.keepPrefix ?? 3, rule?.keepSuffix ?? 4, rule?.maskChar);
    case SensitiveFieldType.NAME:
      return maskName(value);
    case SensitiveFieldType.ADDRESS:
      return maskAddress(value);
    case SensitiveFieldType.BANK_CARD:
      return maskString(value, rule?.keepPrefix ?? 6, rule?.keepSuffix ?? 4, rule?.maskChar);
    case SensitiveFieldType.EMAIL:
      return maskEmail(value);
    case SensitiveFieldType.EMERGENCY_CONTACT:
      return '紧急联系人：***';
    case SensitiveFieldType.MEDICAL_RECORD_NO:
      return maskString(value, rule?.keepPrefix ?? 6, rule?.keepSuffix ?? 3, rule?.maskChar);
    case SensitiveFieldType.DATE_OF_BIRTH:
      return generalizeDate(value, rule?.generalizeConfig?.datePrecision ?? 'year');
    case SensitiveFieldType.AGE: {
      const ageNum = parseInt(value, 10);
      if (!isNaN(ageNum)) {
        return generalizeAge(ageNum, rule?.generalizeConfig?.ageBucket ?? 5);
      }
      return value;
    }
    case SensitiveFieldType.INPATIENT_NO:
      return maskString(value, rule?.keepPrefix ?? 2, rule?.keepSuffix ?? 3, rule?.maskChar);
    case SensitiveFieldType.OUTPATIENT_NO:
      return maskString(value, rule?.keepPrefix ?? 2, rule?.keepSuffix ?? 3, rule?.maskChar);
    case SensitiveFieldType.INSURANCE_CARD:
      return maskString(value, rule?.keepPrefix ?? 4, rule?.keepSuffix ?? 4, rule?.maskChar);
    case SensitiveFieldType.LICENSE_PLATE:
      return maskString(value, rule?.keepPrefix ?? 2, rule?.keepSuffix ?? 1, rule?.maskChar);
    case SensitiveFieldType.IP_ADDRESS:
      return maskIp(value);
    case SensitiveFieldType.MAC_ADDRESS:
      return maskString(value, rule?.keepPrefix ?? 8, rule?.keepSuffix ?? 0, rule?.maskChar);
    default:
      return maskString(value, 0, 0, rule?.maskChar ?? '*');
  }
}

/**
 * 对象递归脱敏
 * 递归遍历对象的所有属性，对敏感字段进行脱敏
 *
 * @param obj - 待脱敏对象
 * @param fieldRules - 字段名到脱敏规则的映射
 * @param typeRules - 字段类型到脱敏规则的映射（用于自动检测）
 * @returns 脱敏后的对象（深拷贝）
 */
export function desensitizeObject<T>(
  obj: T,
  fieldRules?: Map<string, DesensitizationRule>,
  typeRules?: Map<SensitiveFieldType, DesensitizationRule>,
): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return desensitizeText(obj, typeRules) as T;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return (obj as unknown[]).map((item) =>
      desensitizeObject(item, fieldRules, typeRules),
    ) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    // 检查是否有针对该字段名的自定义规则
    const customRule = fieldRules?.get(key);
    if (customRule && typeof value === 'string') {
      result[key] = applyCustomRule(value, customRule);
    } else {
      result[key] = desensitizeObject(value, fieldRules, typeRules);
    }
  }
  return result as T;
}

/**
 * 应用自定义脱敏规则到字符串值
 *
 * @param value - 原始值
 * @param rule - 脱敏规则
 * @returns 脱敏后的值
 */
function applyCustomRule(value: string, rule: DesensitizationRule): string {
  switch (rule.algorithm) {
    case DesensitizationAlgorithm.MASK:
      return maskString(value, rule.keepPrefix ?? 0, rule.keepSuffix ?? 0, rule.maskChar ?? '*');
    case DesensitizationAlgorithm.REPLACE:
      return rule.replacement ?? '***';
    case DesensitizationAlgorithm.HASH:
      return hashDesensitize(
        value,
        rule.salt,
        rule.hashAlgorithm === 'sha512' ? 'sha512' : 'sha256',
      );
    case DesensitizationAlgorithm.GENERALIZE:
      if (rule.fieldType === SensitiveFieldType.AGE) {
        const ageNum = parseInt(value, 10);
        if (!isNaN(ageNum)) {
          return generalizeAge(ageNum, rule.generalizeConfig?.ageBucket ?? 5);
        }
      }
      return generalizeDate(value, rule.generalizeConfig?.datePrecision ?? 'month');
    default:
      return value;
  }
}
