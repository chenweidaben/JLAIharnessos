/**
 * 健澜科技 jlmedaios - M170-B 医院数字孪生深化路由——多建筑与仿真（自学习与数字孪生）
 *
 *   GET /api/v1/admin/digital-twin/multi
 *     一次性返回多建筑数字孪生可视化所需的全部派生数据：
 *       twin     = buildMultiBuildingTwin(buildings)  四楼宇 2D 分区底图 + 密度分级
 *       flow     = simulatePatientFlow(building, scenario)  患者流仿真曲线
 *       density  = predictCrowdDensity(building, period)    人流密度预测 + 热点分区
 *       route    = optimizePatientRoute(building, from, to)（可选，?from=&to= 时返回）
 *
 *   @query building  可选；单个楼宇编号（opd/ipd/tech/er-building），不传=全院
 *   @query scenario  可选；normal/morning_peak/epidemic/mass_casualty，默认 normal
 *   @query period    可选；hour/day，默认 hour
 *   @query from,to   可选；同楼内分区编码，提供后计算患者最优路线
 *
 * 鉴权与安全：
 *   - 仅 admin 角色可读（requireRole 内部已处理 401/403）；
 *   - 只读 + 演示仿真，无写副作用、不写 SQL、不碰 WebSocket；
 *   - 患者仅 P-xxxx 脱敏标识，不含 PII。
 *
 * 【远期】WebSocket/MQTT 增量推送、3D BIM、真实叫号/客流数据自学习校准。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { requireRole } from '../middleware/auth';
import {
  buildMultiBuildingTwin,
  optimizePatientRoute,
  predictCrowdDensity,
  simulatePatientFlow,
  type DensityPeriod,
  type FlowScenario,
} from '../aggregators/twinDeepAggregator.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/** 合法情景 / 周期集合（校验入参） */
const FLOW_SCENARIOS: readonly FlowScenario[] = ['normal', 'morning_peak', 'epidemic', 'mass_casualty'];
const DENSITY_PERIODS: readonly DensityPeriod[] = ['hour', 'day'];

/**
 * GET /api/v1/admin/digital-twin/multi
 */
async function handleMulti(c: Ctx): Promise<Response> {
  // 仅 admin 角色（requireRole 内部已处理 401 / 403）
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    const building = c.query.get('building') || '';
    const scenario: FlowScenario = FLOW_SCENARIOS.includes(
      c.query.get('scenario') as FlowScenario,
    )
      ? (c.query.get('scenario') as FlowScenario)
      : 'normal';
    const period: DensityPeriod = DENSITY_PERIODS.includes(
      c.query.get('period') as DensityPeriod,
    )
      ? (c.query.get('period') as DensityPeriod)
      : 'hour';

    // 多建筑底图：指定 building 则只返回该楼，否则全院四楼宇
    const twin = buildMultiBuildingTwin(building ? [building] : null);

    // 患者流仿真 / 密度预测：作用于「当前楼宇」（多楼时取第一栋做演示）
    const focusBuilding = twin.buildings[0]?.buildingId ?? 'opd-building';
    const flow = simulatePatientFlow(focusBuilding, scenario);
    const density = predictCrowdDensity(focusBuilding, period);

    // 可选路线优化：?from=&to= 同楼寻路
    const from = c.query.get('from') || '';
    const to = c.query.get('to') || '';
    let route = null;
    let routeError = '';
    if (from && to) {
      try {
        route = optimizePatientRoute(focusBuilding, from, to);
      } catch (e) {
        routeError = e instanceof Error ? e.message : '路线优化失败';
      }
    }

    return json(
      ok({
        twin,
        flow,
        density,
        route,
        routeError,
        focusBuilding,
        notice:
          '多建筑数字孪生 2D 演示数据（纯函数推演，非 WebSocket 实时流）；' +
          '远期接入 BIM/IFC 3D 与真实叫号客流自学习校准。',
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : '数字孪生多建筑聚合失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const twinDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/digital-twin/multi',
    auth: true,
    handle: handleMulti,
  },
];
