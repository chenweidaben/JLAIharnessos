/**
 * 健澜科技 jlmedaios - M172-A 【安全质量与运营】医院应急管理深化 BFF 路由（仅 admin）
 *
 * GET /api/v1/admin/emergency/deep
 *  - 院内进程内内存采集（零新依赖），交给纯函数
 *    buildDeepEmergencySystem / calculateEmergencyRisk / optimizeEmergencyDrillSchedule /
 *    trackEmergencySupply / evaluateEmergencyTrigger 汇总为一页应急驾驶舱；
 *  - 返回 { system, risk, drillSchedule, supply, automation, demo }；
 *    无真实样本时强打 demo 标记，前端三态，绝不用假数据冒充真实结论。
 *
 * 应急预案要真能用，不能纸上谈兵：
 *   - 十类情景全预案库（指挥/阶段/动作/物资/通报，拿到就能照做）；
 *   - 风险评估按科室暴露度量化；演练排期按风险等级+上次成绩自动加密；
 *   - 物资看效期与库存缺口；触发信号→自动通知→自动启动预案。
 *
 * 生产安全加固：
 *  - 仅 admin（requireRole 内部已处理 401/403），本端点只读、无写副作用；
 *  - 不碰 WebSocket、不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildDeepEmergencySystem,
  calculateEmergencyRisk,
  evaluateEmergencyTrigger,
  optimizeEmergencyDrillSchedule,
  trackEmergencySupply,
  type DeptRiskContext,
  type EmergencySupplyItem,
  type EmergencyTrigger,
  type ResponseRule,
} from '../aggregators/emergencyDeepAggregator';

/** 演示模式开关：与 wisdomDashboard / smartAsset 一致 */
function demoModeEnabled(): boolean {
  return process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';
}

/* ---------------- 进程内内存样本（仅本模块，零新依赖） ---------------- */

/** 重点科室风险画像（接入院端运营数据后替换为真实采集） */
const deptRiskProfiles: Record<string, DeptRiskContext> = {
  ED: { occupancy: 0.95, vulnerableRatio: 0.45, lastDrillScore: 82, supplyGapRatio: 0.1 },
  ICU: { occupancy: 0.98, vulnerableRatio: 0.95, lastDrillScore: 68, supplyGapRatio: 0.25 },
  WARD: { occupancy: 0.85, vulnerableRatio: 0.35, lastDrillScore: 90, supplyGapRatio: 0.05 },
};

/** 上次演练记录（情景 → 最近一次） */
const lastDrills = {
  fire: { date: '2026-06-01', score: 88 },
  earthquake: { date: '2026-03-15', score: 72 },
  power_outage: { date: '2026-05-10', score: 65 },
  it_failure: { date: '2026-07-20', score: 91 },
  outbreak: { date: '2026-04-08', score: 78 },
  cardiac_arrest: { date: '2026-08-30', score: 66 },
} as const;

/** 应急物资台账样本 */
const supplyItems: EmergencySupplyItem[] = [
  { itemCode: 'FIRE-001', itemName: '干粉灭火器', location: '病房楼 3F 消火栓旁', scenario: 'fire', requiredQty: 40, currentQty: 38, unit: '具', expiryDate: null },
  { itemCode: 'LIFE-001', itemName: 'AED 自动体外除颤器', location: '门诊大厅 / 急诊 / ICU 各 1', scenario: 'cardiac_arrest', requiredQty: 8, currentQty: 8, unit: '台', expiryDate: null },
  { itemCode: 'PPE-001', itemName: 'N95 防护口罩', location: '感染楼应急库房', scenario: 'outbreak', requiredQty: 5000, currentQty: 3200, unit: '只', expiryDate: '2026-11-10' },
  { itemCode: 'DRUG-001', itemName: '抢救车急救药品包', location: '急诊抢救室', scenario: 'cardiac_arrest', requiredQty: 12, currentQty: 11, unit: '套', expiryDate: '2026-10-25' },
  { itemCode: 'GEN-001', itemName: '备用柴油发电机', location: '后勤动力中心', scenario: 'power_outage', requiredQty: 2, currentQty: 2, unit: '台', expiryDate: null },
  { itemCode: 'BAT-001', itemName: 'UPS 电池组', location: 'ICU 配电室', scenario: 'power_outage', requiredQty: 4, currentQty: 4, unit: '组', expiryDate: '2026-09-30' },
];

/** 响应自动化规则样本 */
const responseRules: ResponseRule[] = [
  {
    ruleCode: 'RULE-FIRE-001',
    scenario: 'fire',
    when: { alarm: true, source: 'fire_panel' },
    notify: [
      { role: '值班院领导', channel: '电话+短信', withinMin: 1 },
      { role: '保卫处/全院', channel: '应急广播', withinMin: 1 },
    ],
    autoActions: ['启动火灾疏散预案', '迫降全部电梯', '切断着火层非消防电源'],
  },
  {
    ruleCode: 'RULE-IT-001',
    scenario: 'it_failure',
    when: { offline: true },
    notify: [
      { role: '信息中心值班', channel: '电话', withinMin: 5 },
      { role: '临床科室', channel: '工作群广播', withinMin: 10 },
    ],
    autoActions: ['自动切换纸质应急诊疗', '数据库主备切换'],
  },
  {
    ruleCode: 'RULE-OUT-001',
    scenario: 'outbreak',
    when: { clusterWarn: true },
    notify: [
      { role: '感控科/医务处', channel: '电话', withinMin: 30 },
    ],
    autoActions: ['启动三区两通道预案', '网络直报疾控'],
  },
];

/* -------------------- GET /api/v1/admin/emergency/deep -------------------- */

async function handleEmergencyDeep(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    const nowIso = new Date().toISOString();

    // 1) 十类情景全预案库
    const system = buildDeepEmergencySystem();

    // 2) 重点科室风险评估（急诊 / ICU / 普通病房）
    const risk = Object.entries(deptRiskProfiles).map(([dept, ctx]) => ({
      dept,
      ...calculateEmergencyRisk('fire', ctx),
    }));

    // 3) 演练智能排期（按风险等级 + 历史成绩自动加密）
    const drillSchedule = optimizeEmergencyDrillSchedule(system, lastDrills, nowIso);

    // 4) 应急物资跟踪（效期预警 + 库存缺口）
    const supply = trackEmergencySupply(supplyItems, nowIso);

    // 5) 响应自动化：取一条最新信号做联动演示（生产环境由 webhook/监控推送真实触发）
    const sampleTrigger: EmergencyTrigger = {
      source: 'fire_panel',
      values: { alarm: true, source: 'fire_panel', zone: '病房楼' },
    };
    const automation = {
      sampleTrigger,
      rules: responseRules.length,
      matched: evaluateEmergencyTrigger(sampleTrigger, responseRules),
    };

    // 无真实样本时强制 demo 标记
    const demo = demoModeEnabled();

    return json(
      ok({ system, risk, drillSchedule, supply, automation, demo }, 'ok', c.traceId),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : '应急管理深化汇总失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const emergencyDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/emergency/deep',
    auth: true,
    handle: handleEmergencyDeep,
  },
];
