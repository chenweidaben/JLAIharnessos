/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 急诊分诊场景 - 共享展示常量与工具
 */
import type {
  TriageLevel,
  TriageStatus,
  GreenChannelType,
  ObsStatus,
  ResusStatus,
} from '@/types/emergency';

/** 分诊级别展示配置（红/橙/黄/绿） */
export const LEVEL_META: Record<
  TriageLevel,
  {
    label: string;
    short: string;
    color: string;
    bg: string;
    border: string;
    targetWait: number;
    desc: string;
  }
> = {
  1: {
    label: 'Ⅰ级 濒危',
    short: 'Ⅰ',
    color: '#F5222D',
    bg: 'rgba(245,34,45,0.12)',
    border: '#F5222D',
    targetWait: 0,
    desc: '立即抢救，如心搏骤停、休克、昏迷、严重创伤、大咯血',
  },
  2: {
    label: 'Ⅱ级 危重',
    short: 'Ⅱ',
    color: '#FA8C16',
    bg: 'rgba(250,140,22,0.12)',
    border: '#FA8C16',
    targetWait: 10,
    desc: '10分钟内就诊，如胸痛、呼吸困难、意识改变、严重过敏',
  },
  3: {
    label: 'Ⅲ级 急症',
    short: 'Ⅲ',
    color: '#FAAD14',
    bg: 'rgba(250,173,20,0.14)',
    border: '#FAAD14',
    targetWait: 30,
    desc: '30分钟内就诊，如高热、呕吐、腹痛、轻度外伤',
  },
  4: {
    label: 'Ⅳ级 非急症',
    short: 'Ⅳ',
    color: '#52C41A',
    bg: 'rgba(82,196,26,0.12)',
    border: '#52C41A',
    targetWait: 120,
    desc: '120分钟内就诊，如感冒、轻微外伤、慢性病复诊',
  },
};

/** 分诊状态展示 */
export const STATUS_META: Record<TriageStatus, { label: string; color: string }> = {
  waiting_triage: { label: '待分诊', color: '#8C8C8C' },
  triaged: { label: '候诊', color: '#1890FF' },
  in_treatment: { label: '就诊中', color: '#0A4D8C' },
  resuscitation: { label: '抢救', color: '#F5222D' },
  observation: { label: '留观', color: '#13C2C2' },
  discharged: { label: '离院', color: '#52C41A' },
};

/** 绿色通道类型展示 */
export const GC_TYPE_META: Record<GreenChannelType, { label: string; color: string }> = {
  chest_pain: { label: '胸痛中心', color: '#F5222D' },
  stroke: { label: '卒中中心', color: '#722ED1' },
  trauma: { label: '创伤中心', color: '#FA8C16' },
  maternal: { label: '孕产妇通道', color: '#EB2F96' },
  neonatal: { label: '新生儿通道', color: '#13C2C2' },
};

/** 留观状态展示 */
export const OBS_STATUS_META: Record<ObsStatus, { label: string; color: string }> = {
  stable: { label: '病情稳定', color: '#52C41A' },
  observing: { label: '观察中', color: '#1890FF' },
  worsening: { label: '病情加重', color: '#F5222D' },
  discharged: { label: '已离院', color: '#8C8C8C' },
  admitted: { label: '已入院', color: '#0A4D8C' },
};

/** 抢救床位状态展示 */
export const RESUS_STATUS_META: Record<ResusStatus, { label: string; color: string }> = {
  resuscitating: { label: '抢救中', color: '#F5222D' },
  stabilized: { label: '已稳定', color: '#52C41A' },
  transferred_icu: { label: '已转ICU', color: '#1890FF' },
  deceased: { label: '已死亡', color: '#262626' },
  empty: { label: '空床', color: '#BFBFBF' },
};

/** 判断生命体征是否异常（用于红色高亮） */
export function isVitalAbnormal(key: string, value: number | undefined): boolean {
  if (value == null) return false;
  switch (key) {
    case 'temperature':
      return value >= 38.5 || value < 36;
    case 'pulse':
      return value > 110 || value < 55;
    case 'respiration':
      return value > 24 || value < 10;
    case 'spo2':
      return value < 94;
    case 'systolic':
      return value > 160 || value < 90;
    case 'diastolic':
      return value > 100 || value < 60;
    default:
      return false;
  }
}
