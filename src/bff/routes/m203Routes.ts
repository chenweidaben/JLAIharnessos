/**
 * 健澜科技 jlmedaios - M203 运营驾驶舱 + AI辅诊 + 体检病理管理域
 *
 * 全院运营大屏 / AI病历辅助 / AI风险预测 / 体检预约报告 / 病理标本
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、全院运营驾驶舱 ==================== */

/** GET /api/v1/dashboard/cockpit - 全院实时运营大屏 */
async function handleDashboardCockpit(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    today: {
      outpatient: 1250,
      inpatient: 856,
      surgeries: 12,
      bedUtilization: '85.6%',
      avgStay: 7.2,
    },
    revenueTrend7d: [
      { date: '2026-10-14', revenue: 1250000 },
      { date: '2026-10-15', revenue: 1320000 },
      { date: '2026-10-16', revenue: 1180000 },
      { date: '2026-10-17', revenue: 1450000 },
      { date: '2026-10-18', revenue: 980000 },
      { date: '2026-10-19', revenue: 1380000 },
      { date: '2026-10-20', revenue: 1256000 },
    ],
    deptTop5: [
      { dept: '心内科', revenue: 285000, outpatient: 180 },
      { dept: '骨科', revenue: 220000, outpatient: 120 },
      { dept: '呼吸科', revenue: 180000, outpatient: 150 },
      { dept: '消化科', revenue: 150000, outpatient: 140 },
      { dept: '神经内科', revenue: 130000, outpatient: 100 },
    ],
    alerts: [
      { type: '危急值', message: '血钾 6.8mmol/L - 心内科-张演示', time: '09:15' },
      { type: '欠费', message: '王患者欠费 5000 元（住院押金不足）', time: '09:30' },
      { type: '设备故障', message: '彩超探头图像模糊 - 超声科', time: '08:45' },
    ],
  }));
}

/* ==================== 二、AI 辅诊 DEMO ==================== */

/** GET /api/v1/ai/cda/suggest - AI病历书写辅助 */
async function handleAiCdaSuggest(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const url = new URL(c.req.url);
  const scenario = url.searchParams.get('scenario') || 'chd';

  const scenarios: Record<string, object> = {
    chd: {
      input: { chiefComplaint: '胸闷3天', presentIllness: '患者3天前无明显诱因出现胸闷，活动后加重，伴心悸' },
      diagnosis: {
        primary: '冠心病 不稳定型心绞痛',
        differential: ['主动脉夹层', '肺栓塞', '胃食管反流病', '肋间神经痛'],
      },
      medication: ['阿司匹林 100mg qd', '阿托伐他汀 20mg qn', '硝酸甘油 0.5mg prn'],
    },
    pneumonia: {
      input: { chiefComplaint: '发热咳嗽5天', presentIllness: '患者5天前受凉后出现发热，最高39.2℃，伴咳嗽咳黄痰' },
      diagnosis: {
        primary: '社区获得性肺炎',
        differential: ['肺结核', '肺癌', '支气管扩张', '急性支气管炎'],
      },
      medication: ['阿莫西林克拉维酸钾 1.2g iv q8h', '氨溴索 30mg po tid', '布洛芬 0.3g prn'],
    },
    dm: {
      input: { chiefComplaint: '多饮多尿1月', presentIllness: '患者1月来无明显诱因出现多饮多尿，每日饮水量约3000ml，伴体重下降5kg' },
      diagnosis: {
        primary: '2型糖尿病',
        differential: ['1型糖尿病', '尿崩症', '甲状腺功能亢进', '精神性多饮'],
      },
      medication: ['二甲双胍 0.5g po bid', '阿卡波糖 50mg po tid', '糖尿病饮食指导'],
    },
  };

  return json(ok(scenarios[scenario] || scenarios.chd));
}

/** GET /api/v1/ai/risk/prediction - AI风险预测 */
async function handleAiRiskPrediction(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const predictions = [
    { patient: '张演示', fallRisk: { score: 65, level: 'high' }, pressureUlcer: { score: 42, level: 'medium' }, readmission: { score: 28, level: 'low' } },
    { patient: '李患者', fallRisk: { score: 25, level: 'low' }, pressureUlcer: { score: 15, level: 'low' }, readmission: { score: 18, level: 'low' } },
    { patient: '王患者', fallRisk: { score: 45, level: 'medium' }, pressureUlcer: { score: 55, level: 'high' }, readmission: { score: 35, level: 'medium' } },
    { patient: '赵患者', fallRisk: { score: 80, level: 'high' }, pressureUlcer: { score: 60, level: 'high' }, readmission: { score: 50, level: 'high' } },
    { patient: '刘患者', fallRisk: { score: 30, level: 'low' }, pressureUlcer: { score: 20, level: 'low' }, readmission: { score: 22, level: 'low' } },
  ];

  return json(ok({ predictions, totalCount: predictions.length }));
}

/* ==================== 三、体检管理 ==================== */

/** GET /api/v1/physical/exams - 体检预约列表 */
async function handlePhysicalExams(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const exams = [
    { id: 'PE-001', name: '张演示', package: '入职体检', date: '2026-10-22', status: '已预约' },
    { id: 'PE-002', name: '李患者', package: '健康体检', date: '2026-10-19', status: '已完成' },
    { id: 'PE-003', name: '王患者', package: '高端体检', date: '2026-10-25', status: '已预约' },
    { id: 'PE-004', name: '赵患者', package: '入职体检', date: '2026-10-18', status: '已取消' },
    { id: 'PE-005', name: '刘患者', package: '健康体检', date: '2026-10-20', status: '已预约' },
  ];

  return json(ok({ exams, totalCount: exams.length }));
}

/** GET /api/v1/physical/reports - 体检报告列表 */
async function handlePhysicalReports(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const reports = [
    { id: 'PR-001', name: '李患者', abnormalCount: 3, summary: '血压偏高（145/95mmHg），血脂异常（LDL-C 3.8mmol/L），脂肪肝（轻度）', advice: '低盐低脂饮食，每周有氧运动150分钟，3个月后复查血脂' },
    { id: 'PR-002', name: '陈先生', abnormalCount: 1, summary: '空腹血糖偏高（6.8mmol/L）', advice: '糖尿病饮食，监测空腹及餐后血糖，内分泌科随访' },
    { id: 'PR-003', name: '王女士', abnormalCount: 0, summary: '各项指标正常', advice: '保持良好生活习惯，每年定期体检' },
  ];

  return json(ok({ reports, totalCount: reports.length }));
}

/* ==================== 四、病理管理 ==================== */

/** GET /api/v1/pathology/reports - 病理报告列表 */
async function handlePathologyReports(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const reports = [
    { id: 'PA-001', patient: '张演示', specimenType: '手术', diagnosis: '（右半结肠）腺癌 II级', pathologist: '病理科-李医生', status: '已出' },
    { id: 'PA-002', patient: '李患者', specimenType: '穿刺', diagnosis: '（甲状腺）乳头状癌', pathologist: '病理科-王医生', status: '已出' },
    { id: 'PA-003', patient: '王患者', specimenType: '细胞学', diagnosis: '（痰）涂片见少量异型细胞', pathologist: '病理科-张医生', status: '待审' },
    { id: 'PA-004', patient: '赵患者', specimenType: '手术', diagnosis: '（胃）慢性萎缩性胃炎伴肠化', pathologist: '病理科-刘医生', status: '已出' },
    { id: 'PA-005', patient: '刘患者', specimenType: '穿刺', diagnosis: '（肺）非小细胞肺癌', pathologist: '病理科-陈医生', status: '待补' },
  ];

  return json(ok({ reports, totalCount: reports.length }));
}

/** GET /api/v1/pathology/specimens - 标本登记 */
async function handlePathologySpecimens(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const specimens = [
    { id: 'SP-001', specimenNo: 'B20261020-001', type: '手术标本', site: '右半结肠', status: '已接收' },
    { id: 'SP-002', specimenNo: 'B20261020-002', type: '穿刺标本', site: '甲状腺右叶', status: '取材中' },
    { id: 'SP-003', specimenNo: 'B20261019-003', type: '细胞学标本', site: '痰液', status: '已切片' },
  ];

  return json(ok({ specimens, totalCount: specimens.length }));
}

export const m203Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/dashboard/cockpit', handle: handleDashboardCockpit, auth: true },
  { method: 'GET', path: '/api/v1/ai/cda/suggest', handle: handleAiCdaSuggest, auth: true },
  { method: 'GET', path: '/api/v1/ai/risk/prediction', handle: handleAiRiskPrediction, auth: true },
  { method: 'GET', path: '/api/v1/physical/exams', handle: handlePhysicalExams, auth: true },
  { method: 'GET', path: '/api/v1/physical/reports', handle: handlePhysicalReports, auth: true },
  { method: 'GET', path: '/api/v1/pathology/reports', handle: handlePathologyReports, auth: true },
  { method: 'GET', path: '/api/v1/pathology/specimens', handle: handlePathologySpecimens, auth: true },
];
