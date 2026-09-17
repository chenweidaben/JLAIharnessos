/**
 * 健澜科技数智医院智能体 - security/desensitization/index.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 数据脱敏模块统一导出
 *
 * 版权所有 (c) 2026 健澜科技
 *
 * @module security/desensitization
 */

export { createDesensitizationEngine, DesensitizationEngine } from './DesensitizationEngine';
export {
  applyRuleToValue,
  desensitizeObject,
  desensitizeText,
  detectSensitiveData,
  generalizeAge,
  generalizeDate,
  hashDesensitize,
  maskAddress,
  maskEmail,
  maskName,
  maskString,
} from './DesensitizationUtils';
export {
  ADDRESS_RULE,
  AGE_RULE,
  BANK_CARD_RULE,
  DATE_OF_BIRTH_RULE,
  DEFAULT_DESENSITIZATION_RULES,
  EMAIL_RULE,
  EMERGENCY_CONTACT_RULE,
  ID_CARD_RULE,
  MEDICAL_RECORD_NO_RULE,
  NAME_RULE,
  PHONE_RULE,
  SENSITIVE_DATA_PATTERNS,
} from './rules';
