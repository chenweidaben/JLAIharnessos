/**
 * 健澜科技数智医院智能体 - 开具处方工具
 *
 * 工具名：create_prescription
 * 功能：为患者开具西药/中成药/中药饮片处方，需双重确认 + CA签名 + 药师审核
 * 风险等级：high（高风险操作，自动执行过敏检查、药物相互作用检查、剂量检查）
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import { MOCK_DRUG_INTERACTIONS, MOCK_PATIENTS } from '../mockData.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';
import {
  estimateDrugFee,
  findDrugInfo,
  type MockPrescription,
  PRESCRIPTION_STORE,
  type PrescriptionItem,
} from './drugCatalog.js';

// ============================================================================
// 输入/输出 Schema
// ============================================================================

const DrugEntry = z.object({
  drugName: z.string().min(1).describe('药品通用名'),
  specification: z.string().describe('规格（如100mg/片）'),
  dosage: z.string().describe('单次剂量（如100mg）'),
  frequency: z.string().describe('给药频次（如qd/bid/tid/qn/prn）'),
  days: z.number().int().positive().max(90).describe('用药天数（1-90天）'),
  quantity: z.number().int().positive().max(9999).describe('发药数量'),
  usage: z.string().describe('用法（如口服，每日一次，每次1片）'),
});

const CreatePrescriptionInput = z.object({
  patientId: z.string().describe('患者ID'),
  encounterId: z.string().describe('就诊ID'),
  prescriptionType: z.enum(['西药', '中成药', '中药饮片']).describe('处方类型'),
  drugs: z.array(DrugEntry).min(1).describe('药品明细列表（至少1种）'),
  diagnosis: z.string().optional().describe('临床诊断'),
  doctorId: z.string().optional().describe('开方医师ID（缺省取当前登录用户）'),
});

const SafetyCheckSchema = z.object({
  allergyAlerts: z.array(z.string()).describe('过敏预警'),
  drugInteractions: z.array(z.string()).describe('药物相互作用预警'),
  dosageAlerts: z.array(z.string()).describe('剂量异常预警'),
  contraindications: z.array(z.string()).describe('禁忌/药病相互作用预警'),
});

const CreatePrescriptionOutput = z.object({
  success: z.boolean(),
  prescriptionId: z.string().describe('处方ID'),
  status: z.enum(['待审核', '已开立']).describe('处方状态'),
  prescriptionType: z.string(),
  itemCount: z.number().describe('药品条目数'),
  feeEstimate: z.object({
    totalFee: z.number().describe('费用预估合计（元）'),
    currency: z.string(),
    unknownDrugs: z.array(z.string()).describe('未匹配目录、未计价药品'),
  }),
  safetyCheck: SafetyCheckSchema,
  requiresPharmacistReview: z.boolean().describe('是否需药师审核'),
  requiresDoubleConfirm: z.boolean().describe('是否需双重确认'),
  requiresCASignature: z.boolean().describe('是否需CA签名'),
  createdAt: z.string(),
  createdBy: z.string(),
});

// ============================================================================
// 安全检查逻辑
// ============================================================================

interface SafetyResult {
  allergyAlerts: string[];
  drugInteractions: string[];
  dosageAlerts: string[];
  contraindications: string[];
  /** 是否存在必须阻止开具的严重安全问题 */
  hasFatalIssue: boolean;
}

/**
 * 执行处方安全检查：过敏、药物相互作用、剂量、禁忌
 *
 * @param patient - Mock患者
 * @param drugs - 处方药品明细
 * @returns 安全检查结果
 */
function runSafetyCheck(
  patient: (typeof MOCK_PATIENTS)[number],
  drugs: PrescriptionItem[],
): SafetyResult {
  const allergyAlerts: string[] = [];
  const drugInteractions: string[] = [];
  const dosageAlerts: string[] = [];
  const contraindications: string[] = [];

  const prescribedNames = drugs.map((d) => d.drugName);
  // 患者当前用药 + 本次处方用药的合并集合，用于相互作用检测
  const currentNames = patient.currentMedications.map((m) => m.drugName);

  // ---- 1. 过敏检查 ----
  for (const drug of prescribedNames) {
    for (const allergy of patient.allergies) {
      if (
        drug.includes(allergy.allergen) ||
        allergy.allergen.includes(drug) ||
        // 青霉素过敏者使用头孢类存在交叉过敏风险
        (allergy.allergen.includes('青霉素') && drug.includes('头孢')) ||
        // 磺胺过敏者避免含磺胺成分
        (allergy.allergen.includes('磺胺') && drug.includes('磺胺'))
      ) {
        allergyAlerts.push(
          `患者对${allergy.allergen}过敏（${allergy.reaction}，${allergy.severity}），处方包含${drug}，禁止开具`,
        );
      }
    }
  }

  // ---- 2. 药物相互作用检查（本次处方 × 当前用药）----
  const allNames = [...prescribedNames, ...currentNames];
  for (const interaction of MOCK_DRUG_INTERACTIONS) {
    // 跳过非药品相互作用（含钙溶液、碘造影剂）
    if (interaction.drugB === '含钙溶液' || interaction.drugB === '碘造影剂') {
      continue;
    }
    const aPresent = allNames.some(
      (n) => n.includes(interaction.drugA) || interaction.drugA.includes(n),
    );
    const bPresent = allNames.some(
      (n) => n.includes(interaction.drugB) || interaction.drugB.includes(n),
    );
    if (aPresent && bPresent) {
      const msg = `【${interaction.severity}】${interaction.drugA} 与 ${interaction.drugB}：${interaction.description} 建议：${interaction.suggestion}`;
      if (interaction.severity === '禁忌') {
        contraindications.push(msg);
      } else if (interaction.severity === '严重') {
        drugInteractions.push(msg);
      } else {
        drugInteractions.push(msg);
      }
    }
  }

  // ---- 3. 剂量/疗程合理性粗检 ----
  for (const d of drugs) {
    if (d.days > 30) {
      dosageAlerts.push(`${d.drugName} 疗程 ${d.days} 天，超过常规30天，建议复核疗程依据`);
    }
    const info = findDrugInfo(d.drugName);
    if (!info) {
      dosageAlerts.push(`${d.drugName} 未纳入药品目录，剂量与疗程需人工核对说明书`);
    }
  }

  // ---- 4. 药病禁忌粗检 ----
  const conditions = patient.pastHistory.map((h) => h.disease);
  for (const d of drugs) {
    if (d.drugName.includes('布洛芬') && conditions.some((c) => c.includes('肾功能'))) {
      contraindications.push(`${d.drugName}（NSAIDs）可能加重肾功能损害`);
    }
  }

  // 危及生命过敏 + 任何禁忌组合 → 必须阻止
  const hasFatalIssue = allergyAlerts.length > 0 || contraindications.length > 0;

  return {
    allergyAlerts,
    drugInteractions,
    dosageAlerts,
    contraindications,
    hasFatalIssue,
  };
}

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 开具处方
 *
 * 高风险操作：校验患者存在与医师开方权，自动执行过敏/相互作用/剂量安全检查，
 * 存在严重安全问题（过敏、禁忌）时阻止开具；否则生成待审核处方并预估费用。
 *
 * @param input - 处方内容
 * @param context - 工具执行上下文
 * @returns 创建结果（处方ID、状态、安全检查、费用预估、审核要求）
 */
async function executeCreatePrescription(
  input: unknown,
  context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = CreatePrescriptionInput.parse(input);

  // 校验患者存在
  const patient = MOCK_PATIENTS.find((p) => p.patientId === parsed.patientId);
  if (!patient) {
    return {
      success: false,
      error: {
        code: 'PATIENT_NOT_FOUND',
        message: `患者 ${parsed.patientId} 不存在`,
      },
    };
  }

  // 校验开方权限：仅执业医师可开具处方
  if (context.medicalUser.role !== 'doctor') {
    return {
      success: false,
      error: {
        code: 'LICENSE_REQUIRED',
        message: '仅执业医师可开具处方',
        details: { currentRole: context.medicalUser.role },
      },
    };
  }
  if (context.medicalUser.prescription权 === false) {
    return {
      success: false,
      error: {
        code: 'NO_PRESCRIPTION_RIGHT',
        message: '当前账号未授予处方权，无法开具处方',
      },
    };
  }

  // 药品明细
  const items: PrescriptionItem[] = parsed.drugs.map((d) => ({ ...d }));

  // 安全检查
  const safety = runSafetyCheck(patient, items);

  // 存在严重安全问题 → 阻止开具
  if (safety.hasFatalIssue) {
    return {
      success: false,
      error: {
        code: 'SAFETY_BLOCKED',
        message: '处方被安全检查阻止：存在过敏或禁忌风险，禁止开具',
        details: {
          allergyAlerts: safety.allergyAlerts,
          contraindications: safety.contraindications,
          drugInteractions: safety.drugInteractions,
        },
      },
    };
  }

  // 费用预估
  let totalFee = 0;
  const unknownDrugs: string[] = [];
  for (const item of items) {
    const { fee, matched } = estimateDrugFee(item.drugName, item.quantity);
    totalFee += fee;
    if (!matched) unknownDrugs.push(item.drugName);
  }
  totalFee = Math.round(totalFee * 100) / 100;

  // 生成处方ID并落库（内存）
  const prescriptionId = `RX${Date.now().toString().slice(-10)}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const now = new Date().toISOString();

  const record: MockPrescription = {
    prescriptionId,
    patientId: parsed.patientId,
    encounterId: parsed.encounterId,
    prescriptionType: parsed.prescriptionType,
    status: '待审核',
    items,
    diagnosis: parsed.diagnosis ?? patient.currentDiagnosis,
    doctorId: parsed.doctorId ?? context.medicalUser.userId,
    doctorName: context.medicalUser.name,
    pharmacist: null,
    totalFee,
    safetyCheckSummary:
      safety.drugInteractions.length > 0
        ? `存在${safety.drugInteractions.length}条药物相互作用提示，需药师重点关注`
        : '无严重风险提示',
    createdAt: now,
    auditedAt: null,
    auditComment: null,
  };
  PRESCRIPTION_STORE.push(record);

  return {
    success: true,
    data: {
      success: true,
      prescriptionId,
      status: '待审核',
      prescriptionType: parsed.prescriptionType,
      itemCount: items.length,
      feeEstimate: {
        totalFee,
        currency: 'CNY',
        unknownDrugs,
      },
      safetyCheck: {
        allergyAlerts: safety.allergyAlerts,
        drugInteractions: safety.drugInteractions,
        dosageAlerts: safety.dosageAlerts,
        contraindications: safety.contraindications,
      },
      requiresPharmacistReview: true,
      requiresDoubleConfirm: true,
      requiresCASignature: true,
      createdAt: now,
      createdBy: context.medicalUser.name,
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const createPrescriptionTool = buildMedicalTool({
  name: 'create_prescription',
  description:
    '为患者开具西药/中成药/中药饮片处方。高风险操作，需双重确认+CA签名+执业医师处方权，并自动进行过敏检查、药物相互作用检查、剂量检查；存在过敏或禁忌风险时阻止开具。处方提交后需药师审核。',
  category: MedicalToolCategory.PRESCRIPTION,
  riskLevel: 'high',
  requiresAuth: true,
  requiresConfirm: true,
  requiresDoubleConfirm: true,
  requiredPermissions: ['prescription:create'],
  requiredRoles: ['doctor'],
  inputSchema: CreatePrescriptionInput,
  outputSchema: CreatePrescriptionOutput,
  execute: executeCreatePrescription,
  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  isDestructive: () => false,
  userFacingName: () => '开具处方',
  getActivityDescription: (input: unknown) => {
    const parsed = CreatePrescriptionInput.safeParse(input);
    if (parsed.success) {
      const names = parsed.data.drugs.map((d) => d.drugName).join('、');
      return `开具${parsed.data.prescriptionType}处方: ${names.slice(0, 40)}`;
    }
    return '开具处方';
  },
});

export type CreatePrescriptionInputType = z.infer<typeof CreatePrescriptionInput>;
export type CreatePrescriptionOutputType = z.infer<typeof CreatePrescriptionOutput>;
