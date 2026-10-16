/**
 * 健澜科技 jlmedaios - M179-A 医院护理管理深化——真关心护士，不是监控 路由
 *
 * GET /api/v1/nursing/deep
 *   - 护理院感医保药事 · 护理管理驾驶舱；
 *   - 四维闭环：护理排班（床护比+班次+加班关怀）/ 护理质量（基础+危重合格率+不良事件）
 *     / 护理培训（三基三严+专科技能+应急演练）/ 护理科研（论文+专利+品管圈）；
 *   - 核心主张：护理管理要真关心护士，不是监控。
 *
 * 【护理院感医保药事】纯函数聚合，不碰 WebSocket，不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { requireRole } from '../middleware/auth';
import {
  buildDeepNursingMgmt,
  calculateNursingRatio,
  generateNursingQualityReport,
  identifyNursingRisk,
  type RiskPatient,
} from '../aggregators/nursingDeepAggregator.js';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** 演示风险患者（脱敏；真实场景由护理记录带 Braden/跌倒风险回写） */
const DEMO_RISK_PATIENTS: RiskPatient[] = [
  { id: 'P-001', age: 78, bradenScore: 11, fallRisk: 'high', impairedConsciousness: false, hasTube: false, critical: false },
  { id: 'P-002', age: 64, bradenScore: 15, fallRisk: 'low', impairedConsciousness: true, hasTube: true, critical: false },
  { id: 'P-003', age: 55, bradenScore: 20, fallRisk: 'low', impairedConsciousness: false, hasTube: false, critical: false },
  { id: 'P-004', age: 71, bradenScore: 13, fallRisk: 'medium', impairedConsciousness: false, hasTube: true, critical: true },
];

/**
 * GET /api/v1/nursing/deep
 * 仅 admin（护理部/科护士长）可查看护理管理驾驶舱。
 *
 * @query period 可选；质量报告周期，默认 2026Q3
 */
async function handleNursingDeep(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  const period = c.query.get('period') || '2026Q3';

  const view = buildDeepNursingMgmt();
  const risk = identifyNursingRisk('GEN-01', DEMO_RISK_PATIENTS);
  const quality = generateNursingQualityReport(period);

  // 演示：单个病区床护比复算（普通病房 42 床 / 6 护士）
  const ratioDemo = calculateNursingRatio('GEN-01', 42, 6);

  return json(
    ok({
      ...view,
      quality,
      risk,
      ratioDemo,
      notice:
        '护理管理演示数据：床护比公开、加班到点提示调休、不良事件先做根因分析、' +
        '培训给路径、科研给时间；远期接入 NIS 真实数据后由数据回写（本切片不做 WebSocket 推送）。',
    }),
  );
}

export const nursingDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/nursing/deep',
    auth: true,
    handle: handleNursingDeep,
  },
];
