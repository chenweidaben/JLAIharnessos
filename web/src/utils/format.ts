/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 格式化工具：日期时间 / 数字 / 百分比 / 医疗数据
 */
import dayjs from 'dayjs';

export function formatDate(date: string | number | Date): string {
  return dayjs(date).format('YYYY-MM-DD');
}

export function formatDateTime(date: string | number | Date): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
}

export function formatTime(date: string | number | Date): string {
  return dayjs(date).format('HH:mm:ss');
}

export function formatRelative(date: string | number | Date): string {
  const diff = dayjs().diff(dayjs(date), 'minute');
  if (diff < 1) return '刚刚';
  if (diff < 60) return `${diff}分钟前`;
  if (diff < 60 * 24) return `${Math.floor(diff / 60)}小时前`;
  return formatDate(date);
}

export function formatNumber(n: number | string): string {
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return num.toLocaleString('zh-CN');
}

export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatMedicalValue(value: number | undefined, unit?: string, digits = 1): string {
  if (value == null || Number.isNaN(value)) return '--';
  const v = value.toFixed(digits);
  return unit ? `${v} ${unit}` : v;
}

export function formatBloodPressure(systolic?: number, diastolic?: number): string {
  if (systolic == null || diastolic == null) return '--';
  return `${systolic}/${diastolic} mmHg`;
}
