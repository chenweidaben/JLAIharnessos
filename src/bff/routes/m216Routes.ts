/**
 * 健澜科技 jlmedaios - M216 AI辅助深度 + 运营分析
 *
 * AI病历书写/用药审查/影像辅助 + BI医院总览/科室对比
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 二、AI 辅助深度 ==================== */

/** GET /api/v1/ai/medical-report - AI 病历书写辅助 */
async function handleAiMedicalReport(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    input: {
      chiefComplaint: '胸闷3天，加重伴胸痛6小时',
      presentIllness: '患者3天前无明显诱因出现胸闷，位于心前区，呈压榨样，持续约5分钟，休息后可缓解。6小时前胸闷加重伴胸痛，向左肩放射，伴出汗，含服硝酸甘油后稍缓解。',
    },
    output: {
      admissionNote: {
        chiefComplaint: '胸闷3天，加重伴胸痛6小时',
        presentIllness: '患者3天前无明显诱因出现胸闷，位于心前区，呈压榨样，范围约手掌大小，持续约5分钟，休息后可缓解，无放射痛。6小时前胸闷加重伴胸痛，向左肩及左上肢放射，伴大汗、恶心，无呕吐、晕厥，自行含服硝酸甘油0.5mg后约3分钟胸痛缓解。为进一步诊治来我院急诊，心电图示ST-T改变，以"冠心病"收入院。',
        pastHistory: '高血压病史5年，最高160/100mmHg，规律服用缬沙坦80mg qd，血压控制尚可。否认糖尿病史，否认药物过敏史。',
        physicalExam: 'T 36.5℃，P 82次/分，R 18次/分，BP 130/80mmHg。神志清，精神可，双肺呼吸音清，未闻及干湿啰音。心律齐，各瓣膜听诊区未闻及病理性杂音。腹软，无压痛，双下肢无水肿。',
        preliminaryDiagnosis: '1. 冠心病 不稳定型心绞痛 心功能I级（NYHA） 2. 高血压病2级（很高危）',
      },
    },
  }));
}

/** GET /api/v1/ai/medication-review - AI 合理用药审查 */
async function handleAiMedicationReview(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    prescription: [
      { drug: '阿司匹林肠溶片', dosage: '100mg 每日1次 口服' },
      { drug: '阿托伐他汀钙片', dosage: '20mg 每晚1次 口服' },
      { drug: '硝酸甘油片', dosage: '0.5mg 必要时 舌下含服' },
    ],
    reviewResult: {
      overallStatus: '通过',
      warnings: [
        { type: '相互作用提醒', drug: '阿司匹林+他汀', description: '联用可增加出血风险，建议监测凝血功能' },
        { type: '注意事项', drug: '硝酸甘油', description: '低血压患者慎用，含服时坐位避免体位性低血压' },
      ],
      suggestions: [
        '建议加用ACEI类药物（如依那普利）改善心室重构',
        '建议评估是否需要β受体阻滞剂（如美托洛尔）',
      ],
      allergyCheck: '未检出过敏药物',
    },
  }));
}

/** GET /api/v1/ai/medical-imaging - AI 影像辅助 */
async function handleAiMedicalImaging(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    studyType: '胸部CT平扫',
    findings: [
      {
        location: '右肺上叶尖段',
        description: '类圆形结节，大小约8mm×6mm，边缘可见分叶及毛刺',
        riskLevel: '中风险',
        suggestion: '建议3个月后复查薄层CT，或穿刺活检明确性质',
      },
      {
        location: '左肺下叶后基底段',
        description: '钙化结节，大小约3mm×2mm，边界清晰',
        riskLevel: '低风险',
        suggestion: '良性钙化灶，建议年度体检随访',
      },
    ],
    overallImpression: '右肺上叶结节（中风险），建议进一步检查；左肺下叶钙化结节（低风险）。',
  }));
}

/* ==================== 三、运营分析深度 ==================== */

/** GET /api/v1/bi/hospital-overview - 医院运营总览 */
async function handleBiHospitalOverview(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    outpatient: { today: 12500, yesterday: 11800, momGrowth: 5.9, yoyGrowth: 8.2 },
    inpatient: { today: 1450, yesterday: 1430, momGrowth: 1.4, yoyGrowth: 3.5 },
    surgery: { today: 45, yesterday: 42, momGrowth: 7.1, yoyGrowth: 6.8 },
    bedUtilization: 87.5,
    averageStay: 8.6,
    averageCost: 18560.80,
  }));
}

/** GET /api/v1/bi/department-comparison - 科室对比分析 */
async function handleBiDepartmentComparison(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    outpatientRanking: [
      { rank: 1, dept: '急诊科', count: 12500 },
      { rank: 2, dept: '儿科', count: 9500 },
      { rank: 3, dept: '心内科', count: 8500 },
      { rank: 4, dept: '妇产科', count: 8200 },
      { rank: 5, dept: '内分泌科', count: 7800 },
      { rank: 6, dept: '呼吸科', count: 7200 },
      { rank: 7, dept: '普外科', count: 6800 },
      { rank: 8, dept: '神经内科', count: 6500 },
      { rank: 9, dept: '消化科', count: 6200 },
      { rank: 10, dept: '骨科', count: 5600 },
    ],
    dischargeRanking: [
      { rank: 1, dept: '普外科', count: 1560 },
      { rank: 2, dept: '心内科', count: 1250 },
      { rank: 3, dept: '妇产科', count: 1120 },
      { rank: 4, dept: '呼吸科', count: 980 },
      { rank: 5, dept: '骨科', count: 890 },
      { rank: 6, dept: '神经内科', count: 820 },
      { rank: 7, dept: '消化科', count: 760 },
      { rank: 8, dept: '急诊科', count: 680 },
      { rank: 9, dept: '内分泌科', count: 650 },
      { rank: 10, dept: '儿科', count: 580 },
    ],
    averageStayRanking: [
      { rank: 1, dept: '急诊科', days: 3.5 },
      { rank: 2, dept: '妇产科', days: 6.8 },
      { rank: 3, dept: '儿科', days: 5.2 },
      { rank: 4, dept: '心内科', days: 7.2 },
      { rank: 5, dept: '消化科', days: 8.8 },
      { rank: 6, dept: '呼吸科', days: 9.2 },
      { rank: 7, dept: '普外科', days: 8.5 },
      { rank: 8, dept: '骨科', days: 10.5 },
      { rank: 9, dept: '神经内科', days: 11.2 },
      { rank: 10, dept: '内分泌科', days: 12.5 },
    ],
    averageCostRanking: [
      { rank: 1, dept: '急诊科', cost: 8500 },
      { rank: 2, dept: '儿科', cost: 9200 },
      { rank: 3, dept: '消化科', cost: 13800 },
      { rank: 4, dept: '内分泌科', cost: 14500 },
      { rank: 5, dept: '妇产科', cost: 15600 },
      { rank: 6, dept: '呼吸科', cost: 16800 },
      { rank: 7, dept: '心内科', cost: 18500 },
      { rank: 8, dept: '神经内科', cost: 21200 },
      { rank: 9, dept: '普外科', cost: 22300 },
      { rank: 10, dept: '骨科', cost: 28500 },
    ],
  }));
}

export const m216Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/ai/medical-report', handle: handleAiMedicalReport, auth: true },
  { method: 'GET', path: '/api/v1/ai/medication-review', handle: handleAiMedicationReview, auth: true },
  { method: 'GET', path: '/api/v1/ai/medical-imaging', handle: handleAiMedicalImaging, auth: true },
  { method: 'GET', path: '/api/v1/bi/hospital-overview', handle: handleBiHospitalOverview, auth: true },
  { method: 'GET', path: '/api/v1/bi/department-comparison', handle: handleBiDepartmentComparison, auth: true },
];
