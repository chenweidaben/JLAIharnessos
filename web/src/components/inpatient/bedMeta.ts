/**
 * 健澜科技 jlmedaios - 住院床位图共享元数据（四态色块 / 床型 / 病情 / 入院方式）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type {
  AdmissionSource,
  AdmissionType,
  InpatientBedStatus,
  InpatientBedType,
  InpatientCondition,
} from '@/types/inpatient';

/** 床位四态展示元数据（色块 + 文案） */
export const bedStatusMeta: Record<
  InpatientBedStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  available: { label: '空闲', color: '#389E0D', bg: '#F6FFED', border: '#B7EB8F' },
  occupied: { label: '占用', color: '#0958D9', bg: '#E6F4FF', border: '#91CAFF' },
  maintenance: { label: '维护', color: '#8C8C8C', bg: '#FAFAFA', border: '#D9D9D9' },
  isolation: { label: '隔离', color: '#D48806', bg: '#FFFBE6', border: '#FFE58F' },
};

/** 床型文案 */
export const bedTypeMeta: Record<InpatientBedType, string> = {
  standard: '普通床',
  isolation: '隔离床',
  icu: 'ICU床',
  resuscitation: '抢救床',
};

/** 病情分级文案/颜色 */
export const conditionMeta: Record<
  InpatientCondition,
  { label: string; color: string; bg: string }
> = {
  critical: { label: '病危', color: '#CF1322', bg: '#FFF1F0' },
  serious: { label: '病重', color: '#D46B08', bg: '#FFF7E6' },
  stable: { label: '稳定', color: '#389E0D', bg: '#F6FFED' },
};

/** 护理等级文案/颜色 */
export const nursingLevelMeta: Record<string, { label: string; color: string; bg: string }> = {
  special: { label: '特级护理', color: '#CF1322', bg: '#FFF1F0' },
  level1: { label: '一级护理', color: '#D46B08', bg: '#FFF7E6' },
  level2: { label: '二级护理', color: '#D4B106', bg: '#FEFFE6' },
  level3: { label: '三级护理', color: '#389E0D', bg: '#F6FFED' },
};

/** 入院方式文案 */
export const admissionTypeMeta: Record<AdmissionType, string> = {
  elective: '择期入院',
  emergency: '急诊入院',
  transfer: '转入',
};

/** 入院来源文案 */
export const admissionSourceMeta: Record<AdmissionSource, string> = {
  outpatient: '门诊',
  emergency: '急诊',
  transfer: '外院转入',
  other: '其他',
};

/** 性别中文 */
export function genderText(g: string): string {
  if (g === 'male' || g === '男') return '男';
  if (g === 'female' || g === '女') return '女';
  return g;
}
