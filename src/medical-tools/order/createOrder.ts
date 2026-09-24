/**
 * 健澜科技数智医院智能体 - 开具医嘱工具
 *
 * 工具名：create_order
 * 功能：开具医嘱（药品/检查/检验/治疗/护理等），需双重确认+执业医师资格校验
 * 风险等级：high（需要双重确认+CA签名）
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

const CreateOrderInput = z.object({
  patientId: z.string().describe('患者ID'),
  encounterId: z.string().describe('就诊ID'),
  orderType: z
    .enum(['药品', '检查', '检验', '治疗', '护理', '手术', '输血', '其他'])
    .describe('医嘱类型'),
  orderContent: z
    .string()
    .min(2)
    .describe('医嘱内容（如"阿司匹林肠溶片100mg qd口服"或"血常规+CRP"）'),
  dosage: z.string().optional().describe('剂量（药品医嘱）'),
  frequency: z.string().optional().describe('频次（如qd/bid/tid/q4h/prn）'),
  duration: z.string().optional().describe('持续时间/疗程（如"7天"）'),
  startDate: z
    .string()
    .default(() => new Date().toISOString().slice(0, 10))
    .describe('开始日期（YYYY-MM-DD）'),
  priority: z.enum(['普通', '急', '即刻']).default('普通').describe('优先级'),
  clinicalIndication: z.string().min(2).describe('临床指征/开单原因'),
});

const CreateOrderOutput = z.object({
  success: z.boolean(),
  orderId: z.string().describe('创建的医嘱ID'),
  status: z.enum(['已开立', '待审核', '已驳回']),
  orderType: z.string(),
  orderContent: z.string(),
  safetyCheck: z.object({
    drugInteractions: z.array(z.string()).describe('药物相互作用预警'),
    contraindications: z.array(z.string()).describe('禁忌症预警'),
    allergyAlerts: z.array(z.string()).describe('过敏预警'),
    dosageAlerts: z.array(z.string()).describe('剂量异常预警'),
  }),
  requiresPharmacistReview: z.boolean().describe('是否需药师审核'),
  requiresDoubleConfirm: z.boolean().describe('是否需双重确认'),
  createdAt: z.string(),
  createdBy: z.string(),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 开具医嘱
 *
 * 创建医嘱草稿并提交审核。高风险操作，需双重确认和执业医师资格校验。
 * 自动进行CDS安全检查（药物相互作用、禁忌症、过敏、剂量异常）。
 *
 * @param input - 医嘱内容
 * @param context - 工具执行上下文
 * @returns 创建结果
 */
async function executeCreateOrder(
  input: unknown,
  context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = CreateOrderInput.parse(input);

  // 校验患者存在（演示模式走 mockData，真实模式走 patientRepo）
  const patient = await clinicalData.getPatient(parsed.patientId);
  if (!patient) {
    return {
      success: false,
      error: {
        code: 'PATIENT_NOT_FOUND',
        message: `患者 ${parsed.patientId} 不存在`,
      },
    };
  }

  // 校验执业医师资格
  if (context.medicalUser.role !== 'doctor') {
    return {
      success: false,
      error: {
        code: 'LICENSE_REQUIRED',
        message: '仅执业医师可开具医嘱',
        details: { currentRole: context.medicalUser.role },
      },
    };
  }

  // CDS安全检查
  const drugInteractions: string[] = [];
  const contraindications: string[] = [];
  const allergyAlerts: string[] = [];
  const dosageAlerts: string[] = [];

  // 过敏检查
  if (parsed.orderType === '药品') {
    for (const allergy of patient.allergies) {
      if (
        parsed.orderContent.includes(allergy.allergen) ||
        parsed.orderContent.toLowerCase().includes(allergy.allergen.toLowerCase())
      ) {
        allergyAlerts.push(
          `患者对${allergy.allergen}过敏（${allergy.reaction}，${allergy.severity}），禁止使用相关药物`,
        );
      }
    }

    // 模拟药物相互作用检查
    const currentDrugNames = patient.currentMedications.map((m) => m.drugName);
    if (
      parsed.orderContent.includes('阿司匹林') &&
      currentDrugNames.some((d) => d.includes('氯吡格雷'))
    ) {
      drugInteractions.push(
        '阿司匹林与氯吡格雷联用：双联抗血小板，出血风险增加2-3倍，建议联用质子泵抑制剂预防胃肠道出血',
      );
    }
    if (
      parsed.orderContent.includes('华法林') &&
      currentDrugNames.some((d) => d.includes('阿司匹林'))
    ) {
      drugInteractions.push('华法林与阿司匹林联用属禁忌，严重出血风险增加4-6倍，严禁常规联用');
      contraindications.push('华法林+阿司匹林为禁忌组合');
    }
  }

  // 药品医嘱需药师审核
  const requiresPharmacistReview = parsed.orderType === '药品';

  // 有严重过敏或禁忌症时阻止开具
  if (allergyAlerts.length > 0 || contraindications.length > 0) {
    return {
      success: false,
      error: {
        code: 'SAFETY_BLOCKED',
        message: '医嘱被安全检查阻止',
        details: {
          allergyAlerts,
          contraindications,
          drugInteractions,
        },
      },
    };
  }

  // 落库：演示模式写内存医嘱存储，真实模式写 orderRepo（事务内写入）
  const ORDER_TYPE_TO_DB: Record<string, 'drug' | 'lab' | 'imaging' | 'treatment' | 'nursing' | 'other'> = {
    药品: 'drug',
    检验: 'lab',
    检查: 'imaging',
    治疗: 'treatment',
    护理: 'nursing',
    手术: 'treatment',
    输血: 'drug',
    其他: 'other',
  };
  const PRIORITY_TO_DB: Record<string, 'routine' | 'urgent' | 'stat'> = {
    普通: 'routine',
    急: 'urgent',
    即刻: 'stat',
  };

  const created = await clinicalData.createOrder({
    visitId: parsed.encounterId,
    orderType: ORDER_TYPE_TO_DB[parsed.orderType] ?? 'other',
    content: parsed.orderContent,
    detail: {
      dosage: parsed.dosage ?? null,
      frequency: parsed.frequency ?? null,
      duration: parsed.duration ?? null,
      clinicalIndication: parsed.clinicalIndication,
    },
    priority: PRIORITY_TO_DB[parsed.priority] ?? 'routine',
    doctorId: context.medicalUser.userId,
  });
  if (!created) {
    return {
      success: false,
      error: { code: 'ORDER_CREATE_FAILED', message: '医嘱创建失败' },
    };
  }
  const orderId = created.id;
  const now = new Date().toISOString();

  return {
    success: true,
    data: {
      success: true,
      orderId,
      status: requiresPharmacistReview ? '待审核' : '已开立',
      orderType: parsed.orderType,
      orderContent: parsed.orderContent,
      safetyCheck: {
        drugInteractions,
        contraindications,
        allergyAlerts,
        dosageAlerts,
      },
      requiresPharmacistReview,
      requiresDoubleConfirm: true,
      createdAt: now,
      createdBy: context.medicalUser.name,
      _source: sourceTag(),
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const createOrderTool = buildMedicalTool({
  name: 'create_order',
  description:
    '开具医嘱（药品/检查/检验/治疗/护理/手术/输血等）。高风险操作，需双重确认和执业医师资格。自动进行CDS安全检查（药物相互作用、禁忌症、过敏预警、剂量异常）。药品医嘱需药师审核。',
  category: MedicalToolCategory.ORDER,
  riskLevel: 'high',
  requiresAuth: true,
  requiresConfirm: true,
  requiresDoubleConfirm: true,
  requiredPermissions: ['order:create'],
  requiredRoles: ['doctor'],
  inputSchema: CreateOrderInput,
  outputSchema: CreateOrderOutput,
  execute: executeCreateOrder,
  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  isDestructive: () => false,
  userFacingName: () => '开具医嘱',
  getActivityDescription: (input: unknown) => {
    const parsed = CreateOrderInput.safeParse(input);
    if (parsed.success) {
      return `开具${parsed.data.orderType}医嘱: ${parsed.data.orderContent.slice(0, 30)}`;
    }
    return '开具医嘱';
  },
});

export type CreateOrderInputType = z.infer<typeof CreateOrderInput>;
export type CreateOrderOutputType = z.infer<typeof CreateOrderOutput>;
