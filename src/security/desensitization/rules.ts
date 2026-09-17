/**
 * 健澜科技数智医院智能体 - security/desensitization/rules.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 脱敏规则定义
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件定义各类敏感数据的脱敏规则，符合《个人信息保护法》要求。
 * 涵盖身份证号、手机号、姓名、地址、银行卡号、邮箱、紧急联系人、病历号、
 * 住院号、门诊号、医保卡、车牌号、IP地址、MAC地址等。
 *
 * @module security/desensitization/rules
 */

import { DesensitizationAlgorithm, type DesensitizationRule, SensitiveFieldType } from '../types';

/**
 * 身份证号脱敏规则
 * 18位身份证：保留前6位（地区码）和后4位，中间8位生日用*替换
 * 示例：110101199001011234 → 110101********1234
 */
export const ID_CARD_RULE: DesensitizationRule = {
  fieldType: SensitiveFieldType.ID_CARD,
  algorithm: DesensitizationAlgorithm.MASK,
  keepPrefix: 6,
  keepSuffix: 4,
  maskChar: '*',
  reversible: false,
};

/**
 * 手机号脱敏规则
 * 11位手机号：保留前3位和后4位，中间4位用*替换
 * 示例：13812345678 → 138****5678
 */
export const PHONE_RULE: DesensitizationRule = {
  fieldType: SensitiveFieldType.PHONE,
  algorithm: DesensitizationAlgorithm.MASK,
  keepPrefix: 3,
  keepSuffix: 4,
  maskChar: '*',
  reversible: true,
};

/**
 * 姓名脱敏规则
 * 2字名：保留姓，名用*替换（张三→张*）
 * 3字名：保留姓和末字，中间用*替换（王小明→王*明）
 * 复姓：仅保留首字（欧阳峰→欧**）
 */
export const NAME_RULE: DesensitizationRule = {
  fieldType: SensitiveFieldType.NAME,
  algorithm: DesensitizationAlgorithm.REPLACE,
  replacement: 'mask_name',
  reversible: false,
};

/**
 * 地址脱敏规则
 * 保留省/市，详细地址泛化隐藏
 * 示例：北京市海淀区中关村大街1号 → 北京市海淀区***
 */
export const ADDRESS_RULE: DesensitizationRule = {
  fieldType: SensitiveFieldType.ADDRESS,
  algorithm: DesensitizationAlgorithm.GENERALIZE,
  generalizeConfig: {
    datePrecision: 'day',
  },
  reversible: false,
};

/**
 * 银行卡号脱敏规则
 * 保留前6位（BIN）和后4位，中间用*替换
 * 示例：6222021234567890123 → 622202*********0123
 */
export const BANK_CARD_RULE: DesensitizationRule = {
  fieldType: SensitiveFieldType.BANK_CARD,
  algorithm: DesensitizationAlgorithm.MASK,
  keepPrefix: 6,
  keepSuffix: 4,
  maskChar: '*',
  reversible: false,
};

/**
 * 邮箱脱敏规则
 * 用户名保留首字符，其余用*替换，域名保留
 * 示例：zhangsan@hospital.com → z***@hospital.com
 */
export const EMAIL_RULE: DesensitizationRule = {
  fieldType: SensitiveFieldType.EMAIL,
  algorithm: DesensitizationAlgorithm.REPLACE,
  replacement: 'mask_email',
  reversible: false,
};

/**
 * 紧急联系人脱敏规则
 * 姓名和电话均脱敏
 */
export const EMERGENCY_CONTACT_RULE: DesensitizationRule = {
  fieldType: SensitiveFieldType.EMERGENCY_CONTACT,
  algorithm: DesensitizationAlgorithm.REPLACE,
  replacement: '***',
  reversible: false,
};

/**
 * 病历号脱敏规则
 * 保留前缀和后3位，中间用*替换
 * 示例：BL20260914001 → BL2026****001
 */
export const MEDICAL_RECORD_NO_RULE: DesensitizationRule = {
  fieldType: SensitiveFieldType.MEDICAL_RECORD_NO,
  algorithm: DesensitizationAlgorithm.MASK,
  keepPrefix: 6,
  keepSuffix: 3,
  maskChar: '*',
  reversible: false,
};

/**
 * 出生日期脱敏规则
 * 泛化为仅保留年
 * 示例：1990-01-15 → 1990年
 */
export const DATE_OF_BIRTH_RULE: DesensitizationRule = {
  fieldType: SensitiveFieldType.DATE_OF_BIRTH,
  algorithm: DesensitizationAlgorithm.GENERALIZE,
  generalizeConfig: {
    datePrecision: 'year',
  },
  reversible: false,
};

/**
 * 年龄脱敏规则
 * 泛化为5岁区间，>89岁统一为≥90岁
 * 示例：47岁→45-49岁；92岁→≥90岁
 */
export const AGE_RULE: DesensitizationRule = {
  fieldType: SensitiveFieldType.AGE,
  algorithm: DesensitizationAlgorithm.GENERALIZE,
  generalizeConfig: {
    ageBucket: 5,
  },
  reversible: false,
};

/**
 * 住院号脱敏规则
 * 保留前缀2位和后3位，中间用*替换
 * 示例：ZY20260914001 → ZY******001
 */
export const INPATIENT_NO_RULE: DesensitizationRule = {
  fieldType: SensitiveFieldType.INPATIENT_NO,
  algorithm: DesensitizationAlgorithm.MASK,
  keepPrefix: 2,
  keepSuffix: 3,
  maskChar: '*',
  reversible: false,
};

/**
 * 门诊号脱敏规则
 * 保留前缀2位和后3位
 */
export const OUTPATIENT_NO_RULE: DesensitizationRule = {
  fieldType: SensitiveFieldType.OUTPATIENT_NO,
  algorithm: DesensitizationAlgorithm.MASK,
  keepPrefix: 2,
  keepSuffix: 3,
  maskChar: '*',
  reversible: false,
};

/**
 * 医保卡/社会保障卡脱敏规则
 * 保留前4位和后4位
 */
export const INSURANCE_CARD_RULE: DesensitizationRule = {
  fieldType: SensitiveFieldType.INSURANCE_CARD,
  algorithm: DesensitizationAlgorithm.MASK,
  keepPrefix: 4,
  keepSuffix: 4,
  maskChar: '*',
  reversible: false,
};

/**
 * 车牌号脱敏规则
 * 保留省份简称和首字母，末位保留
 * 示例：京A12345 → 京A****5
 */
export const LICENSE_PLATE_RULE: DesensitizationRule = {
  fieldType: SensitiveFieldType.LICENSE_PLATE,
  algorithm: DesensitizationAlgorithm.MASK,
  keepPrefix: 2,
  keepSuffix: 1,
  maskChar: '*',
  reversible: false,
};

/**
 * IP地址脱敏规则（REPLACE算法，运行时由maskIp处理）
 * 保留前两段，后两段用*替换
 * 示例：192.168.1.100 → 192.168.*.*
 */
export const IP_ADDRESS_RULE: DesensitizationRule = {
  fieldType: SensitiveFieldType.IP_ADDRESS,
  algorithm: DesensitizationAlgorithm.REPLACE,
  replacement: 'mask_ip',
  reversible: false,
};

/**
 * MAC地址脱敏规则
 * 保留前两段（前8个字符），其余用*替换
 */
export const MAC_ADDRESS_RULE: DesensitizationRule = {
  fieldType: SensitiveFieldType.MAC_ADDRESS,
  algorithm: DesensitizationAlgorithm.MASK,
  keepPrefix: 8,
  keepSuffix: 0,
  maskChar: '*',
  reversible: false,
};

/**
 * 默认脱敏规则集
 */
export const DEFAULT_DESENSITIZATION_RULES: Map<SensitiveFieldType, DesensitizationRule> = new Map<
  SensitiveFieldType,
  DesensitizationRule
>([
  [SensitiveFieldType.ID_CARD, ID_CARD_RULE],
  [SensitiveFieldType.PHONE, PHONE_RULE],
  [SensitiveFieldType.NAME, NAME_RULE],
  [SensitiveFieldType.ADDRESS, ADDRESS_RULE],
  [SensitiveFieldType.BANK_CARD, BANK_CARD_RULE],
  [SensitiveFieldType.EMAIL, EMAIL_RULE],
  [SensitiveFieldType.EMERGENCY_CONTACT, EMERGENCY_CONTACT_RULE],
  [SensitiveFieldType.MEDICAL_RECORD_NO, MEDICAL_RECORD_NO_RULE],
  [SensitiveFieldType.DATE_OF_BIRTH, DATE_OF_BIRTH_RULE],
  [SensitiveFieldType.AGE, AGE_RULE],
  [SensitiveFieldType.INPATIENT_NO, INPATIENT_NO_RULE],
  [SensitiveFieldType.OUTPATIENT_NO, OUTPATIENT_NO_RULE],
  [SensitiveFieldType.INSURANCE_CARD, INSURANCE_CARD_RULE],
  [SensitiveFieldType.LICENSE_PLATE, LICENSE_PLATE_RULE],
  [SensitiveFieldType.IP_ADDRESS, IP_ADDRESS_RULE],
  [SensitiveFieldType.MAC_ADDRESS, MAC_ADDRESS_RULE],
]);

/**
 * 敏感数据正则表达式模式
 * 用于自动检测文本中的敏感数据。
 *
 * 设计原则（临床安全）：自由文本中"中文姓名"无法可靠区分普通词汇，
 * 故姓名仅在出现明确标签（如"患者姓名：张三"）时才识别，避免对普通文本误脱敏，
 * 同时防止因误判导致的安全/可用性事故。
 */
export const SENSITIVE_DATA_PATTERNS: Record<SensitiveFieldType, RegExp> = {
  // 18位身份证号（含校验位逻辑的简化正则）
  [SensitiveFieldType.ID_CARD]:
    /[1-9]\d{5}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]/g,
  // 11位手机号
  [SensitiveFieldType.PHONE]: /1[3-9]\d{9}/g,
  // 中文姓名：仅在"姓名："等明确标签后识别，避免对普通中文文本误报
  // 使用后行断言，仅匹配姓名本身（保留标签前缀）
  [SensitiveFieldType.NAME]:
    /(?<=(?:患者|病人|医生|护士|主治|联系人|家属|经手)?姓名[：:]\s*)[一-龥·]{2,4}/g,
  // 中文地址（含省市区县关键词）
  [SensitiveFieldType.ADDRESS]:
    /[一-龥]{2,8}(?:省|市|自治区|特别行政区)[一-龥]{0,20}(?:区|县|市|镇|乡|街道|路|街|号|村)/g,
  // 银行卡号（16-19位数字，常见BIN前缀）
  [SensitiveFieldType.BANK_CARD]:
    /\b(?:6[0-9]{15,18}|4[0-9]{15,18}|5[0-9]{15,18}|9[0-9]{15,18})\b/g,
  // 邮箱地址
  [SensitiveFieldType.EMAIL]: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // 紧急联系人（匹配"紧急联系人"后跟的姓名和电话）
  [SensitiveFieldType.EMERGENCY_CONTACT]: /紧急联系人[：:]\s*[一-龥]{2,4}\s*[\d-]{7,15}/g,
  // 病历号（BL前缀或"病历号"标签）
  [SensitiveFieldType.MEDICAL_RECORD_NO]: /(?:BL|病历号)[A-Za-z]*\d{6,}/g,
  // 出生日期
  [SensitiveFieldType.DATE_OF_BIRTH]:
    /(?:19|20)\d{2}[-/年](?:0[1-9]|1[0-2])[-/月](?:0[1-9]|[12]\d|3[01])日?/g,
  // 年龄
  [SensitiveFieldType.AGE]: /\d{1,3}\s*岁/g,
  // 住院号（ZY前缀或"住院号"标签）
  [SensitiveFieldType.INPATIENT_NO]: /(?:ZY|住院号)[A-Za-z]*\d{4,}/g,
  // 门诊号（MZ前缀或"门诊号"标签）
  [SensitiveFieldType.OUTPATIENT_NO]: /(?:MZ|门诊号)[A-Za-z]*\d{4,}/g,
  // 医保卡/社保卡（带标签的卡号）
  [SensitiveFieldType.INSURANCE_CARD]: /(?:医保卡|社保卡|医保卡号)[：:]?\s*[A-Za-z0-9]{8,20}/g,
  // 车牌号（民用车牌：省份简称+字母+5~6位）
  [SensitiveFieldType.LICENSE_PLATE]:
    /[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-HJ-NP-Z][A-HJ-NP-Z0-9]{4,5}[A-HJ-NP-Z0-9挂学警港澳]/g,
  // IPv4地址
  [SensitiveFieldType.IP_ADDRESS]:
    /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
  // MAC地址（冒号或连字符分隔）
  [SensitiveFieldType.MAC_ADDRESS]: /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g,
};
