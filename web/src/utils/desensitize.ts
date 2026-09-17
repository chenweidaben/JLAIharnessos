/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 医疗数据脱敏工具
 */
export function maskName(name: string): string {
  if (!name) return '';
  if (name.length === 1) return name;
  if (name.length === 2) return name[0] + '*';
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
}

export function maskIdCard(idCard: string): string {
  if (!idCard) return '';
  if (idCard.length <= 2) return idCard[0] + '*';
  return idCard[0] + '*'.repeat(idCard.length - 2) + idCard[idCard.length - 1];
}

export function maskPhone(phone: string): string {
  if (!phone) return '';
  if (phone.length !== 11) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(7);
}

export function maskMedicalNo(no: string): string {
  if (!no) return '';
  if (no.length <= 4) return '*'.repeat(no.length);
  return '*'.repeat(no.length - 4) + no.slice(-4);
}
