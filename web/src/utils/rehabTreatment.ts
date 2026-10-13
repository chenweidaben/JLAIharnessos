/**
 * 健澜科技 jlmedaios - 康复治疗展示工具（M51-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { RehabEfficacy, RehabModality, RehabStatus } from '@/types/rehabTreatment';

export const STATUS_LABEL: Record<RehabStatus, string> = {
  prescribed: '已开单',
  signed: '已签到',
  completed: '已完成',
  missed: '漏做',
  cancelled: '已取消',
};

export const STATUS_COLOR: Record<RehabStatus, string> = {
  prescribed: 'orange',
  signed: 'blue',
  completed: 'green',
  missed: 'red',
  cancelled: 'default',
};

export const MODALITY_LABEL: Record<RehabModality, string> = {
  pt: '运动治疗(PT)',
  ot: '作业治疗(OT)',
  st: '言语治疗(ST)',
  physical: '物理治疗',
  cupping: '拔罐',
  traction: '牵引',
};

export const EFFICACY_LABEL: Record<RehabEfficacy, string> = {
  excellent: '显效',
  good: '有效',
  fair: '一般',
  poor: '无效',
};
