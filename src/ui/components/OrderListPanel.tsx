/**
 * 健澜科技数智医院智能体 - 医嘱列表面板
 *
 * 展示医嘱列表，包含状态标签、优先级标记，
 * 支持按状态筛选和长期/临时医嘱分类。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text } from 'ink';
import React, { useState } from 'react';

import { useThemeColors } from '../theme';
import type { OrderItem, OrderStatus, OrderType } from '../types';
import { formatDateTime } from '../utils/formatMedical';

// ============================================================================
// Mock 数据
// ============================================================================

/** 默认Mock医嘱数据 */
export const mockOrders: OrderItem[] = [
  {
    orderId: 'ORD20260914001',
    content: '阿司匹林肠溶片 100mg 口服 每日一次',
    type: '长期医嘱',
    status: 'executing',
    priority: '常规',
    orderedAt: '2026-09-12T09:00:00',
    orderedBy: '李建国 主任医师',
    frequency: 'qd',
    dosage: '100mg',
  },
  {
    orderId: 'ORD20260914002',
    content: '阿托伐他汀钙片 20mg 口服 每晚一次',
    type: '长期医嘱',
    status: 'executing',
    priority: '常规',
    orderedAt: '2026-09-12T09:00:00',
    orderedBy: '李建国 主任医师',
    frequency: 'qn',
    dosage: '20mg',
  },
  {
    orderId: 'ORD20260914003',
    content: '硝酸甘油注射液 5mg + 0.9%氯化钠注射液 250mL 静脉滴注 立即',
    type: '临时医嘱',
    status: 'completed',
    priority: '立即',
    orderedAt: '2026-09-14T08:30:00',
    orderedBy: '李建国 主任医师',
    executedAt: '2026-09-14T08:35:00',
    frequency: 'st',
    dosage: '5mg',
  },
  {
    orderId: 'ORD20260914004',
    content: '急诊心肌酶谱（肌钙蛋白I、CK-MB、肌红蛋白）',
    type: '临时医嘱',
    status: 'completed',
    priority: '紧急',
    orderedAt: '2026-09-14T06:00:00',
    orderedBy: '王芳 主治医师',
    executedAt: '2026-09-14T06:15:00',
  },
  {
    orderId: 'ORD20260914005',
    content: '12导联心电图检查',
    type: '临时医嘱',
    status: 'completed',
    priority: '紧急',
    orderedAt: '2026-09-14T06:05:00',
    orderedBy: '王芳 主治医师',
    executedAt: '2026-09-14T06:10:00',
  },
  {
    orderId: 'ORD20260914006',
    content: '心脏彩超检查',
    type: '临时医嘱',
    status: 'pending',
    priority: '常规',
    orderedAt: '2026-09-14T09:00:00',
    orderedBy: '李建国 主任医师',
  },
  {
    orderId: 'ORD20260914007',
    content: '冠状动脉CTA检查',
    type: '临时医嘱',
    status: 'pending',
    priority: '常规',
    orderedAt: '2026-09-14T09:00:00',
    orderedBy: '李建国 主任医师',
  },
  {
    orderId: 'ORD20260914008',
    content: '低盐低脂饮食',
    type: '长期医嘱',
    status: 'executing',
    priority: '常规',
    orderedAt: '2026-09-12T09:00:00',
    orderedBy: '李建国 主任医师',
  },
  {
    orderId: 'ORD20260914009',
    content: '持续心电监护',
    type: '长期医嘱',
    status: 'executing',
    priority: '紧急',
    orderedAt: '2026-09-14T06:00:00',
    orderedBy: '王芳 主治医师',
  },
  {
    orderId: 'ORD20260914010',
    content: '呋塞米注射液 20mg 静脉推注 立即',
    type: '临时医嘱',
    status: 'discontinued',
    priority: '立即',
    orderedAt: '2026-09-13T22:00:00',
    orderedBy: '张伟 住院医师',
    discontinuedAt: '2026-09-13T22:30:00',
  },
];

// ============================================================================
// 状态/类型映射
// ============================================================================

const orderStatusMap: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: '待审核', color: 'orderPending' },
  executing: { label: '执行中', color: 'orderExecuting' },
  completed: { label: '已完成', color: 'orderCompleted' },
  discontinued: { label: '已停用', color: 'orderDiscontinued' },
};

const orderTypeFilter: ('全部' | OrderType)[] = ['全部', '长期医嘱', '临时医嘱'];
const orderStatusFilter: ('全部' | OrderStatus)[] = [
  '全部',
  'pending',
  'executing',
  'completed',
  'discontinued',
];

// ============================================================================
// 组件 Props
// ============================================================================

/** OrderListPanel 属性 */
export interface OrderListPanelProps {
  /** 医嘱数据，默认使用Mock数据 */
  orders?: OrderItem[];
  /** 面板标题 */
  title?: string;
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 医嘱列表面板组件
 *
 * 展示患者的医嘱列表，包含医嘱内容、类型、状态、优先级、
 * 开嘱时间和医生信息。支持按类型和状态筛选。
 *
 * @example
 * ```tsx
 * <OrderListPanel orders={patientOrders} />
 * ```
 */
export function OrderListPanel({
  orders = mockOrders,
  title = '医嘱列表',
}: OrderListPanelProps): React.ReactElement {
  const theme = useThemeColors();
  const [typeFilter, setTypeFilter] = useState<'全部' | OrderType>('全部');
  const [statusFilter, setStatusFilter] = useState<'全部' | OrderStatus>('全部');

  // 筛选
  const filteredOrders = orders.filter((o) => {
    const typeMatch = typeFilter === '全部' || o.type === typeFilter;
    const statusMatch = statusFilter === '全部' || o.status === statusFilter;
    return typeMatch && statusMatch;
  });

  // 统计
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const statCount = orders.filter((o) => o.priority === '立即' || o.priority === '紧急').length;

  function getStatusColor(status: OrderStatus): string {
    const map: Record<OrderStatus, string> = {
      pending: theme.orderPending,
      executing: theme.orderExecuting,
      completed: theme.orderCompleted,
      discontinued: theme.orderDiscontinued,
    };
    return map[status];
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.border}
      paddingX={1}
      paddingY={0}
    >
      {/* 标题行 */}
      <Box flexDirection="row" alignItems="center" gap={1}>
        <Text color={theme.jianlan} bold>
          📋
        </Text>
        <Text color={theme.text} bold>
          {title}
        </Text>
        {pendingCount > 0 && (
          <Text color={theme.orderPending} bold>
            ({pendingCount}项待审核)
          </Text>
        )}
        {statCount > 0 && (
          <Text color={theme.orderStat} bold>
            [{statCount}项紧急]
          </Text>
        )}
      </Box>

      {/* 筛选标签 */}
      <Box flexDirection="row" gap={1} marginTop={0}>
        <Text color={theme.subtle}>类型:</Text>
        {orderTypeFilter.map((t) => (
          <Box key={t}>
            <Text
              color={typeFilter === t ? theme.tabActive : theme.inactive}
              bold={typeFilter === t}
            >
              [{t}]
            </Text>
          </Box>
        ))}
        <Box marginLeft={1}>
          <Text color={theme.subtle}>状态:</Text>
        </Box>
        {orderStatusFilter.map((s) => (
          <Box key={s}>
            <Text
              color={statusFilter === s ? theme.tabActive : theme.inactive}
              bold={statusFilter === s}
            >
              [{s === '全部' ? '全部' : orderStatusMap[s].label}]
            </Text>
          </Box>
        ))}
      </Box>

      {/* 表头 */}
      <Box flexDirection="row" gap={1} marginTop={0}>
        <Box width={6}>
          <Text color={theme.inactive} bold>
            类型
          </Text>
        </Box>
        <Box width={36}>
          <Text color={theme.inactive} bold>
            医嘱内容
          </Text>
        </Box>
        <Box width={8}>
          <Text color={theme.inactive} bold>
            优先级
          </Text>
        </Box>
        <Box width={8}>
          <Text color={theme.inactive} bold>
            状态
          </Text>
        </Box>
        <Box width={14}>
          <Text color={theme.inactive} bold>
            开嘱时间
          </Text>
        </Box>
        <Box width={14}>
          <Text color={theme.inactive} bold>
            开嘱医生
          </Text>
        </Box>
      </Box>

      {/* 分隔线 */}
      <Box>
        <Text color={theme.divider}>
          ────────────────────────────────────────────────────────────────────────
        </Text>
      </Box>

      {/* 数据行 */}
      {filteredOrders.slice(0, 10).map((order) => {
        const isStat = order.priority === '立即' || order.priority === '紧急';
        return (
          <Box key={order.orderId} flexDirection="row" gap={1}>
            <Box width={6}>
              <Text color={order.type === '长期医嘱' ? theme.assistant : theme.alertInfo}>
                {order.type === '长期医嘱' ? '长期' : '临时'}
              </Text>
            </Box>
            <Box width={36}>
              <Text color={theme.text}>{order.content}</Text>
            </Box>
            <Box width={8}>
              <Text color={isStat ? theme.orderStat : theme.subtle} bold={isStat}>
                {order.priority}
              </Text>
            </Box>
            <Box width={8}>
              <Text color={getStatusColor(order.status)} bold>
                {orderStatusMap[order.status].label}
              </Text>
            </Box>
            <Box width={14}>
              <Text color={theme.inactive}>{formatDateTime(order.orderedAt)}</Text>
            </Box>
            <Box width={14}>
              <Text color={theme.subtle}>{order.orderedBy}</Text>
            </Box>
          </Box>
        );
      })}

      {/* 底部统计 */}
      <Box flexDirection="row" justifyContent="space-between" marginTop={0}>
        <Text color={theme.inactive}>
          显示 {Math.min(filteredOrders.length, 10)}/{filteredOrders.length} 条
        </Text>
        <Text color={theme.subtle}>
          长期 {orders.filter((o) => o.type === '长期医嘱').length} | 临时{' '}
          {orders.filter((o) => o.type === '临时医嘱').length}
        </Text>
      </Box>
    </Box>
  );
}
