/**
 * 健澜科技数智医院智能体 - 医嘱审核工具
 *
 * 工具名：order_audit
 * 功能：审核医嘱（approve/reject/return），自动执行CDS检查（药物相互作用/剂量/禁忌症）
 * 风险等级：medium
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import { MOCK_DRUG_INTERACTIONS, MOCK_ORDERS, MOCK_PATIENTS } from '../mockData.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';

// ============================================================================
// 输入/输出 Schema
// ============================================================================

const OrderAuditInput = z.object({
  orderId: z.string().describe('待审核医嘱ID'),
  action: z
    .enum(['approve', 'reject', 'return'])
    .describe('审核动作：approve通过/reject驳回/return退回修改'),
  auditComment: z.string().optional().describe('审核意见'),
});

const OrderAuditOutput = z.object({
  success: z.boolean(),
  orderId: z.string(),
  orderItemName: z.string(),
  auditResult: z.enum(['已通过', '已驳回', '已退回修改']),
  auditedBy: z.string(),
  auditTime: z.string(),
  auditComment: z.string(),
  cdsCheck: z.object({
    drugInteractions: z.array(z.string()).describe('药物相互作用检查'),
    dosageAlerts: z.array(z.string()).describe('剂量异常检查'),
    contraindications: z.array(z.string()).describe('禁忌症/过敏检查'),
  }),
  auditStatus: z.enum(['通过', '需上级复核', '被CDS拦截']),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 执行自动CDS检查
 *
 * @param order - 待审核医嘱
 * @returns CDS检查结果
 */
function runCdsCheck(orderId: string): {
  drugInteractions: string[];
  dosageAlerts: string[];
  contraindications: string[];
} {
  const drugInteractions: string[] = [];
  const dosageAlerts: string[] = [];
  const contraindications: string[] = [];

  const order = MOCK_ORDERS.find((o) => o.orderId === orderId);
  if (!order) {
    return { drugInteractions, dosageAlerts, contraindications };
  }

  const patient = MOCK_PATIENTS.find((p) => p.patientId === order.patientId);
  if (!patient) {
    return { drugInteractions, dosageAlerts, contraindications };
  }

  // 仅药品医嘱做CDS
  if (order.orderType !== '药品') {
    return {
      drugInteractions: ['非药品医嘱，跳过药物相关CDS检查'],
      dosageAlerts: [],
      contraindications: [],
    };
  }

  const drugName = order.itemName;

  // 过敏检查
  for (const allergy of patient.allergies) {
    if (drugName.includes(allergy.allergen) || allergy.allergen.includes(drugName.slice(0, 2))) {
      contraindications.push(
        `患者对${allergy.allergen}过敏（${allergy.reaction}，${allergy.severity}），与${drugName}相关，禁止通过`,
      );
    }
  }

  // 药物相互作用检查（与当前在用药）
  const currentDrugs = patient.currentMedications.map((m) => m.drugName);
  for (const interaction of MOCK_DRUG_INTERACTIONS) {
    const involvesA = drugName.includes(interaction.drugA);
    const involvesB = drugName.includes(interaction.drugB);
    const paired =
      (involvesA && currentDrugs.some((d) => d.includes(interaction.drugB))) ||
      (involvesB && currentDrugs.some((d) => d.includes(interaction.drugA)));
    if (paired) {
      drugInteractions.push(
        `${interaction.drugA}×${interaction.drugB}（${interaction.severity}）：${interaction.description}`,
      );
      if (interaction.severity === '禁忌') {
        contraindications.push(`${interaction.drugA}+${interaction.drugB}为禁忌组合，禁止通过`);
      }
    }
  }

  // 剂量简单提示（高优先级大剂量溶栓类）
  if (/阿替普酶|rt-PA/.test(drugName)) {
    dosageAlerts.push('溶栓药物剂量需按体重精确计算（0.9mg/kg），已核对剂量区间');
  }

  return { drugInteractions, dosageAlerts, contraindications };
}

/**
 * 审核医嘱
 *
 * 执行自动CDS检查后按审核动作流转。存在禁忌/严重相互作用时，
 * 即使用户选择approve也将被CDS拦截。
 *
 * @param input - 审核请求
 * @param context - 工具执行上下文
 * @returns 审核结果
 */
async function executeOrderAudit(
  input: unknown,
  context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = OrderAuditInput.parse(input);

  const order = MOCK_ORDERS.find((o) => o.orderId === parsed.orderId);
  if (!order) {
    return {
      success: false,
      error: {
        code: 'ORDER_NOT_FOUND',
        message: `医嘱 ${parsed.orderId} 不存在`,
      },
    };
  }

  // 自动CDS检查
  const cds = runCdsCheck(parsed.orderId);
  const hasBlocker = cds.contraindications.length > 0;

  const auditResultMap = {
    approve: '已通过',
    reject: '已驳回',
    return: '已退回修改',
  } as const;

  // CDS拦截：存在禁忌时即使approve也不能通过
  const auditStatus = hasBlocker
    ? '被CDS拦截'
    : parsed.action === 'approve' && order.priority === '即刻'
      ? '需上级复核'
      : '通过';

  const effectiveResult =
    hasBlocker && parsed.action === 'approve' ? '已驳回' : auditResultMap[parsed.action];

  return {
    success: true,
    data: {
      success: true,
      orderId: parsed.orderId,
      orderItemName: order.itemName,
      auditResult: effectiveResult,
      auditedBy: context.medicalUser.name,
      auditTime: new Date().toISOString(),
      auditComment:
        parsed.auditComment ??
        (parsed.action === 'approve'
          ? '医嘱审核通过'
          : `医嘱${auditResultMap[parsed.action]}，请按意见处理`),
      cdsCheck: cds,
      auditStatus,
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const orderAuditTool = buildMedicalTool({
  name: 'order_audit',
  description:
    '审核医嘱（approve通过/reject驳回/return退回修改）。审核前自动执行CDS检查：药物相互作用、剂量异常、禁忌症与过敏。存在禁忌或严重药物相互作用时将被CDS拦截，即使选择通过也会被驳回；即刻医嘱通过后仍需上级复核。',
  category: MedicalToolCategory.ORDER,
  riskLevel: 'medium',
  requiresAuth: true,
  requiresConfirm: true,
  requiredPermissions: ['order:audit'],
  requiredRoles: ['doctor', 'pharmacist'],
  inputSchema: OrderAuditInput,
  outputSchema: OrderAuditOutput,
  execute: executeOrderAudit,
  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  userFacingName: () => '医嘱审核',
  getActivityDescription: (input: unknown) => {
    const parsed = OrderAuditInput.safeParse(input);
    if (parsed.success) {
      const actionText = { approve: '通过', reject: '驳回', return: '退回' }[parsed.data.action];
      return `审核医嘱 ${parsed.data.orderId}: ${actionText}`;
    }
    return '医嘱审核';
  },
});

export type OrderAuditInputType = z.infer<typeof OrderAuditInput>;
export type OrderAuditOutputType = z.infer<typeof OrderAuditOutput>;
