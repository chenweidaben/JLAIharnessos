/**
 * 健澜科技数智医院智能体 - 取消医嘱工具
 *
 * 工具名：cancel_order
 * 功能：取消/停止/更改医嘱。高风险操作，需双重确认；已执行的医嘱不能直接取消
 * 风险等级：high（需要双重确认）
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

const CancelOrderInput = z.object({
  orderId: z.string().describe('医嘱ID'),
  patientId: z.string().describe('患者ID（二次校验）'),
  reason: z.string().min(2, '取消原因不能为空').describe('取消/停止/更改原因'),
  cancelType: z
    .enum(['取消', '停止', '更改'])
    .describe('操作类型：取消（未执行）/停止（执行中）/更改（调整方案）'),
});

const CancelOrderOutput = z.object({
  success: z.boolean(),
  orderId: z.string(),
  orderItemName: z.string(),
  status: z.enum(['已取消', '已停止', '已更改', '取消被阻止', '待上级审核']),
  cancelTime: z.string(),
  cancelledBy: z.string(),
  cancelType: z.string(),
  reason: z.string(),
  auditRequirement: z.object({
    requiresSupervisorReview: z.boolean().describe('是否需上级医师审核'),
    reviewerRole: z.string().describe('要求的审核角色'),
    note: z.string().describe('审核说明'),
  }),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 取消医嘱
 *
 * 高风险操作。已执行/已完成的医嘱不能直接取消，需走更正流程；
 * 高优先级或即刻医嘱的停止需上级医师审核。
 *
 * @param input - 取消请求
 * @param context - 工具执行上下文
 * @returns 取消结果
 */
async function executeCancelOrder(
  input: unknown,
  context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = CancelOrderInput.parse(input);

  // 查找医嘱（演示模式在内存医嘱中查，真实模式走 orderRepo）
  const order = await clinicalData.findOrderDto(parsed.orderId);
  if (!order) {
    return {
      success: false,
      error: {
        code: 'ORDER_NOT_FOUND',
        message: `医嘱 ${parsed.orderId} 不存在`,
      },
    };
  }

  // 患者ID二次校验
  if (order.patientId !== parsed.patientId) {
    return {
      success: false,
      error: {
        code: 'PATIENT_MISMATCH',
        message: `医嘱 ${parsed.orderId} 不属于患者 ${parsed.patientId}，操作被拒绝以防止误取消`,
        details: { orderPatientId: order.patientId },
      },
    };
  }

  // 安全检查：已执行/已完成的医嘱不能直接取消
  if (order.status === '已完成') {
    return {
      success: true,
      data: {
        success: true,
        orderId: parsed.orderId,
        orderItemName: order.itemName,
        status: '取消被阻止',
        cancelTime: new Date().toISOString(),
        cancelledBy: context.medicalUser.name,
        cancelType: parsed.cancelType,
        reason: parsed.reason,
        auditRequirement: {
          requiresSupervisorReview: true,
          reviewerRole: '主任医师/科主任',
          note: `医嘱「${order.itemName}」已执行完成，不可直接取消。如需纠正请走医嘱更正/退费流程，并由主任医师审核。`,
        },
      },
    };
  }

  // 即刻/高优先级医嘱停止需上级审核
  const needsSupervisor = order.priority === '即刻' || order.priority === '急';
  const resultingStatus =
    parsed.cancelType === '取消' ? '已取消' : parsed.cancelType === '停止' ? '已停止' : '已更改';

  // 真实模式：将取消落库（orderRepo.cancelOrder，事务内记录取消原因与时间）。
  // 需上级审核时不直接改库状态，待上级确认；演示模式无持久化。
  if (!needsSupervisor) {
    await clinicalData.cancelOrder(parsed.orderId, parsed.reason);
  }

  return {
    success: true,
    data: {
      success: true,
      orderId: parsed.orderId,
      orderItemName: order.itemName,
      status: needsSupervisor ? '待上级审核' : resultingStatus,
      cancelTime: new Date().toISOString(),
      cancelledBy: context.medicalUser.name,
      cancelType: parsed.cancelType,
      reason: parsed.reason,
      auditRequirement: {
        requiresSupervisorReview: needsSupervisor,
        reviewerRole: needsSupervisor ? '主任医师' : '无需',
        note: needsSupervisor
          ? `该医嘱优先级为「${order.priority}」，停止/取消需主任医师审核确认后生效`
          : `医嘱${parsed.cancelType}成功，操作已记录并同步HIS`,
      },
      _source: sourceTag(),
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const cancelOrderTool = buildMedicalTool({
  name: 'cancel_order',
  description:
    '取消/停止/更改医嘱。高风险操作，需双重确认。自动校验医嘱归属患者；已执行完成的医嘱不能直接取消（走更正流程）；即刻/紧急医嘱的停止需上级医师审核。返回医嘱状态、取消时间、操作人与审核要求。',
  category: MedicalToolCategory.ORDER,
  riskLevel: 'high',
  requiresAuth: true,
  requiresConfirm: true,
  requiresDoubleConfirm: true,
  requiredPermissions: ['order:cancel'],
  requiredRoles: ['doctor'],
  inputSchema: CancelOrderInput,
  outputSchema: CancelOrderOutput,
  execute: executeCancelOrder,
  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  isDestructive: () => true,
  userFacingName: () => '取消医嘱',
  getActivityDescription: (input: unknown) => {
    const parsed = CancelOrderInput.safeParse(input);
    if (parsed.success) {
      return `${parsed.data.cancelType}医嘱 ${parsed.data.orderId}: ${parsed.data.reason.slice(0, 20)}`;
    }
    return '取消医嘱';
  },
});

export type CancelOrderInputType = z.infer<typeof CancelOrderInput>;
export type CancelOrderOutputType = z.infer<typeof CancelOrderOutput>;
