/**
 * 健澜科技数智医院智能体 - 查询医嘱列表工具
 *
 * 工具名：get_order_list
 * 功能：查询患者当前或历史医嘱列表，支持按状态、类型、时间筛选
 * 风险等级：low
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import { clinicalData, sourceTag } from '../../data/clinicalData.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';

// ============================================================================
// 输入/输出 Schema
// ============================================================================

const GetOrderListInput = z.object({
  patientId: z.string().describe('患者ID（必填）'),
  encounterId: z.string().optional().describe('就诊ID'),
  status: z
    .enum(['全部', '待审核', '已开立', '执行中', '已完成', '已取消', '已驳回'])
    .default('全部')
    .describe('医嘱状态筛选'),
  orderType: z.string().optional().describe('医嘱类型（药品/检查/检验/治疗/护理/手术等）'),
  startDate: z.string().optional().describe('开始日期（YYYY-MM-DD）'),
  endDate: z.string().optional().describe('结束日期（YYYY-MM-DD）'),
});

const GetOrderListOutput = z.object({
  success: z.boolean(),
  total: z.number(),
  orders: z.array(
    z.object({
      orderId: z.string(),
      orderType: z.string(),
      itemName: z.string(),
      dosage: z.string().nullable(),
      frequency: z.string().nullable(),
      status: z.string(),
      priority: z.string(),
      startDate: z.string(),
      endDate: z.string().nullable(),
      prescribingDoctor: z.string(),
      executedBy: z.string().nullable(),
      clinicalIndication: z.string(),
    }),
  ),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 查询医嘱列表
 *
 * 查询患者当前或历史医嘱，支持多维度筛选。
 *
 * @param input - 查询参数
 * @param context - 工具执行上下文
 * @returns 医嘱列表
 */
async function executeGetOrderList(
  input: unknown,
  _context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = GetOrderListInput.parse(input);

  // 数据源：演示模式走 MOCK_ORDERS+内存新建；真实模式走 orderRepo。
  // encounterId 已在数据层过滤，此处仅做状态/类型/时间维度筛选。
  let results = (await clinicalData.getOrders(parsed.patientId, parsed.encounterId)).slice();

  if (parsed.status && parsed.status !== '全部') {
    results = results.filter((o) => o.status === parsed.status);
  }

  if (parsed.orderType) {
    results = results.filter((o) => o.orderType === parsed.orderType);
  }

  if (parsed.startDate) {
    results = results.filter((o) => o.startDate >= parsed.startDate!);
  }
  if (parsed.endDate) {
    results = results.filter((o) => (o.endDate ?? o.startDate) <= parsed.endDate!);
  }

  // 按开始日期倒序
  results.sort((a, b) => b.startDate.localeCompare(a.startDate));

  return {
    success: true,
    data: {
      success: true,
      total: results.length,
      orders: results.map((o) => ({
        orderId: o.orderId,
        orderType: o.orderType,
        itemName: o.itemName,
        dosage: o.dosage,
        frequency: o.frequency,
        status: o.status,
        priority: o.priority,
        startDate: o.startDate,
        endDate: o.endDate,
        prescribingDoctor: o.prescribingDoctor,
        executedBy: o.executedBy,
        clinicalIndication: o.clinicalIndication,
      })),
      _source: sourceTag(),
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const getOrderListTool = buildMedicalTool({
  name: 'get_order_list',
  description:
    '查询患者医嘱列表，支持按就诊ID、状态（待审核/已开立/执行中/已完成/已取消/已驳回）、医嘱类型（药品/检查/检验/治疗/护理等）、时间范围筛选。',
  category: MedicalToolCategory.ORDER,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: ['order:read'],
  inputSchema: GetOrderListInput,
  outputSchema: GetOrderListOutput,
  execute: executeGetOrderList,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  userFacingName: () => '医嘱列表',
  getActivityDescription: (input: unknown) => {
    const parsed = GetOrderListInput.safeParse(input);
    return parsed.success ? `查询医嘱: 患者${parsed.data.patientId}` : '查询医嘱';
  },
});

export type GetOrderListInputType = z.infer<typeof GetOrderListInput>;
export type GetOrderListOutputType = z.infer<typeof GetOrderListOutput>;
