/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 表单验证规则
 */
export function isPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

export function isIdCard(idCard: string): boolean {
  return /^\d{17}[\dXx]$/.test(idCard);
}

export function isMedicalNo(no: string): boolean {
  return /^[A-Za-z0-9]{6,20}$/.test(no);
}

export function required(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}
