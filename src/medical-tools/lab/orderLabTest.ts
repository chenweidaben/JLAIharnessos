/**
 * 健澜科技数智医院智能体 - 开具检验申请工具
 *
 * 工具名：order_lab_test
 * 功能：为患者开具检验申请单，校验检验项目适应症，返回标本要求与预计报告时间
 * 风险等级：medium
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import { MOCK_PATIENTS } from '../mockData.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';

// ============================================================================
// 检验项目目录（真实检验名称与标本类型）
// ============================================================================

interface LabItemCatalog {
  testCode: string;
  testName: string;
  specimenType: string;
  container: string;
  fasting: boolean;
  price: number;
  reportHour: number; // 预计报告时间（小时）
}

/** 检验项目目录：血常规/生化/心肌酶/凝血/甲功等 */
const LAB_CATALOG: Record<string, LabItemCatalog> = {
  BLOOD_ROUTINE: {
    testCode: 'BLOOD_ROUTINE',
    testName: '血常规（五分类）',
    specimenType: '静脉血（EDTA-K2抗凝血）',
    container: '紫帽EDTA抗凝管',
    fasting: false,
    price: 25,
    reportHour: 1,
  },
  BIOCHEMISTRY: {
    testCode: 'BIOCHEMISTRY',
    testName: '生化全套（肝肾功能、电解质、血糖血脂）',
    specimenType: '静脉血（血清）',
    container: '黄帽分离胶促凝管',
    fasting: true,
    price: 120,
    reportHour: 4,
  },
  CARDIAC_ENZYME: {
    testCode: 'CARDIAC_ENZYME',
    testName: '心肌酶谱+肌钙蛋白I',
    specimenType: '静脉血（血清）',
    container: '红帽促凝管',
    fasting: false,
    price: 80,
    reportHour: 1.5,
  },
  COAGULATION: {
    testCode: 'COAGULATION',
    testName: '凝血功能四项（PT/APTT/INR/FIB）',
    specimenType: '静脉血（枸橼酸钠抗凝血）',
    container: '蓝帽枸橼酸钠抗凝管',
    fasting: false,
    price: 60,
    reportHour: 2,
  },
  THYROID: {
    testCode: 'THYROID',
    testName: '甲状腺功能五项（TSH/FT3/FT4/TPOAb/TgAb）',
    specimenType: '静脉血（血清）',
    container: '黄帽分离胶促凝管',
    fasting: true,
    price: 150,
    reportHour: 24,
  },
};

// ============================================================================
// 输入/输出 Schema
// ============================================================================

const OrderLabTestInput = z.object({
  patientId: z.string().describe('患者ID'),
  encounterId: z.string().describe('就诊ID'),
  testItems: z
    .array(
      z.object({
        testCode: z
          .enum(['BLOOD_ROUTINE', 'BIOCHEMISTRY', 'CARDIAC_ENZYME', 'COAGULATION', 'THYROID'])
          .describe('检验项目代码'),
        testName: z.string().optional().describe('检验项目名称（可选，默认按代码）'),
        specimenType: z.string().optional().describe('标本类型（可选）'),
        urgency: z.enum(['常规', '紧急', '立即']).default('常规').describe('送检紧急程度'),
      }),
    )
    .min(1, '至少选择一个检验项目')
    .describe('检验项目列表'),
  clinicalDiagnosis: z.string().optional().describe('临床诊断/开单原因'),
  priority: z.enum(['常规', '紧急', '立即']).default('常规').describe('申请优先级'),
});

const OrderLabTestOutput = z.object({
  success: z.boolean(),
  orderId: z.string(),
  orderStatus: z.enum(['已提交', '已审核', '被阻止']),
  testItems: z.array(
    z.object({
      testCode: z.string(),
      testName: z.string(),
      specimenType: z.string(),
      container: z.string(),
      fastingRequired: z.boolean(),
      urgency: z.string(),
    }),
  ),
  specimenRequirements: z.array(z.string()).describe('标本采集要求'),
  collectionTime: z.string().describe('建议采集时间'),
  expectedReportTime: z.string().describe('预计报告时间'),
  totalFee: z.number().describe('总费用（元）'),
  safetyCheck: z.object({
    indications: z.array(z.string()).describe('适应症提示'),
    warnings: z.array(z.string()).describe('安全预警'),
  }),
  orderedBy: z.string(),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 计算预计报告时间
 *
 * @param priority - 优先级
 * @param maxReportHour - 项目中最长报告耗时
 * @returns 预计报告时间ISO字符串
 */
function calcExpectedReportTime(priority: string, maxReportHour: number): string {
  const now = new Date();
  const hours =
    priority === '立即'
      ? Math.min(maxReportHour, 0.5)
      : priority === '紧急'
        ? maxReportHour / 2
        : maxReportHour;
  now.setHours(now.getHours() + Math.max(0.5, hours));
  return now.toISOString();
}

/**
 * 开具检验申请
 *
 * 校验患者与检验项目适应症，生成检验申请单、标本采集要求与费用。
 *
 * @param input - 申请内容
 * @param context - 工具执行上下文
 * @returns 申请结果
 */
async function executeOrderLabTest(
  input: unknown,
  context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = OrderLabTestInput.parse(input);

  // 患者校验
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

  // 执业医师校验
  if (context.medicalUser.role !== 'doctor') {
    return {
      success: false,
      error: {
        code: 'LICENSE_REQUIRED',
        message: '仅执业医师可开具检验申请',
        details: { currentRole: context.medicalUser.role },
      },
    };
  }

  // 组装项目
  const safetyIndications: string[] = [];
  const warnings: string[] = [];
  const specimenRequirements: string[] = [];
  let totalFee = 0;
  let maxReportHour = 1;

  const items = parsed.testItems.map((item) => {
    const catalog = LAB_CATALOG[item.testCode];
    totalFee += catalog.price;
    maxReportHour = Math.max(maxReportHour, catalog.reportHour);

    // 适应症提示
    safetyIndications.push(
      `${catalog.testName}：适用于${
        item.testCode === 'CARDIAC_ENZYME'
          ? '胸痛/心肌损伤排查'
          : item.testCode === 'COAGULATION'
            ? '出血/血栓/术前凝血评估'
            : item.testCode === 'THYROID'
              ? '甲状腺功能异常评估'
              : '常规临床评估'
      }`,
    );

    // 空腹要求预警
    if (catalog.fasting && item.urgency !== '立即') {
      warnings.push(`${catalog.testName}需空腹采血，请告知患者至少禁食8小时`);
    }

    // 紧急项目标本要求
    specimenRequirements.push(
      `${catalog.testName}：${catalog.specimenType}（${catalog.container}），${item.urgency === '立即' ? '立即送检，优先处理' : '按常规流程送检'}`,
    );

    return {
      testCode: catalog.testCode,
      testName: item.testName ?? catalog.testName,
      specimenType: item.specimenType ?? catalog.specimenType,
      container: catalog.container,
      fastingRequired: catalog.fasting,
      urgency: item.urgency,
    };
  });

  // 危急患者/急诊优先提示
  if (patient.isEmergency || parsed.priority === '立即') {
    warnings.push('患者为急诊/立即优先级，检验科将优先处理并电话报告危急值');
  }

  const orderId = `L${Date.now().toString().slice(-10)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const now = new Date();
  const collectionTime = now.toISOString();
  const expectedReportTime = calcExpectedReportTime(parsed.priority, maxReportHour);

  return {
    success: true,
    data: {
      success: true,
      orderId,
      orderStatus: '已提交',
      testItems: items,
      specimenRequirements,
      collectionTime,
      expectedReportTime,
      totalFee,
      safetyCheck: {
        indications: safetyIndications,
        warnings,
      },
      orderedBy: context.medicalUser.name,
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const orderLabTestTool = buildMedicalTool({
  name: 'order_lab_test',
  description:
    '为患者开具检验申请单，支持血常规（EDTA抗凝血）、生化全套（血清）、心肌酶谱（血清）、凝血功能（枸橼酸钠抗凝血）、甲状腺功能（血清）等项目。自动校验适应症、空腹要求与标本类型，返回申请单号、采集要求、预计报告时间与费用。',
  category: MedicalToolCategory.LAB,
  riskLevel: 'medium',
  requiresAuth: true,
  requiresConfirm: true,
  requiredPermissions: ['lab:order'],
  requiredRoles: ['doctor'],
  inputSchema: OrderLabTestInput,
  outputSchema: OrderLabTestOutput,
  execute: executeOrderLabTest,
  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  userFacingName: () => '开具检验申请',
  getActivityDescription: (input: unknown) => {
    const parsed = OrderLabTestInput.safeParse(input);
    if (parsed.success) {
      return `开具检验申请: ${parsed.data.testItems.length}项，患者${parsed.data.patientId}`;
    }
    return '开具检验申请';
  },
});

export type OrderLabTestInputType = z.infer<typeof OrderLabTestInput>;
export type OrderLabTestOutputType = z.infer<typeof OrderLabTestOutput>;
