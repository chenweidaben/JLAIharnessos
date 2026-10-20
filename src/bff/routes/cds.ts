/**
 * 健澜科技 jlmedaios - CDS 临床决策支持
 *
 * 提供过敏拦截、药物相互作用、剂量校验、临床路径偏离四大能力。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/**
 * GET /api/v1/cds/allergy-check?patientId=P001&drugCode=AMOXICILLIN
 * 过敏史实时拦截
 */
async function handleAllergyCheck(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const patientId = c.query.get('patientId') ?? 'P001';
  const drugCode = c.query.get('drugCode') ?? 'AMOXICILLIN';

  // DEMO 种子：患者对青霉素过敏，开阿莫西林触发拦截
  const allergyMap: Record<string, { allergy: string; drug: string }> = {
    AMOXICILLIN: { allergy: '青霉素', drug: '阿莫西林' },
  };

  const matched = allergyMap[drugCode];
  const triggered = !!matched;

  const result = {
    triggered,
    level: triggered ? 'red' : 'green',
    message: triggered
      ? `患者对青霉素过敏，禁止使用${matched.drug}`
      : '未检测到过敏史冲突',
    allergy: matched?.allergy ?? null,
    drug: matched?.drug ?? null,
    recommendation: triggered ? '请更换其他抗生素' : null,
    patientId,
  };

  return json(ok(result));
}

/**
 * GET /api/v1/cds/interaction-check?drugCodes=WARFARIN,ASPIRIN
 * 药物相互作用检查
 */
async function handleInteractionCheck(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const drugCodes = (c.query.get('drugCodes') ?? '').split(',').filter(Boolean);

  // DEMO 种子 2 条
  const interactionRules = [
    {
      pair: ['WARFARIN', 'ASPIRIN'],
      drug1: '华法林',
      drug2: '阿司匹林',
      level: 'high',
      message: '联合使用增加出血风险',
      recommendation: '监测 INR，考虑替代药物',
    },
    {
      pair: ['SIMVASTATIN', 'CLARITHROMYCIN'],
      drug1: '辛伐他汀',
      drug2: '克拉霉素',
      level: 'high',
      message: '联合使用增加横纹肌溶解风险',
      recommendation: '暂停辛伐他汀或更换抗生素',
    },
  ];

  const interactions = interactionRules
    .filter((rule) => {
      return rule.pair.every((code) => drugCodes.includes(code));
    })
    .map((rule) => ({
      drug1: rule.drug1,
      drug2: rule.drug2,
      level: rule.level,
      message: rule.message,
      recommendation: rule.recommendation,
    }));

  return json(ok({ interactions }));
}

/**
 * GET /api/v1/cds/dose-check?patientId=P001&drugCode=WARFARIN&dose=5mg
 * 剂量校验
 */
async function handleDoseCheck(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const patientId = c.query.get('patientId') ?? 'P001';
  const drugCode = c.query.get('drugCode') ?? 'WARFARIN';
  const dose = c.query.get('dose') ?? '5mg';

  // DEMO 种子：老年患者（78 岁）提示减量
  const mockPatientAge = 78;

  const warnings: Array<{
    level: string;
    message: string;
    currentDose: string;
    recommendedDose: string;
  }> = [];

  if (mockPatientAge > 75) {
    warnings.push({
      level: 'yellow',
      message: `患者年龄 ${mockPatientAge} 岁，建议减量 50%`,
      currentDose: dose,
      recommendedDose: '2.5mg',
    });
  }

  return json(ok({ warnings, patientId, drugCode, patientAge: mockPatientAge }));
}

/**
 * GET /api/v1/cds/pathway-deviation?patientId=P001&pathwayId=PW001
 * 临床路径偏离记录
 */
async function handlePathwayDeviation(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const patientId = c.query.get('patientId') ?? 'P001';
  const pathwayId = c.query.get('pathwayId') ?? 'PW001';

  // DEMO 种子 3 条偏离记录
  const deviations = [
    {
      day: 3,
      expected: '复查血常规',
      actual: '未复查',
      reason: '患者拒绝',
      severity: 'medium',
    },
    {
      day: 7,
      expected: '抗生素使用 ≤ 7 天',
      actual: '已使用 10 天',
      reason: '感染未控制',
      severity: 'high',
    },
    {
      day: 10,
      expected: '住院 ≤ 14 天',
      actual: '第 10 天出院',
      reason: '患者要求提前出院',
      severity: 'low',
    },
  ];

  const result = {
    pathwayId,
    patientId,
    deviations,
    totalDeviations: deviations.length,
  };

  return json(ok(result));
}

export const cdsRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/cds/allergy-check',
    handle: handleAllergyCheck,
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/cds/interaction-check',
    handle: handleInteractionCheck,
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/cds/dose-check',
    handle: handleDoseCheck,
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/cds/pathway-deviation',
    handle: handlePathwayDeviation,
    auth: true,
  },
];
