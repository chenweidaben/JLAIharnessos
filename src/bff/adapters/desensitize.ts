/**
 * 健澜科技数智医院智能体 - BFF 数据脱敏适配器
 *
 * 在下发前端前对患者敏感字段做脱敏，遵循最小暴露原则。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 姓名脱敏：保留姓氏，其余以 * 代替 */
export function maskName(name: string): string {
  if (!name) return name;
  if (name.length <= 1) return name;
  return name[0] + '*'.repeat(name.length - 1);
}

/** 手机号脱敏：138****1234 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return '****';
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

/** 身份证脱敏：保留前4后4 */
export function maskIdCard(id: string): string {
  if (!id || id.length < 8) return '********';
  return `${id.slice(0, 4)}**********${id.slice(-4)}`;
}

/** 病案号脱敏 */
export function maskMrn(mrn: string): string {
  if (!mrn || mrn.length < 6) return mrn;
  return `${mrn.slice(0, 4)}****${mrn.slice(-2)}`;
}

/** 对患者详情做脱敏（BFF 出参统一调用） */
export function desensitizePatient<T extends Record<string, unknown>>(patient: T): T {
  const out = { ...patient } as Record<string, unknown>;
  if (typeof out.name === 'string') out.name = maskName(out.name);
  if (typeof out.phone === 'string') out.phone = maskPhone(out.phone);
  if (typeof out.idCard === 'string') out.idCard = maskIdCard(out.idCard);
  if (typeof out.mrn === 'string') out.mrn = maskMrn(out.mrn);
  return out as T;
}
