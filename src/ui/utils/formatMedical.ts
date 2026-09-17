/**
 * 健澜科技数智医院智能体 - 医疗数据格式化工具
 *
 * 提供检验结果、日期时间、药品剂量、生命体征等医疗数据的格式化函数。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import type { LabAbnormalFlag, LabResultItem, VitalSign, VitalSigns } from '../types';

// ============================================================================
// 检验结果格式化
// ============================================================================

/**
 * 格式化检验结果，包含异常标记
 * @param item - 检验结果项
 * @returns 格式化后的结果字符串
 */
export function formatLabResult(item: LabResultItem): string {
  const flag = getAbnormalFlagSymbol(item.abnormalFlag);
  const value = item.value;
  return `${value} ${item.unit} ${flag}`.trim();
}

/**
 * 获取异常标记符号
 * @param flag - 异常标记
 * @returns 符号字符串
 */
export function getAbnormalFlagSymbol(flag: LabAbnormalFlag): string {
  switch (flag) {
    case 'high':
      return '↑';
    case 'low':
      return '↓';
    case 'critical-high':
      return '↑↑';
    case 'critical-low':
      return '↓↓';
    default:
      return '';
  }
}

/**
 * 判断检验结果是否异常
 * @param flag - 异常标记
 * @returns 是否异常
 */
export function isAbnormal(flag: LabAbnormalFlag): boolean {
  return flag !== 'normal';
}

/**
 * 判断检验结果是否为危急值
 * @param flag - 异常标记
 * @returns 是否为危急值
 */
export function isCriticalValue(flag: LabAbnormalFlag): boolean {
  return flag === 'critical-high' || flag === 'critical-low';
}

/**
 * 格式化参考范围
 * @param item - 检验结果项
 * @returns 格式化的参考范围
 */
export function formatReferenceRange(item: LabResultItem): string {
  return item.referenceRange || '-';
}

// ============================================================================
// 生命体征格式化
// ============================================================================

/**
 * 格式化单项生命体征
 * @param vital - 生命体征
 * @returns 格式化字符串
 */
export function formatVitalSign(vital: VitalSign): string {
  const trend = getTrendArrow(vital.trend);
  return `${vital.value}${vital.unit} ${trend}`.trim();
}

/**
 * 获取趋势箭头
 * @param trend - 趋势方向
 * @returns 箭头字符
 */
export function getTrendArrow(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up':
      return '↑';
    case 'down':
      return '↓';
    case 'stable':
      return '→';
    default:
      return '';
  }
}

/**
 * 判断生命体征是否异常
 * @param vital - 生命体征
 * @returns 是否异常
 */
export function isVitalAbnormal(vital: VitalSign): boolean {
  return vital.abnormalLevel !== 'normal';
}

/**
 * 判断生命体征是否危急
 * @param vital - 生命体征
 * @returns 是否危急
 */
export function isVitalCritical(vital: VitalSign): boolean {
  return vital.abnormalLevel === 'critical';
}

/**
 * 格式化血压
 * @param systolic - 收缩压
 * @param diastolic - 舒张压
 * @returns 格式化的血压字符串
 */
export function formatBloodPressure(systolic: VitalSign, diastolic: VitalSign): string {
  return `${systolic.value}/${diastolic.value} mmHg`;
}

/**
 * 获取生命体征摘要文本
 * @param vitals - 生命体征集合
 * @returns 摘要字符串
 */
export function getVitalsSummary(vitals: VitalSigns): string {
  const parts = [
    `T${vitals.temperature.value}℃`,
    `P${vitals.pulse.value}次/分`,
    `R${vitals.respiration.value}次/分`,
    `BP${vitals.systolicBP.value}/${vitals.diastolicBP.value}mmHg`,
    `SpO2${vitals.spo2.value}%`,
  ];
  return parts.join(' ');
}

// ============================================================================
// 日期时间格式化
// ============================================================================

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm
 * @param dateStr - 日期字符串或Date对象
 * @returns 格式化字符串
 */
export function formatDateTime(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return dateStr as string;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

/**
 * 格式化日期为 YYYY-MM-DD
 * @param dateStr - 日期字符串
 * @returns 格式化字符串
 */
export function formatDate(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return dateStr as string;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 格式化时间为 HH:mm:ss
 * @param dateStr - 日期字符串
 * @returns 格式化字符串
 */
export function formatTime(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return dateStr as string;
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * 格式化相对时间（如"5分钟前"）
 * @param dateStr - 日期字符串
 * @returns 相对时间字符串
 */
export function formatRelativeTime(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return dateStr as string;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 7) return `${diffDay}天前`;
  return formatDate(date);
}

// ============================================================================
// 药品剂量格式化
// ============================================================================

/**
 * 格式化药品剂量
 * @param dosage - 剂量数值
 * @param unit - 剂量单位
 * @param frequency - 频次
 * @returns 格式化的用药说明
 */
export function formatMedicationDosage(dosage: string, unit: string, frequency?: string): string {
  const base = `${dosage}${unit}`;
  return frequency ? `${base} ${frequency}` : base;
}

/**
 * 格式化给药途径
 * @param route - 给药途径代码
 * @returns 中文给药途径
 */
export function formatAdministrationRoute(route: string): string {
  const routeMap: Record<string, string> = {
    po: '口服',
    iv: '静脉注射',
    ivgtt: '静脉滴注',
    im: '肌肉注射',
    ih: '皮下注射',
    inhal: '吸入',
    topical: '外用',
    sl: '舌下含服',
    pr: '直肠给药',
    ivp: '静脉推注',
  };
  return routeMap[route.toLowerCase()] ?? route;
}

/**
 * 格式化频次
 * @param frequencyCode - 频次代码
 * @returns 中文频次
 */
export function formatFrequency(frequencyCode: string): string {
  const freqMap: Record<string, string> = {
    qd: '每日一次',
    bid: '每日两次',
    tid: '每日三次',
    qid: '每日四次',
    qh: '每小时一次',
    q2h: '每2小时一次',
    q4h: '每4小时一次',
    q6h: '每6小时一次',
    q8h: '每8小时一次',
    q12h: '每12小时一次',
    qn: '每晚一次',
    qod: '隔日一次',
    prn: '必要时',
    st: '立即',
    sos: '需要时',
  };
  return freqMap[frequencyCode.toLowerCase()] ?? frequencyCode;
}

// ============================================================================
// 文本格式化
// ============================================================================

/**
 * 截断文本到指定长度
 * @param text - 原始文本
 * @param maxLength - 最大长度
 * @returns 截断后的文本
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * 脱敏患者姓名
 * @param name - 患者姓名
 * @returns 脱敏后的姓名
 */
export function maskPatientName(name: string): string {
  if (name.length <= 1) return name;
  if (name.length === 2) return name[0] + '*';
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
}

/**
 * 脱敏身份证号
 * @param idCard - 身份证号
 * @returns 脱敏后的身份证号
 */
export function maskIdCard(idCard: string): string {
  if (idCard.length < 8) return idCard;
  return idCard.slice(0, 4) + '*'.repeat(idCard.length - 8) + idCard.slice(-4);
}

/**
 * 脱敏手机号
 * @param phone - 手机号
 * @returns 脱敏后的手机号
 */
export function maskPhone(phone: string): string {
  if (phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

/**
 * 格式化数字，保留指定小数位
 * @param value - 数值
 * @param decimals - 小数位数
 * @returns 格式化字符串
 */
export function formatNumber(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}
