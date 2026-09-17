/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 住院查房组件 - 共享医疗元数据（标签/颜色/文案）
 */
import type {
  ConditionLevel,
  IsolationType,
  NursingLevel,
  OrderStatus,
  OrderCategory,
} from '@/types/ward';

export const nursingLevelMeta: Record<NursingLevel, { label: string; color: string; bg: string }> =
  {
    special: { label: '特级', color: '#F5222D', bg: '#FFF1F0' },
    level1: { label: '一级', color: '#FA541C', bg: '#FFF2E8' },
    level2: { label: '二级', color: '#FAAD14', bg: '#FFFBE6' },
    level3: { label: '三级', color: '#52C41A', bg: '#F6FFED' },
  };

export const conditionMeta: Record<ConditionLevel, { label: string; color: string; icon: string }> =
  {
    normal: { label: '普通', color: '#52C41A', icon: '●' },
    serious: { label: '病重', color: '#FA8C16', icon: '▲' },
    critical: { label: '病危', color: '#F5222D', icon: '★' },
  };

export const isolationMeta: Record<IsolationType, { label: string; color: string }> = {
  contact: { label: '接触隔离', color: '#722ED1' },
  airborne: { label: '空气隔离', color: '#13C2C2' },
  droplet: { label: '飞沫隔离', color: '#2F54EB' },
};

export const orderStatusMeta: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: '待执行', color: '#FAAD14' },
  executing: { label: '执行中', color: '#1890FF' },
  executed: { label: '已执行', color: '#52C41A' },
  stopped: { label: '已停止', color: '#8C8C8C' },
  reviewing: { label: '审核中', color: '#722ED1' },
};

export const orderCategoryMeta: Record<OrderCategory, string> = {
  permanent: '长期医嘱',
  temporary: '临时医嘱',
};

export const dietOptions = [
  '低盐低脂饮食',
  '低盐限水饮食',
  '糖尿病饮食',
  '半流质饮食',
  '普食',
  '禁食',
];
