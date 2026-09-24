/**
 * 健澜科技数智医院智能体 - 处方审核工具
 *
 * 工具名：prescription_audit
 * 功能：药师对待审核处方进行通过/驳回/退回操作，记录审核意见
 * 风险等级：medium（需药师身份 + 审核确认）
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import { clinicalData, isDemoMode, sourceTag } from '../../data/clinicalData.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';
import { PRESCRIPTION_STORE } from './drugCatalog.js';

// ============================================================================
// 输入/输出 Schema
// ============================================================================

const PrescriptionAuditInput = z.object({
  prescriptionId: z.string().describe('处方ID'),
  action: z
    .enum(['approve', 'reject', 'return'])
    .describe('审核动作：approve通过 / reject驳回 / return退回修改'),
  auditComment: z.string().optional().describe('审核意见（驳回/退回时建议必填）'),
});

const PrescriptionAuditOutput = z.object({
  success: z.boolean(),
  prescriptionId: z.string(),
  previousStatus: z.string(),
  currentStatus: z.string(),
  action: z.enum(['approve', 'reject', 'return']),
  auditComment: z.string().nullable(),
  auditedBy: z.string(),
  auditedAt: z.string(),
  message: z.string(),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 处方审核
 *
 * 药师对待审核处方执行通过/驳回/退回。仅处于"待审核"状态的处方可被审核；
 * 通过后状态为"已审核"，驳回/退回为"已驳回"/"已退回"。
 *
 * @param input - 处方ID与审核动作
 * @param context - 工具执行上下文
 * @returns 审核结果
 */
async function executePrescriptionAudit(
  input: unknown,
  context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = PrescriptionAuditInput.parse(input);

  // 仅药师可审核处方
  if (context.medicalUser.role !== 'pharmacist') {
    return {
      success: false,
      error: {
        code: 'ROLE_REQUIRED',
        message: '仅药师可审核处方',
        details: { currentRole: context.medicalUser.role },
      },
    };
  }

  // 驳回/退回要求填写审核意见
  if (parsed.action !== 'approve' && !parsed.auditComment?.trim()) {
    return {
      success: false,
      error: {
        code: 'COMMENT_REQUIRED',
        message: '驳回或退回处方时必须填写审核意见',
      },
    };
  }

  // 状态流转结果（中文，与对外契约一致）
  let currentStatus: '已审核' | '已驳回' | '已退回';
  let message: string;
  switch (parsed.action) {
    case 'approve':
      currentStatus = '已审核';
      message = '处方审核通过，可进入发药流程';
      break;
    case 'reject':
      currentStatus = '已驳回';
      message = '处方已驳回，请医生修改后重新提交';
      break;
    case 'return':
      currentStatus = '已退回';
      message = '处方已退回医生修改';
      break;
  }

  const auditedAt = new Date().toISOString();
  let previousStatus: string;

  if (isDemoMode()) {
    // 演示模式：在内存处方存储上做状态流转
    const record = PRESCRIPTION_STORE.find((r) => r.prescriptionId === parsed.prescriptionId);
    if (!record) {
      return {
        success: false,
        error: {
          code: 'PRESCRIPTION_NOT_FOUND',
          message: `处方 ${parsed.prescriptionId} 不存在`,
        },
      };
    }
    if (record.status !== '待审核') {
      return {
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `处方当前状态为"${record.status}"，仅"待审核"处方可审核`,
          details: { prescriptionId: record.prescriptionId, status: record.status },
        },
      };
    }
    previousStatus = record.status;
    record.status = currentStatus;
    record.pharmacist = context.medicalUser.name;
    record.auditedAt = auditedAt;
    record.auditComment = parsed.auditComment ?? null;
  } else {
    // 真实模式：先取处方校验状态，再调 prescriptionRepo.auditPrescription（同事务改状态+写审核记录）
    const record = await clinicalData.getPrescriptionById(parsed.prescriptionId);
    if (!record) {
      return {
        success: false,
        error: {
          code: 'PRESCRIPTION_NOT_FOUND',
          message: `处方 ${parsed.prescriptionId} 不存在`,
        },
      };
    }
    if (record.status !== 'pending_review') {
      return {
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `处方当前状态为"${record.status}"，仅"pending_review"处方可审核`,
          details: { prescriptionId: record.id, status: record.status },
        },
      };
    }
    previousStatus = '待审核';
    const decision: 'approved' | 'rejected' = parsed.action === 'approve' ? 'approved' : 'rejected';
    await clinicalData.auditPrescription(
      parsed.prescriptionId,
      decision,
      context.medicalUser.userId,
      { comment: parsed.auditComment ?? '', reviewer: context.medicalUser.name },
    );
  }

  return {
    success: true,
    data: {
      success: true,
      prescriptionId: parsed.prescriptionId,
      previousStatus,
      currentStatus,
      action: parsed.action,
      auditComment: parsed.auditComment ?? null,
      auditedBy: context.medicalUser.name,
      auditedAt,
      message,
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const prescriptionAuditTool = buildMedicalTool({
  name: 'prescription_audit',
  description:
    '药师对待审核处方进行审核：approve通过（进入发药）、reject驳回、return退回医生修改。仅"待审核"状态可审核，驳回/退回必须填写审核意见。',
  category: MedicalToolCategory.PRESCRIPTION,
  riskLevel: 'medium',
  requiresAuth: true,
  requiresConfirm: true,
  requiredPermissions: ['prescription:audit'],
  requiredRoles: ['pharmacist'],
  inputSchema: PrescriptionAuditInput,
  outputSchema: PrescriptionAuditOutput,
  execute: executePrescriptionAudit,
  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  userFacingName: () => '处方审核',
  getActivityDescription: (input: unknown) => {
    const parsed = PrescriptionAuditInput.safeParse(input);
    if (parsed.success) {
      return `处方审核(${parsed.data.action}): ${parsed.data.prescriptionId}`;
    }
    return '处方审核';
  },
});

export type PrescriptionAuditInputType = z.infer<typeof PrescriptionAuditInput>;
export type PrescriptionAuditOutputType = z.infer<typeof PrescriptionAuditOutput>;
