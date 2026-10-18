/**
 * 健澜科技 jlmedaios - 病历隐私脱敏展示 V14 聚合器（M466-B）
 *
 * 纯函数：手机号/身份证/姓名脱敏 + 按角色差异化脱敏。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 角色类型 */
export type MaskRoleV14 = "doctor" | "nurse" | "admin" | "public";

/** 手机号正则：前 3 位 + 中间 4 位 + 后 4 位 */
const PHONE_PATTERN = /(\d{3})\d{4}(\d{4})/;

/** 身份证正则：前 6 位 + 中间 8 位 + 后 4 位 */
const ID_CARD_PATTERN = /(\d{6})\d{8}(\d{4})/;

/**
 * 脱敏手机号：中间 4 位替换为 ****。
 *
 * @param text 原始文本
 * @returns 脱敏后文本
 */
function maskPhone(text: string): string {
  return text.replace(PHONE_PATTERN, "$1****$2");
}

/**
 * 脱敏身份证：中间 8 位替换为 ********。
 *
 * @param text 原始文本
 * @returns 脱敏后文本
 */
function maskIdCard(text: string): string {
  return text.replace(ID_CARD_PATTERN, "$1********$2");
}

/**
 * 脱敏姓名：保留第一个字符，其余替换为 *。
 *
 * @param text 原始文本
 * @returns 脱敏后文本
 */
function maskName(text: string): string {
  if (text.length <= 1) return text;
  // 只对包含中文字符的文本做姓名脱敏（手机号/身份证已单独处理）
  if (!/[\u4e00-\u9fa5]/.test(text)) return text;
  return text.charAt(0) + "*".repeat(text.length - 1);
}

/**
 * 全量脱敏：手机号 + 身份证 + 姓名。
 *
 * @param text 原始文本
 * @returns 脱敏后文本
 */
export function maskPatientInfo(text: string): string {
  let result = text;
  result = maskPhone(result);
  result = maskIdCard(result);
  result = maskName(result);
  return result;
}

/**
 * 按角色差异化脱敏。
 *
 * @param role 角色（doctor/nurse/admin/public）
 * @param text 原始文本
 * @returns 脱敏后文本
 */
export function maskByRole(role: MaskRoleV14, text: string): string {
  switch (role) {
    case "doctor":
      return text;
    case "nurse": {
      let result = maskName(text);
      result = maskPhone(result);
      return result;
    }
    case "admin":
      return maskIdCard(text);
    case "public":
      return maskPatientInfo(text);
    default:
      return text;
  }
}
