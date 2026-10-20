/**
 * 健澜科技 jlmedaios - M254 CDS 深度 + 移动护理扩展
 *
 * 医嘱审查/危急值告警/过敏审查 + 移动查房/体征趋势/任务完成率
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、CDS 深度 ==================== */

/** GET /api/v1/cds/order-check - 医嘱合理性审查 5 条 */
async function handleCdsOrderCheck(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const orders = [
    { id: 'OC-001', order: '万古霉素 2g iv q8h（60kg 患者）', issueType: '剂量', severity: '中度', advice: '建议按 15mg/kg q12h，调整为 900mg q12h', status: '需修改' },
    { id: 'OC-002', order: '头孢呋辛 1.5g iv qd', issueType: '频次', severity: '轻度', advice: '头孢呋辛半衰期短，建议 q8h 给药', status: '需修改' },
    { id: 'OC-003', order: '华法林 + 阿司匹林联用', issueType: '配伍', severity: '严重', advice: '协同抗凝增加出血风险，建议避免联用', status: '已拦截' },
    { id: 'OC-004', order: '二甲双胍 0.5g po bid（eGFR 25）', issueType: '禁忌', severity: '严重', advice: 'eGFR<30 禁用二甲双胍', status: '已拦截' },
    { id: 'OC-005', order: '阿托伐他汀 20mg po qn', issueType: '剂量', severity: '轻度', advice: '剂量合理，建议监测肝功能', status: '已通过' },
  ];

  return json(ok({ orders, totalCount: orders.length }));
}

/** GET /api/v1/cds/lab-alert - 检验危急值告警 5 条 */
async function handleCdsLabAlert(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const alerts = [
    { id: 'LA-001', patient: '张***（P-001）', testItem: '血钾', result: '6.8 mmol/L', refRange: '3.5-5.5 mmol/L', status: '已通知医生' },
    { id: 'LA-002', patient: '李***（P-002）', testItem: '血糖', result: '22.5 mmol/L', refRange: '3.9-6.1 mmol/L', status: '已处理（胰岛素）' },
    { id: 'LA-003', patient: '王***（P-003）', testItem: '血红蛋白', result: '58 g/L', refRange: '115-150 g/L', status: '已通知医生' },
    { id: 'LA-004', patient: '赵***（P-004）', testItem: '血肌酐', result: '480 μmol/L', refRange: '44-133 μmol/L', status: '处理中' },
    { id: 'LA-005', patient: '陈***（P-005）', testItem: '血小板', result: '35×10⁹/L', refRange: '125-350×10⁹/L', status: '已通知医生' },
  ];

  return json(ok({ alerts, totalCount: alerts.length }));
}

/** GET /api/v1/cds/allergy-check - 过敏药物审查 5 条 */
async function handleCdsAllergyCheck(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const checks = [
    { id: 'AC-001', patient: '张***（P-001）', allergen: '青霉素 G', medication: '阿莫西林', severity: '过敏', advice: '禁用青霉素类，换用大环内酯类' },
    { id: 'AC-002', patient: '张***（P-001）', allergen: '磺胺类', medication: '复方新诺明', severity: '过敏', advice: '禁用磺胺类药物' },
    { id: 'AC-003', patient: '李***（P-002）', allergen: '海鲜（虾蟹）', medication: '虾青素软胶囊', severity: '不耐受', advice: '建议避免或监测使用' },
    { id: 'AC-004', patient: '王***（P-003）', allergen: '头孢类', medication: '头孢呋辛', severity: '过敏', advice: '禁用头孢类，换用喹诺酮类（无禁忌时）' },
    { id: 'AC-005', patient: '赵***（P-004）', allergen: '花粉（春季）', medication: '无（仅记录）', severity: '不耐受', advice: '无相关用药风险' },
  ];

  return json(ok({ checks, totalCount: checks.length }));
}

/* ==================== 二、移动护理 ==================== */

/** GET /api/v1/mobile/nursing-rounds - 移动护理查房 5 条 */
async function handleMobileNursingRounds(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const rounds = [
    { id: 'NR-001', patient: '3床 张***', task: '生命体征测量', nurse: '刘护士', time: '2026-10-20 08:00', status: '已完成' },
    { id: 'NR-002', patient: '5床 李***', task: '血糖监测', nurse: '陈护士', time: '2026-10-20 07:30', status: '已完成' },
    { id: 'NR-003', patient: '8床 王***', task: '静脉输液更换', nurse: '刘护士', time: '2026-10-20 09:15', status: '已完成' },
    { id: 'NR-004', patient: '12床 赵***', task: '压疮护理', nurse: '周护士', time: '2026-10-20 10:00', status: '执行中' },
    { id: 'NR-005', patient: '15床 陈***', task: '口服药发放', nurse: '陈护士', time: '2026-10-20 12:00', status: '待执行' },
  ];

  return json(ok({ rounds, totalCount: rounds.length }));
}

/** GET /api/v1/mobile/vitals-chart - 移动体征趋势 5 条 */
async function handleMobileVitalsChart(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const vitals = [
    { id: 'VC-001', patient: '3床 张***', vital: '体温', value: '36.8℃', time: '2026-10-20 08:00', trend: '平稳' },
    { id: 'VC-002', patient: '3床 张***', vital: '血压', value: '135/82 mmHg', time: '2026-10-20 08:00', trend: '平稳' },
    { id: 'VC-003', patient: '5床 李***', vital: '血糖', value: '8.2 mmol/L', time: '2026-10-20 07:30', trend: '上升' },
    { id: 'VC-004', patient: '8床 王***', vital: '心率', value: '95 次/分', time: '2026-10-20 09:15', trend: '上升' },
    { id: 'VC-005', patient: '12床 赵***', vital: '呼吸', value: '18 次/分', time: '2026-10-20 10:00', trend: '平稳' },
  ];

  return json(ok({ vitals, totalCount: vitals.length }));
}

/** GET /api/v1/mobile/task-completion - 移动任务完成率 */
async function handleMobileTaskCompletion(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const completion = [
    { nurse: '刘护士', totalTasks: 28, completed: 26, overdue: 1, rate: '92.9%' },
    { nurse: '陈护士', totalTasks: 32, completed: 30, overdue: 2, rate: '93.8%' },
    { nurse: '周护士', totalTasks: 25, completed: 22, overdue: 3, rate: '88.0%' },
    { nurse: '吴护士', totalTasks: 22, completed: 22, overdue: 0, rate: '100%' },
  ];

  return json(ok({ completion, overallRate: 93.5, totalTasks: 107, totalCompleted: 100, totalOverdue: 6 }));
}

export const m254Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/cds/order-check', handle: handleCdsOrderCheck, auth: true },
  { method: 'GET', path: '/api/v1/cds/lab-alert', handle: handleCdsLabAlert, auth: true },
  { method: 'GET', path: '/api/v1/cds/allergy-check', handle: handleCdsAllergyCheck, auth: true },
  { method: 'GET', path: '/api/v1/mobile/nursing-rounds', handle: handleMobileNursingRounds, auth: true },
  { method: 'GET', path: '/api/v1/mobile/vitals-chart', handle: handleMobileVitalsChart, auth: true },
  { method: 'GET', path: '/api/v1/mobile/task-completion', handle: handleMobileTaskCompletion, auth: true },
];
