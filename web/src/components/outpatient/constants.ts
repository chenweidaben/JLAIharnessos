/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 门诊组件共享常量：状态/枚举中文名、颜色映射。
 */
import type {
  QueueStatus,
  VisitType,
  InsuranceType,
  PrescriptionType,
  DrugRoute,
  DrugFrequency,
  OrderKind,
  AISeverity,
} from '@/types/outpatient';

export const queueStatusLabel: Record<QueueStatus, string> = {
  waiting: '待诊',
  in_consult: '就诊中',
  visited: '已诊',
  passed: '过号',
  stopped: '停诊',
};

export const queueStatusColor: Record<QueueStatus, string> = {
  waiting: 'default',
  in_consult: 'processing',
  visited: 'success',
  passed: 'warning',
  stopped: 'error',
};

export const visitTypeLabel: Record<VisitType, string> = {
  normal: '普通',
  expert: '专家',
  emergency: '急诊',
};

export const visitTypeColor: Record<VisitType, string> = {
  normal: 'blue',
  expert: 'geekblue',
  emergency: 'red',
};

export const insuranceLabel: Record<InsuranceType, string> = {
  self: '自费',
  urban_employee: '职工医保',
  urban_resident: '居民医保',
  new_rural: '新农合',
};

export const prescriptionTypeLabel: Record<PrescriptionType, string> = {
  western: '西药',
  chinese_patent: '中成药',
  chinese_herbal: '中草药',
  external: '外用',
};

export const drugRouteLabel: Record<DrugRoute, string> = {
  po: '口服',
  ivgtt: '静脉滴注',
  ivpush: '静脉推注',
  im: '肌肉注射',
  ih: '皮下注射',
  topical: '外用',
  inhalation: '吸入',
  sublingual: '舌下含服',
  rectal: '直肠给药',
};

export const frequencyLabel: Record<DrugFrequency, string> = {
  qd: '每日一次',
  bid: '每日两次',
  tid: '每日三次',
  qid: '每日四次',
  q4h: '每4小时',
  q6h: '每6小时',
  q8h: '每8小时',
  q12h: '每12小时',
  prn: '必要时',
  qod: '隔日一次',
  qn: '每晚一次',
  st: '立即',
};

export const orderKindLabel: Record<OrderKind, string> = {
  lab: '检验',
  imaging: '检查',
  treatment: '治疗',
};

export const severityColor: Record<AISeverity, string> = {
  info: '#1890FF',
  warning: '#FA8C16',
  danger: '#F5222D',
  success: '#52C41A',
};

export const severityLabel: Record<AISeverity, string> = {
  info: '提示',
  warning: '警告',
  danger: '禁忌',
  success: '合规',
};
