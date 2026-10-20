/**
 * 健澜科技 jlmedaios - M483 P0 合规：HRP 财务管理（预算执行/科室成本/今日收入/欠费账龄）+ 应急演练/突发事件
 *
 * 预算执行 / 科室成本（finance 口径，与 M469 dept-cost 区分）/ 今日收入 / 欠费账龄 / 应急演练 / 突发事件记录。
 * 避开 M436 billing·finance 既有、M469 dept-cost·performance、M481b insurance、M482 emergency/plans·supplies、M471-M480 各端点、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/finance/budget-execution - 预算执行（科室/年度预算/已执行/执行率/结余）5 条 */
async function handleBudgetExecution(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FBE-001', dept: '科室：全院年度预算汇总（2026 年度）', budget: '年度预算：3.20 亿元', executed: '已执行：2.42 亿元（截至 9 月）', rate: '执行率：75.6%（时序进度吻合）', surplus: '结余：约 7,800 万元（Q4 按计划执行）' },
    { id: 'FBE-002', dept: '科室：医务/人力成本预算', budget: '年度预算：1.32 亿元', executed: '已执行：1.02 亿元', rate: '执行率：77.3%（偏快，已预警）', surplus: '结余：约 3,000 万元（需控编）' },
    { id: 'FBE-003', dept: '科室：药品/卫材采购预算', budget: '年度预算：1.16 亿元', executed: '已执行：0.84 亿元', rate: '执行率：72.4%（集采节约显著）', surplus: '结余：约 3,200 万元（可结转）' },
    { id: 'FBE-004', dept: '科室：设备购置预算（大型设备）', budget: '年度预算：4,800 万元', executed: '已执行：4,100 万元', rate: '执行率：85.4%（MRI/DSA 已采购）', surplus: '结余：700 万元（年度内控）' },
    { id: 'FBE-005', dept: '科室：后勤运维/能耗预算', budget: '年度预算：2,400 万元', executed: '已执行：1,720 万元', rate: '执行率：71.7%（节能改造见效）', surplus: '结余：约 680 万元' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/finance/dept-cost - 科室成本（finance 口径，科室/成本额/同比/环比）5 条 */
async function handleDeptCost(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FDC-001', dept: '科室：全院科室成本汇总（月度）', cost: '成本额：本月 1.86 亿元', yoy: '同比：+3.2%（业务量增长）', mom: '环比：-1.5%（成本管控见效）' },
    { id: 'FDC-002', dept: '科室：心血管内科', cost: '成本额：1,860 万元', yoy: '同比：+4.6%', mom: '环比：+0.8%' },
    { id: 'FDC-003', dept: '科室：骨科', cost: '成本额：1,720 万元（高值耗材占比高）', yoy: '同比：+2.1%', mom: '环比：-2.0%（集采耗材降价）' },
    { id: 'FDC-004', dept: '科室：手术部', cost: '成本额：2,140 万元', yoy: '同比：+5.0%', mom: '环比：+1.6%' },
    { id: 'FDC-005', dept: '科室：医学影像科（CT/MRI）', cost: '成本额：1,580 万元', yoy: '同比：-1.2%（设备折旧平稳）', mom: '环比：-0.5%' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/finance/revenue-daily - 今日收入（分类/门诊收入/住院收入/检查收入/药品收入/合计）5 条 */
async function handleRevenueDaily(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FRD-001', category: '分类：今日全院收入汇总（2026-10-20）', outpatient: '门诊收入：86.5 万元', inpatient: '住院收入：124.0 万元（在院 480 床）', examDrug: '检查收入：42.0 万元 / 药品收入：58.6 万元', total: '合计：311.1 万元（较昨日 +2.4%）' },
    { id: 'FRD-002', category: '分类：门诊收入明细', outpatient: '门诊收入：挂号+诊疗 28.6 万元', inpatient: '—', examDrug: '检查收入：24.0 万元 / 药品收入：33.9 万元', total: '合计：86.5 万元' },
    { id: 'FRD-003', category: '分类：住院收入明细', outpatient: '—', inpatient: '住院收入：床位+诊疗 96.5 万元', examDrug: '检查收入：18.0 万元 / 药品收入：24.7 万元', total: '合计：139.2 万元（在院患者）' },
    { id: 'FRD-004', category: '分类：手术/介入收入（手术日）', outpatient: '门诊小手术：6.8 万元', inpatient: '住院手术：38.4 万元（今日 26 台）', examDrug: '—', total: '合计：45.2 万元' },
    { id: 'FRD-005', category: '分类：医保结算收入（今日清算）', outpatient: '门诊医保：42.0 万元', inpatient: '住院医保：68.0 万元', examDrug: '—', total: '合计：110.0 万元（占今日收入约 35%）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/finance/arrears - 欠费账龄（欠费类型/账龄区间/金额/笔数）5 条 */
async function handleArrears(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FAR-001', type: '欠费类型：医保未结算（DRG/DIP 清算在途）', aging: '账龄区间：当月（在清算期内）', amount: '金额：126.0 万元', count: '笔数：840 笔（待 11 月清算）' },
    { id: 'FAR-002', type: '欠费类型：患者住院押金不足', aging: '账龄区间：0-30 天', amount: '金额：38.6 万元', count: '笔数：96 笔（已催缴，多数在出院前结清）' },
    { id: 'FAR-003', type: '欠费类型：患者欠费（出院未结）', aging: '账龄区间：30-90 天', amount: '金额：18.2 万元', count: '笔数：42 笔（法务已介入 8 笔）' },
    { id: 'FAR-004', type: '欠费类型：历史陈欠', aging: '账龄区间：90-180 天以上', amount: '金额：9.4 万元', count: '笔数：18 笔（坏账准备计提中）' },
    { id: 'FAR-005', type: '欠费类型：商业保险/异地医保在途', aging: '账龄区间：1-3 个月', amount: '金额：24.0 万元', count: '笔数：65 笔（协查中）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emergency/drills - 应急演练（演练名/类型/计划日期/已完成/参与人次）5 条 */
async function handleEmergencyDrills(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ED-001', name: '演练名：2026 下半年全院消防疏散综合演练', type: '类型：火灾疏散', plan: '计划日期：2026-11-15（已排入年度演练计划）', done: '已完成：2026-06 已完成上半年 1 次', participants: '参与人次：约 620 人（含患者模拟转运）' },
    { id: 'ED-002', name: '演练名：突发停电（市电中断）UPS+发电机带载切换演练', type: '类型：停电', plan: '计划日期：2026-10-25（本周内）', done: '已完成：已完成 9 月季度切换测试', participants: '参与人次：设备/信息/临床联动 48 人' },
    { id: 'ED-003', name: '演练名：院感暴发（MDRO 聚集）应急桌面推演', type: '类型：院感暴发', plan: '计划日期：2026-11 月', done: '已完成：2026-05 完成桌面推演 1 次', participants: '参与人次：院感/医务/护理/临床 36 人' },
    { id: 'ED-004', name: '演练名：批量伤员（车祸群伤）绿色通道全流程演练', type: '类型：批量伤员', plan: '计划日期：2026-12 月', done: '已完成：2026-08 已完成实战演练', participants: '参与人次：急诊/检验/影像/手术/输血 120 人' },
    { id: 'ED-005', name: '演练名：信息系统中断（HIS 瘫痪）手工应急流程演练', type: '类型：信息应急', plan: '计划日期：2026-10 月底', done: '已完成：尚未（待本月执行）', participants: '参与人次：信息/收费/药房/临床联动预计 80 人' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emergency/incident - 突发事件记录（事件名/类型/发生时间/响应时长/处置结果）5 条 */
async function handleEmergencyIncident(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EI-001', name: '事件名：门诊区域短时设备跳闸（局部停电）', type: '类型：停电局部事件', time: '发生时间：2026-10-12 14:20', response: '响应时长：8 分钟（电工到场恢复）', result: '处置结果：15 分钟内恢复，未影响诊疗，已排查线路' },
    { id: 'EI-002', name: '事件名：急诊科批量外伤伤员（小型车祸 3 人）', type: '类型：批量伤员（小规模）', time: '发生时间：2026-10-08 09:40', response: '响应时长：检伤分类 3 分钟启动', result: '处置结果：3 人均在绿色通道完成处置，无重伤滞留' },
    { id: 'EI-003', name: '事件名：病区疑似 MDRO 聚集（2 例同病房）', type: '类型：院感聚集预警', time: '发生时间：2026-09-30', response: '响应时长：院感科 30 分钟内介入', result: '处置结果：单间隔离+环境采样，未扩散，已闭环上报' },
    { id: 'EI-004', name: '事件名：电梯轿厢困人（地库 1 人）', type: '类型：安全事件', time: '发生时间：2026-10-15 18:10', response: '响应时长：安保 5 分钟到场', result: '处置结果：电梯维保 12 分钟解救，无人员受伤' },
    { id: 'EI-005', name: '事件名：信息系统单点故障（检验 LIS 短时不可用）', type: '类型：信息应急', time: '发生时间：2026-10-18 07:50', response: '响应时长：信息科 10 分钟切换备用节点', result: '处置结果：25 分钟内恢复，标本按手工流程兜底，无漏检' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m483Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/finance/budget-execution', handle: handleBudgetExecution, auth: true },
  { method: 'GET', path: '/api/v1/finance/dept-cost', handle: handleDeptCost, auth: true },
  { method: 'GET', path: '/api/v1/finance/revenue-daily', handle: handleRevenueDaily, auth: true },
  { method: 'GET', path: '/api/v1/finance/arrears', handle: handleArrears, auth: true },
  { method: 'GET', path: '/api/v1/emergency/drills', handle: handleEmergencyDrills, auth: true },
  { method: 'GET', path: '/api/v1/emergency/incident', handle: handleEmergencyIncident, auth: true },
];
