/**
 * 健澜科技 jlmedaios - M232 BI大屏深度 + 患者360深度 + CDS临床决策深度
 *
 * 医院运营大屏/医疗质量大屏/财务大屏 + 患者360全视图/摘要 + 剂量调整/诊断建议/医嘱套餐
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、BI 大屏深度 ==================== */

/** GET /api/v1/bi/dashboard - 医院运营大屏 */
async function handleBiDashboard(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    todayOutpatient: 1250,
    currentInpatient: 850,
    todaySurgery: 35,
    bedOccupancyRate: 85.0,
    todayRevenue: 285.6,
    last7Days: [1200, 1350, 1180, 1420, 1280, 1300, 1250],
    top5Departments: [
      { name: '心内科', visits: 180 },
      { name: '呼吸科', visits: 160 },
      { name: '普外科', visits: 150 },
      { name: '妇产科', visits: 140 },
      { name: '急诊科', visits: 130 },
    ],
    alerts: [
      { type: '床位预警', message: 'ICU 床位使用率 95%，接近饱和', time: '2026-10-20 09:30' },
      { type: '药品预警', message: '阿司匹林库存低于安全阈值', time: '2026-10-20 08:15' },
      { type: '设备预警', message: 'CT 球管温度异常，需巡检', time: '2026-10-20 07:45' },
    ],
  }));
}

/** GET /api/v1/bi/quality-dashboard - 医疗质量大屏 */
async function handleBiQualityDashboard(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    cureRate: 75.5,
    improvementRate: 20.3,
    deathRate: 1.2,
    infectionRate: 1.8,
    criticalRescueRate: 85.0,
    surgeryComplicationRate: 2.5,
    targets: {
      cureRate: { target: 70.0, status: '达标' },
      improvementRate: { target: 20.0, status: '达标' },
      deathRate: { target: 2.0, status: '达标' },
      infectionRate: { target: 2.0, status: '达标' },
      criticalRescueRate: { target: 80.0, status: '达标' },
      surgeryComplicationRate: { target: 3.0, status: '达标' },
    },
  }));
}

/** GET /api/v1/bi/finance-dashboard - 财务大屏 */
async function handleBiFinanceDashboard(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    todayRevenue: 285.6,
    monthRevenue: 8560.5,
    budgetExecutionRate: 78.5,
    top10Departments: [
      { name: '心内科', revenue: 1250.5 },
      { name: '普外科', revenue: 980.3 },
      { name: '妇产科', revenue: 850.2 },
      { name: '骨科', revenue: 780.5 },
      { name: '呼吸科', revenue: 650.3 },
      { name: '急诊科', revenue: 580.2 },
      { name: 'ICU', revenue: 520.1 },
      { name: '神经外科', revenue: 480.5 },
      { name: '儿科', revenue: 420.3 },
      { name: '眼科', revenue: 380.2 },
    ],
    costRate: 55.0,
    yoyGrowthRate: 8.5,
  }));
}

/* ==================== 二、患者 360 深度 ==================== */

/** GET /api/v1/patient/360/full - 患者 360 全视图 */
async function handlePatient360Full(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    basicInfo: {
      name: '张演示',
      gender: '男',
      age: 65,
      idCard: '3301**********1234',
      phone: '138****5678',
      address: '杭州市西湖区***',
    },
    diagnoses: ['冠心病（不稳定型心绞痛）', '高血压 3 级（极高危）', '2 型糖尿病'],
    medications: [
      { name: '阿司匹林肠溶片', dosage: '100mg qd', start: '2026-08-01' },
      { name: '阿托伐他汀钙片', dosage: '20mg qn', start: '2026-08-01' },
      { name: '二甲双胍缓释片', dosage: '0.5g bid', start: '2026-06-01' },
    ],
    labResults: [
      { item: '血常规', date: '2026-10-15', result: 'WBC 6.5×10⁹/L，Hb 135g/L' },
      { item: '生化', date: '2026-10-15', result: 'GLU 7.8mmol/L，LDL-C 2.5mmol/L' },
    ],
    imagingReports: [
      { type: 'CT（胸部）', date: '2026-10-10', result: '双肺纹理增粗，未见明显占位' },
    ],
    surgeryRecords: [
      { name: '冠状动脉支架植入术', date: '2026-08-15', hospital: '本院心内科' },
    ],
    costSummary: { totalCost: 12580.50, insuranceReimbursed: 9850.20, selfPay: 2730.30 },
    followups: [
      { date: '2026-09-15', content: '术后 1 个月随访，无胸闷胸痛，继续规律服药' },
    ],
    timeline: [
      { date: '2026-08-01', event: '门诊就诊，开始药物治疗' },
      { date: '2026-08-15', event: '急诊 PCI，前降支植入支架 1 枚' },
      { date: '2026-09-15', event: '术后 1 个月随访，恢复良好' },
      { date: '2026-10-15', event: '术后 2 个月复查，各项指标稳定' },
    ],
  }));
}

/** GET /api/v1/patient/360/summary - 患者 360 摘要 */
async function handlePatient360Summary(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    lastVisit: { date: '2026-10-15', dept: '心内科', diagnosis: '冠心病术后随访' },
    currentMedications: ['阿司匹林 100mg qd', '阿托伐他汀 20mg qn', '二甲双胍 0.5g bid'],
    keyDiagnoses: ['冠心病（PCI 术后）', '高血压 3 级', '2 型糖尿病'],
    allergies: ['青霉素（皮疹）'],
    riskLevel: '中风险',
    riskFactors: ['年龄 > 60 岁', '高血压 3 级（极高危）', '糖尿病'],
  }));
}

/* ==================== 三、CDS 临床决策深度 ==================== */

/** GET /api/v1/cds/dose-adjustment - 剂量调整建议 */
async function handleCdsDoseAdjustment(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    liverImpairment: [
      { drug: '阿托伐他汀', adjustment: '轻度：无需调整；中度：减量 50%；重度：禁用' },
      { drug: '二甲双胍', adjustment: '轻度：无需调整；中度：减量 50%；重度：禁用' },
    ],
    renalImpairment: [
      { drug: '二甲双胍', adjustment: 'eGFR > 60：常规剂量；30-60：减量 50%；< 30：禁用' },
      { drug: '阿司匹林', adjustment: '轻度：无需调整；中度：减量 25%；重度：慎用' },
    ],
    elderly: [
      { drug: '苯二氮䓬类', adjustment: '老年人剂量减半，避免长效制剂' },
      { drug: '降压药', adjustment: '从小剂量开始，逐渐加量，避免体位性低血压' },
    ],
    pediatric: [
      { drug: '对乙酰氨基酚', adjustment: '10-15mg/kg/次，每 4-6 小时一次，每日不超过 60mg/kg' },
    ],
    pregnant: [
      { drug: '阿司匹林', adjustment: '妊娠早期慎用；妊娠晚期禁用（增加出血风险）' },
      { drug: '二甲双胍', adjustment: '妊娠期间停用，改用胰岛素' },
    ],
  }));
}

/** GET /api/v1/cds/diagnosis-suggest - 诊断建议 */
async function handleCdsDiagnosisSuggest(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    inputSymptoms: ['胸闷', '胸痛', '气短'],
    differentialDiagnoses: [
      { diagnosis: '冠心病（不稳定型心绞痛）', confidence: 85.0, suggestedTests: ['心电图', '心肌酶谱', '冠脉 CT'] },
      { diagnosis: '急性心肌梗死', confidence: 70.0, suggestedTests: ['心电图', '心肌酶谱', '急诊 PCI'] },
      { diagnosis: '肺栓塞', confidence: 45.0, suggestedTests: ['D-二聚体', '肺动脉 CTA'] },
      { diagnosis: '主动脉夹层', confidence: 30.0, suggestedTests: ['主动脉 CTA', '超声心动图'] },
    ],
  }));
}

/** GET /api/v1/cds/order-set - 医嘱套餐 */
async function handleCdsOrderSet(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    orderSets: [
      {
        disease: '冠心病',
        defaultOrders: ['阿司匹林 100mg qd', '阿托伐他汀 20mg qn', '美托洛尔 25mg bid'],
        adjustable: ['是否需要硝酸酯类', '是否需要 ACEI/ARB'],
        notes: '注意监测出血风险、肝功能、心率血压',
      },
      {
        disease: '肺炎',
        defaultOrders: ['头孢类抗生素', '止咳化痰药', '雾化吸入'],
        adjustable: ['抗生素级别选择', '是否需要吸氧'],
        notes: '注意过敏史，监测体温、血常规',
      },
      {
        disease: '糖尿病',
        defaultOrders: ['二甲双胍 0.5g bid', '血糖监测（三餐前后）'],
        adjustable: ['是否需要胰岛素', '是否需要 SGLT-2 抑制剂'],
        notes: '注意监测血糖、肝肾功能',
      },
      {
        disease: '高血压',
        defaultOrders: ['氨氯地平 5mg qd', '血压监测（每日 2 次）'],
        adjustable: ['是否需要联合用药', '是否需要 ACEI/ARB'],
        notes: '注意监测血压、心率、肾功能',
      },
      {
        disease: '急性阑尾炎',
        defaultOrders: ['急诊手术（阑尾切除术）', '术前禁食禁水', '抗生素预防感染'],
        adjustable: ['手术方式（开腹/腹腔镜）', '是否需要术后镇痛'],
        notes: '注意术前评估、术后引流、感染预防',
      },
    ],
  }));
}

export const m232Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/bi/dashboard', handle: handleBiDashboard, auth: true },
  { method: 'GET', path: '/api/v1/bi/quality-dashboard', handle: handleBiQualityDashboard, auth: true },
  { method: 'GET', path: '/api/v1/bi/finance-dashboard', handle: handleBiFinanceDashboard, auth: true },
  { method: 'GET', path: '/api/v1/patient/360/full', handle: handlePatient360Full, auth: true },
  { method: 'GET', path: '/api/v1/patient/360/summary', handle: handlePatient360Summary, auth: true },
  { method: 'GET', path: '/api/v1/cds/dose-adjustment', handle: handleCdsDoseAdjustment, auth: true },
  { method: 'GET', path: '/api/v1/cds/diagnosis-suggest', handle: handleCdsDiagnosisSuggest, auth: true },
  { method: 'GET', path: '/api/v1/cds/order-set', handle: handleCdsOrderSet, auth: true },
];
