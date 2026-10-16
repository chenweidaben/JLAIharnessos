/**
 * 健澜科技 jlmedaios - M161-A 医院数字孪生深化路由（实时数据推送与仿真）
 *
 *   GET  /api/v1/admin/digital-twin/stream?building=main[&floor=5]
 *     - 定时快照接口（模拟稳定实时推送）：返回单调版本号 + 全量房间/床位/
 *       设备/脱敏患者 + 增量事件流；前端以 setInterval 轮询，对比版本号增量
 *       渲染；同一轮询窗口内返回同一版本，不抖动、不频繁断线；不碰 WebSocket。
 *
 *   POST /api/v1/admin/digital-twin/simulate
 *     body: { scenario?: 'opd_peak'|'mass_casualty'|'or_failure', period?: 'hour'|'day'|'week' }
 *     - 在服务端纯函数中跑「医院流程仿真 + 资源需求预测」，一次性返回：
 *         flow     = simulateHospitalFlow(scenario)     就诊流程/紧张度/处置建议
 *         forecast = predictResourceNeed(period, scenario) 资源需求曲线 + 峰值缺口
 *
 * 鉴权与安全：
 *   - 仅 admin 角色可读（requireRole 内部已处理 401/403）；
 *   - 只读 + 演示仿真，无写副作用、不写 SQL、不碰 WebSocket；
 *   - 患者仅返回 P-xxxx 脱敏标识，不含 PII。
 *
 * 【远期深化】推送升级为 WebSocket/MQTT 长连接；仿真接入真实排班/门诊量校准。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { requireRole } from '../middleware/auth';
import {
  predictResourceNeed,
  simulateHospitalFlow,
  streamDigitalTwinState,
  type DeepFlowScenario,
  type PredictPeriod,
} from '../aggregators/digitalTwinDeepAggregator.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/** 合法情景 / 周期集合（校验入参） */
const FLOW_SCENARIOS: readonly DeepFlowScenario[] = ['opd_peak', 'mass_casualty', 'or_failure'];
const PREDICT_PERIODS: readonly PredictPeriod[] = ['hour', 'day', 'week'];

interface SimulateBody {
  scenario?: string;
  period?: string;
}

/**
 * GET /api/v1/admin/digital-twin/stream
 * @query building 楼宇编号（main / er-building，未知回退 main）
 * @query floor    可选楼层过滤（如 5 / 6 / 1）
 */
async function handleStream(c: Ctx): Promise<Response> {
  // 仅 admin 角色（requireRole 内部已处理 401 / 403）
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  const buildingId = c.query.get('building') || 'main';
  const floor = c.query.get('floor') || null;

  const snapshot = streamDigitalTwinState(buildingId, floor);
  return json(
    ok({
      ...snapshot,
      // 前端须显式标注「演示数据 / 定时快照轮询，非 WebSocket」
      notice:
        '定时快照轮询模拟实时推送（非 WebSocket）；演示数据，仅用于深化演示与仿真建模',
    }),
  );
}

/**
 * POST /api/v1/admin/digital-twin/simulate
 * body: { scenario, period }
 */
async function handleSimulate(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    const body = (await c.body<SimulateBody>().catch(() => ({} as SimulateBody))) ?? {};

    const scenario: DeepFlowScenario = FLOW_SCENARIOS.includes(
      body.scenario as DeepFlowScenario,
    )
      ? (body.scenario as DeepFlowScenario)
      : 'opd_peak';
    const period: PredictPeriod = PREDICT_PERIODS.includes(body.period as PredictPeriod)
      ? (body.period as PredictPeriod)
      : 'day';

    const flow = simulateHospitalFlow(scenario);
    const forecast = predictResourceNeed(period, scenario);

    return json(ok({ flow, forecast, period, scenario }));
  } catch (err) {
    const message = err instanceof Error ? err.message : '数字孪生仿真失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const digitalTwinDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/digital-twin/stream',
    auth: true,
    handle: handleStream,
  },
  {
    method: 'POST',
    path: '/api/v1/admin/digital-twin/simulate',
    auth: true,
    handle: handleSimulate,
  },
];
