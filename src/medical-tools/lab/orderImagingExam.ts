/**
 * 健澜科技数智医院智能体 - 开具影像检查申请工具
 *
 * 工具名：order_imaging_exam
 * 功能：为患者开具影像检查申请（CT/MRI/X光/超声/内镜），增强检查自动校验造影剂过敏与肾功能
 * 风险等级：medium
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import { clinicalData, sourceTag } from '../../data/clinicalData.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';

// ============================================================================
// 影像检查项目目录
// ============================================================================

interface ImagingCatalog {
  examType: string;
  examName: string;
  room: string;
  basePrice: number;
  contrastPrice: number;
}

/** 影像检查项目目录 */
const IMAGING_CATALOG: ImagingCatalog[] = [
  { examType: 'CT', examName: '胸部CT平扫', room: 'CT室1号', basePrice: 280, contrastPrice: 350 },
  {
    examType: 'MRI',
    examName: '头颅MRI平扫',
    room: 'MRI室1号',
    basePrice: 680,
    contrastPrice: 500,
  },
  { examType: '超声', examName: '腹部超声', room: '超声科2室', basePrice: 120, contrastPrice: 0 },
  { examType: 'X光', examName: '胸部正位片（DR）', room: 'DR室', basePrice: 80, contrastPrice: 0 },
  { examType: 'CT', examName: '头颅CT平扫', room: 'CT室2号', basePrice: 260, contrastPrice: 350 },
  {
    examType: 'MRI',
    examName: '腰椎MRI平扫',
    room: 'MRI室2号',
    basePrice: 720,
    contrastPrice: 500,
  },
];

// ============================================================================
// 输入/输出 Schema
// ============================================================================

const OrderImagingExamInput = z.object({
  patientId: z.string().describe('患者ID'),
  encounterId: z.string().describe('就诊ID'),
  examType: z.enum(['CT', 'MRI', 'X光', '超声', '内镜']).describe('检查类型'),
  examBodyPart: z.string().min(2).describe('检查部位（如胸部/头颅/腹部）'),
  clinicalQuestion: z.string().min(2).describe('临床问题/检查目的'),
  contrast: z.boolean().default(false).describe('是否增强（使用造影剂）'),
  urgency: z.enum(['常规', '紧急', '立即']).default('常规').describe('检查紧急程度'),
});

const OrderImagingExamOutput = z.object({
  success: z.boolean(),
  orderId: z.string(),
  orderStatus: z.enum(['已预约', '已审核', '被阻止']),
  examName: z.string(),
  examType: z.string(),
  examBodyPart: z.string(),
  requirements: z.array(z.string()).describe('检查要求与注意事项'),
  scheduledTime: z.string().describe('预约时间'),
  examRoom: z.string().describe('检查室'),
  totalFee: z.number().describe('费用（元）'),
  contrastUsed: z.boolean().describe('是否使用造影剂'),
  safetyCheck: z.object({
    contrastAllergy: z.array(z.string()).describe('造影剂过敏评估'),
    renalFunction: z.array(z.string()).describe('肾功能评估'),
    warnings: z.array(z.string()).describe('其他注意事项'),
  }),
  orderedBy: z.string(),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 评估患者肾功能（基于最近肌酐）。演示/真实均经数据层取检验报告。
 *
 * @param patientId - 患者ID
 * @returns 肌酐值与评估结论
 */
async function assessRenalFunction(patientId: string): Promise<{ creatinine: number | null; conclusion: string }> {
  const reports = await clinicalData.getLabReports(patientId);
  const biochem = reports.find((r) => /生化|急诊生化/.test(r.testName));
  if (!biochem) {
    return { creatinine: null, conclusion: '无近期肾功能数据，增强检查前需补查肌酐/eGFR' };
  }
  const crItem = biochem.items.find((i) => i.itemName.includes('肌酐'));
  if (!crItem) {
    return { creatinine: null, conclusion: '近期生化报告无肌酐项，增强检查前需补查' };
  }
  const creatinine = parseFloat(crItem.result);
  if (isNaN(creatinine)) {
    return { creatinine: null, conclusion: '肌酐值无法解析，增强检查前需复核肾功能' };
  }
  // 简化 eGFR 评估（成年男性近似公式，仅作提示）
  const conclusion =
    creatinine > 133
      ? `肌酐 ${crItem.result} μmol/L 偏高，eGFR可能<60，增强造影需慎重并水化`
      : `肌酐 ${crItem.result} μmol/L 正常，可耐受碘造影剂`;
  return { creatinine, conclusion };
}

/**
 * 开具影像检查申请
 *
 * 增强CT自动检查造影剂过敏史与肾功能。
 *
 * @param input - 申请内容
 * @param context - 工具执行上下文
 * @returns 申请结果
 */
async function executeOrderImagingExam(
  input: unknown,
  context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = OrderImagingExamInput.parse(input);

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

  if (context.medicalUser.role !== 'doctor') {
    return {
      success: false,
      error: {
        code: 'LICENSE_REQUIRED',
        message: '仅执业医师可开具影像检查申请',
        details: { currentRole: context.medicalUser.role },
      },
    };
  }

  // 匹配检查项目
  const matched =
    IMAGING_CATALOG.find(
      (c) => c.examType === parsed.examType && c.examName.includes(parsed.examBodyPart),
    ) ?? IMAGING_CATALOG.find((c) => c.examType === parsed.examType);

  const examName = matched
    ? `${matched.examName}${parsed.contrast ? '（增强）' : '（平扫）'}`
    : `${parsed.examType}${parsed.examBodyPart}检查${parsed.contrast ? '（增强）' : '（平扫）'}`;
  const examRoom = matched?.room ?? `${parsed.examType}检查室`;
  const basePrice = matched?.basePrice ?? 200;
  const totalFee =
    parsed.contrast && (matched?.contrastPrice ?? 0) > 0
      ? basePrice + matched!.contrastPrice
      : basePrice;

  // 安全检查
  const contrastAllergy: string[] = [];
  const renalFunction: string[] = [];
  const warnings: string[] = [];

  const requiresContrast =
    parsed.contrast && (parsed.examType === 'CT' || parsed.examType === 'MRI');

  if (requiresContrast) {
    // 造影剂过敏检查
    const hasContrastAllergy = patient.allergies.some((a) => /造影|碘|对比剂|钆/.test(a.allergen));
    if (hasContrastAllergy) {
      const allergy = patient.allergies.find((a) => /造影|碘|对比剂|钆/.test(a.allergen))!;
      contrastAllergy.push(
        `患者对${allergy.allergen}过敏（${allergy.reaction}，${allergy.severity}），${
          allergy.severity === '危及生命' || allergy.severity === '重度'
            ? '严禁使用造影剂，请改为平扫或更换检查方式'
            : '使用造影剂需充分评估并预防性处理'
        }`,
      );
    } else {
      contrastAllergy.push('未发现造影剂/碘对比剂过敏史');
    }

    // 肾功能检查（增强CT尤其重要）
    const renal = await assessRenalFunction(parsed.patientId);
    renalFunction.push(renal.conclusion);

    // 二甲双胍 + 碘造影剂提示
    const onMetformin = patient.currentMedications.some((m) => m.drugName.includes('二甲双胍'));
    if (onMetformin && parsed.examType === 'CT') {
      warnings.push('患者服用二甲双胍，碘造影前后需停用二甲双胍并复查肾功能（预防乳酸酸中毒）');
    }
  } else {
    contrastAllergy.push('本次为平扫/无造影剂检查，无需造影剂评估');
  }

  // MRI 禁忌提示
  if (parsed.examType === 'MRI') {
    const hasMetal = patient.pastHistory.some((h) => /起搏器|金属植入|动脉瘤夹/.test(h.disease));
    if (hasMetal) {
      warnings.push('患者体内可能有金属植入物，MRI检查前需再次确认安全性');
    } else {
      warnings.push('MRI检查前需确认体内无金属植入物、无幽闭恐惧症');
    }
  }

  // 紧急预约时间
  const scheduled = new Date();
  if (parsed.urgency === '立即') {
    scheduled.setMinutes(scheduled.getMinutes() + 30);
  } else if (parsed.urgency === '紧急') {
    scheduled.setHours(scheduled.getHours() + 2);
  } else {
    scheduled.setDate(scheduled.getDate() + 1);
  }

  // 严重造影剂过敏 → 阻止开具增强，不落库
  const severeContrastAllergy = contrastAllergy.some((m) => m.includes('严禁'));
  const blocked = severeContrastAllergy;

  // 落库为 imaging 类医嘱（被阻止时不落库）
  let orderId = '';
  if (!blocked) {
    const PRIORITY_TO_DB: Record<string, 'routine' | 'urgent' | 'stat'> = {
      常规: 'routine',
      紧急: 'urgent',
      立即: 'stat',
    };
    const created = await clinicalData.createOrder({
      visitId: parsed.encounterId,
      orderType: 'imaging',
      content: `${examName}（${parsed.examBodyPart}）`,
      detail: {
        examType: parsed.examType,
        examBodyPart: parsed.examBodyPart,
        contrast: parsed.contrast,
        clinicalQuestion: parsed.clinicalQuestion,
        examRoom,
        totalFee,
      },
      priority: PRIORITY_TO_DB[parsed.urgency] ?? 'routine',
      doctorId: context.medicalUser.userId,
    });
    orderId = created?.id ?? '';
  }

  const requirements: string[] = [
    `检查部位：${parsed.examBodyPart}`,
    `临床目的：${parsed.clinicalQuestion}`,
    parsed.contrast ? '检查当日需家属陪同，检查后多饮水促进造影剂排泄' : '按常规检查准备',
    parsed.urgency === '立即' ? '急诊优先，30分钟内安排检查' : '',
  ].filter(Boolean);

  return {
    success: true,
    data: {
      success: true,
      orderId,
      orderStatus: blocked ? '被阻止' : '已预约',
      examName,
      examType: parsed.examType,
      examBodyPart: parsed.examBodyPart,
      requirements,
      scheduledTime: scheduled.toISOString(),
      examRoom,
      totalFee: blocked ? 0 : totalFee,
      contrastUsed: parsed.contrast && !blocked,
      safetyCheck: {
        contrastAllergy,
        renalFunction,
        warnings,
      },
      orderedBy: context.medicalUser.name,
      _source: sourceTag(),
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const orderImagingExamTool = buildMedicalTool({
  name: 'order_imaging_exam',
  description:
    '为患者开具影像检查申请，支持CT/MRI/X光（DR）/超声/内镜，含胸部CT平扫、头颅MRI平扫、腹部超声、胸部正位片等。增强检查自动进行造影剂过敏史评估与肾功能（肌酐/eGFR）评估，严重造影剂过敏将阻止开具增强。返回预约时间、检查室、费用与注意事项。',
  category: MedicalToolCategory.IMAGING,
  riskLevel: 'medium',
  requiresAuth: true,
  requiresConfirm: true,
  requiredPermissions: ['imaging:order'],
  requiredRoles: ['doctor'],
  inputSchema: OrderImagingExamInput,
  outputSchema: OrderImagingExamOutput,
  execute: executeOrderImagingExam,
  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  userFacingName: () => '开具影像检查',
  getActivityDescription: (input: unknown) => {
    const parsed = OrderImagingExamInput.safeParse(input);
    if (parsed.success) {
      return `开具${parsed.data.examType}${parsed.data.contrast ? '增强' : '平扫'}申请: ${parsed.data.examBodyPart}`;
    }
    return '开具影像检查';
  },
});

export type OrderImagingExamInputType = z.infer<typeof OrderImagingExamInput>;
export type OrderImagingExamOutputType = z.infer<typeof OrderImagingExamOutput>;
