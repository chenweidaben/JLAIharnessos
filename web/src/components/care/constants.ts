/**
 * 健澜科技 jlmedaios - 在院诊疗 UI 元数据（M1-B2）
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import type {
  AdministrationStatus,
  NursingLevel,
  NursingShift,
  NursingTaskType,
  OrderCategory,
  OrderPriority,
  OrderStatus,
  OrderType,
  RiskLevel,
  WardRoundStatus,
  WardRoundType,
} from '@/types/care';

interface Meta {
  label: string;
  color?: string;
}

export const ROUND_TYPE_META: Record<WardRoundType, Meta> = {
  routine: { label: '日常查房' },
  superior: { label: '上级查房' },
  attending: { label: '主治查房' },
  chief: { label: '主任查房' },
  director: { label: '院总查房' },
};

export const ROUND_STATUS_META: Record<WardRoundStatus, Meta> = {
  draft: { label: '草稿', color: 'default' },
  signed: { label: '已签名', color: 'processing' },
  countersigned: { label: '已审签', color: 'success' },
  returned: { label: '已退回', color: 'error' },
};

export const NURSING_LEVEL_META: Record<NursingLevel, Meta> = {
  special: { label: '特级护理', color: 'red' },
  level1: { label: '一级护理', color: 'volcano' },
  level2: { label: '二级护理', color: 'orange' },
  level3: { label: '三级护理', color: 'blue' },
};

export const RISK_META: Record<RiskLevel, Meta> = {
  none: { label: '无', color: 'default' },
  low: { label: '低危', color: 'blue' },
  medium: { label: '中危', color: 'orange' },
  high: { label: '高危', color: 'red' },
};

export const SHIFT_META: Record<NursingShift, Meta> = {
  day: { label: '白班' },
  night: { label: '夜班' },
};

export const TASK_TYPE_META: Record<NursingTaskType, Meta> = {
  vitals: { label: '生命体征' },
  medication: { label: '用药护理' },
  turning: { label: '翻身拍背' },
  wound_care: { label: '伤口护理' },
  education: { label: '健康教育' },
  observation: { label: '病情观察' },
  other: { label: '其他' },
};

export const TASK_STATUS_META = {
  pending: { label: '待执行', color: 'default' },
  executing: { label: '执行中', color: 'processing' },
  done: { label: '已完成', color: 'success' },
  cancelled: { label: '已取消', color: 'error' },
} as const;

export const ORDER_TYPE_META: Record<OrderType, Meta> = {
  drug: { label: '药品' },
  lab: { label: '检验' },
  imaging: { label: '检查' },
  treatment: { label: '治疗' },
  nursing: { label: '护理' },
  diet: { label: '饮食' },
  other: { label: '其他' },
};

export const ORDER_STATUS_META: Record<OrderStatus, Meta> = {
  pending_review: { label: '待审核', color: 'warning' },
  active: { label: '执行中', color: 'processing' },
  executed: { label: '已执行', color: 'success' },
  stopped: { label: '已停止', color: 'default' },
  cancelled: { label: '已取消', color: 'default' },
  rejected: { label: '已驳回', color: 'error' },
  audited: { label: '已稽核', color: 'purple' },
};

export const ORDER_PRIORITY_META: Record<OrderPriority, Meta> = {
  routine: { label: '常规', color: 'blue' },
  urgent: { label: '加急', color: 'orange' },
  stat: { label: '紧急', color: 'red' },
};

export const ORDER_CATEGORY_META: Record<OrderCategory, Meta> = {
  long_term: { label: '长期医嘱', color: 'geekblue' },
  short_term: { label: '临时医嘱', color: 'gold' },
};

export const ADMIN_STATUS_META: Record<AdministrationStatus, Meta> = {
  administered: { label: '已执行', color: 'success' },
  held: { label: '暂停', color: 'warning' },
  refused: { label: '拒服/拒绝', color: 'error' },
};
