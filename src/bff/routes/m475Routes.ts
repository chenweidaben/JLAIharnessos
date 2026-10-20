/**
 * 健澜科技 jlmedaios - M475 P0 合规：单病种质控 / DRG-DIP / 临床路径 / 抗菌药物AMS / 病历甲级率
 *
 * 单病种质控指标 / DRG 分组清单 / DRG 费用偏差 / 临床路径执行 / AMS 抗菌药物使用强度 / 病历甲级率月度趋势
 * 避开 M442 insurance/drg-pregroup、M459b report/drg-submit、M453 药事、M473 各端点、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/quality/single-disease - 单病种质控指标（病种/例数/平均住院日/均次费用/目标值）5 条 */
async function handleSingleDisease(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SD-001', disease: '病种：急性 ST 段抬高型心肌梗死（STEMI）', cases: '例数：本月 42 例', los: '平均住院日：7.2 天', cost: '均次费用：23,600 元', target: '目标值：住院日 ≤8 天、均次费用 ≤2.5 万（达标）' },
    { id: 'SD-002', disease: '病种：社区获得性肺炎（住院成人）', cases: '例数：本月 86 例', los: '平均住院日：8.5 天', cost: '均次费用：6,800 元', target: '目标值：住院日 ≤9 天（达标）' },
    { id: 'SD-003', disease: '病种：计划性剖宫产', cases: '例数：本月 58 例', los: '平均住院日：5.1 天', cost: '均次费用：7,200 元', target: '目标值：住院日 ≤5.5 天（达标）' },
    { id: 'SD-004', disease: '病种：股骨颈骨折（行髋关节置换）', cases: '例数：本月 17 例', los: '平均住院日：13.4 天', cost: '均次费用：42,500 元', target: '目标值：术前等待 ≤4 天（达标）' },
    { id: 'SD-005', disease: '病种：2 型糖尿病（住院并发症评估）', cases: '例数：本月 33 例', los: '平均住院日：9.6 天', cost: '均次费用：9,100 元', target: '目标值：住院日 ≤10 天（达标）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/drg/groups - DRG 分组清单（组名/权重/病例数/盈亏状态）5 条 */
async function handleDrgGroups(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DG-001', group: '组名：FM15（心脏移植/ ECMO 相关操作）', weight: '权重：3.85', cases: '病例数：本月 6 例', pnl: '盈亏状态：结余（高权重，费用控制良好）' },
    { id: 'DG-002', group: '组名：ES15（消化道出血伴合并症）', weight: '权重：1.12', cases: '病例数：本月 48 例', pnl: '盈亏状态：基本持平（部分例耗材超标）' },
    { id: 'DG-003', group: '组名：BR25（剖宫产伴合并症与并发症）', weight: '权重：0.86', cases: '病例数：本月 58 例', pnl: '盈亏状态：结余（流程标准，费用稳定）' },
    { id: 'DG-004', group: '组名：IB29（脑血管意外伴合并症）', weight: '权重：1.34', cases: '病例数：本月 36 例', pnl: '盈亏状态：亏损（康复周期长，平均费用超支付标准）' },
    { id: 'DG-005', group: '组名：AJ19（胰腺/肝胆恶性肿瘤手术）', weight: '权重：2.95', cases: '病例数：本月 11 例', pnl: '盈亏状态：结余（手术路径标准化）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/drg/cost-summary - DRG 费用偏差概况（分组/例均费用/支付标准/偏差/偏差率）5 条 */
async function handleDrgCostSummary(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DCS-001', group: '分组：ES15 消化道出血伴合并症', avgCost: '例均费用：6,420 元', payment: '支付标准：6,800 元', deviation: '偏差：-380 元（低于支付）', rate: '偏差率：-5.6%（结余侧）' },
    { id: 'DCS-002', group: '分组：IB29 脑血管意外伴合并症', avgCost: '例均费用：13,980 元', payment: '支付标准：12,400 元', deviation: '偏差：+1,580 元（高于支付）', rate: '偏差率：+12.7%（亏损侧，需重点管控）' },
    { id: 'DCS-003', group: '分组：BR25 剖宫产伴合并症', avgCost: '例均费用：6,980 元', payment: '支付标准：7,200 元', deviation: '偏差：-220 元', rate: '偏差率：-3.1%（结余侧）' },
    { id: 'DCS-004', group: '分组：FM15 心脏 ECMO 相关', avgCost: '例均费用：96,500 元', payment: '支付标准：98,000 元', deviation: '偏差：-1,500 元', rate: '偏差率：-1.5%（基本持平）' },
    { id: 'DCS-005', group: '分组：AJ19 胰腺/肝胆恶性肿瘤手术', avgCost: '例均费用：38,200 元', payment: '支付标准：41,000 元', deviation: '偏差：-2,800 元', rate: '偏差率：-6.8%（结余侧）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/quality/clinical-path - 临床路径执行（病种/入径率/完成率/变异率）5 条 */
async function handleClinicalPath(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CP-001', disease: '病种：社区获得性肺炎（临床路径）', enrollRate: '入径率：82.4%', completeRate: '完成率：91.6%', variance: '变异率：8.4%（转 ICU/升级治疗）' },
    { id: 'CP-002', disease: '病种：计划性剖宫产（临床路径）', enrollRate: '入径率：88.0%', completeRate: '完成率：95.2%', variance: '变异率：4.8%（术中并发症出径）' },
    { id: 'CP-003', disease: '病种：2 型糖尿病（临床路径）', enrollRate: '入径率：64.5%', completeRate: '完成率：86.0%', variance: '变异率：14.0%（合并症多，变异偏高）' },
    { id: 'CP-004', disease: '病种：股骨颈骨折置换（临床路径）', enrollRate: '入径率：78.0%', completeRate: '完成率：90.1%', variance: '变异率：9.9%（术前等待延长）' },
    { id: 'CP-005', disease: '病种：急性单纯性阑尾炎（临床路径）', enrollRate: '入径率：92.0%', completeRate: '完成率：96.5%', variance: '变异率：3.5%（路径执行稳定）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/ams/antibiotic-intensity - 抗菌药物使用强度（科室/DDDs/使用率/使用强度值/目标值）5 条 */
async function handleAmsIntensity(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AMS-001', dept: '科室：全院综合', ddd: 'DDDs 总量：本月 18,640', useRate: '住院患者抗菌药物使用率：42.5%', aui: '使用强度：38.2 DDD/百人天', target: '目标值：≤40 DDD/百人天（达标）' },
    { id: 'AMS-002', dept: '科室：呼吸内科', ddd: 'DDDs 总量：3,120', useRate: '使用率：68.0%（专科治疗性为主）', aui: '使用强度：46.5 DDD/百人天', target: '目标值：≤45（略超，需点评干预）' },
    { id: 'AMS-003', dept: '科室：普外科', ddd: 'DDDs 总量：2,480', useRate: '使用率：52.0%', aui: '使用强度：36.8 DDD/百人天', target: '目标值：≤40（达标，预防用药规范）' },
    { id: 'AMS-004', dept: '科室：ICU', ddd: 'DDDs 总量：1,960', useRate: '使用率：85.0%（重症经验性用药）', aui: '使用强度：52.0 DDD/百人天', target: '目标值：按重症专项（加强病原学送检）' },
    { id: 'AMS-005', dept: '科室：骨科', ddd: 'DDDs 总量：1,540', useRate: '使用率：48.0%', aui: '使用强度：32.4 DDD/百人天', target: '目标值：≤40（达标）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/monthly-grade - 病历甲级率月度趋势（月份/甲级率/乙级率/丙级率/缺陷数）5 条 */
async function handleEmrMonthlyGrade(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MG-001', month: '月份：2026-06', gradeA: '甲级率：94.2%', gradeB: '乙级率：5.5%', gradeC: '丙级率：0.3%', defects: '缺陷数：68 份（主要为书写不完整）' },
    { id: 'MG-002', month: '月份：2026-07', gradeA: '甲级率：94.8%', gradeB: '乙级率：5.0%', gradeC: '丙级率：0.2%', defects: '缺陷数：61 份（较上月 -7）' },
    { id: 'MG-003', month: '月份：2026-08', gradeA: '甲级率：95.3%', gradeB: '乙级率：4.5%', gradeC: '丙级率：0.2%', defects: '缺陷数：55 份（智能质控上线后改善）' },
    { id: 'MG-004', month: '月份：2026-09', gradeA: '甲级率：95.8%', gradeB: '乙级率：4.0%', gradeC: '丙级率：0.2%', defects: '缺陷数：48 份（持续向好）' },
    { id: 'MG-005', month: '月份：2026-10（截至 20 日）', gradeA: '甲级率：96.1%', gradeB: '乙级率：3.7%', gradeC: '丙级率：0.2%', defects: '缺陷数：30 份（按当前进度）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m475Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/quality/single-disease', handle: handleSingleDisease, auth: true },
  { method: 'GET', path: '/api/v1/drg/groups', handle: handleDrgGroups, auth: true },
  { method: 'GET', path: '/api/v1/drg/cost-summary', handle: handleDrgCostSummary, auth: true },
  { method: 'GET', path: '/api/v1/quality/clinical-path', handle: handleClinicalPath, auth: true },
  { method: 'GET', path: '/api/v1/ams/antibiotic-intensity', handle: handleAmsIntensity, auth: true },
  { method: 'GET', path: '/api/v1/emr/monthly-grade', handle: handleEmrMonthlyGrade, auth: true },
];
