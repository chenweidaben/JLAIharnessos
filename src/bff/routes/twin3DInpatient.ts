/**
 * 健澜科技 jlmedaios - v5.0启动 数字孪生 3D 住院试点路由（M182-D）
 *
 * GET /api/v1/admin/digital-twin/v2/inpatient
 *   - 住院楼 3D 楼层图：病房 / 护士站 / 治疗室 / 配药室 三维挤出包围盒；
 *   - 床位状态 3D 实时映射（四色）：空 available 绿 / 占 occupied 深海蓝 /
 *     隔离 isolation 橙 / 出院准备 discharge_ready 青；
 *   - 护士站工作负荷监控：当前待执行医嘱 / 待执行护理任务 / 负荷等级；
 *   - 患者流动仿真：入院 → 住院 → 治疗 → 出院准备 → 出院。
 *
 * 【v5.0 路线图】先住院试点，不做全院重建。纯函数聚合，不碰 WebSocket，不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { requireRole } from '../middleware/auth';
import {
  buildTwin3DInpatient,
  trackBedStatus3D,
  simulateInpatientFlow,
  type InpatientFlowScenario,
} from '../aggregators/twin3DInpatientAggregator.js';
import { json, ok, fail, ErrorCode, type Ctx, type RouteDef } from '../types';

/**
 * GET /api/v1/admin/digital-twin/v2/inpatient
 * @query action     twin（默认，整楼 3D 模型）/ beds（指定楼层床位状态）/ flow（住院流仿真）
 * @query building  楼宇编号（试点期固定住院楼，兼容入参）
 * @query floor     action=beds 时必填（'7' / '8'）
 * @query scenario  action=flow 时选用（normal / busy / surge，默认 normal）
 */
async function handleInpatientTwin(c: Ctx): Promise<Response> {
  // 仅 admin 角色（requireRole 内部已处理 401 / 403）
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  const action = c.query.get('action') || 'twin';
  const building = c.query.get('building') || 'inpatient';
  const floor = c.query.get('floor') || '';
  const scenarioRaw = c.query.get('scenario') || 'normal';
  const scenario: InpatientFlowScenario =
    scenarioRaw === 'busy' || scenarioRaw === 'surge' ? scenarioRaw : 'normal';

  if (action === 'beds') {
    if (!floor) {
      return json(fail(ErrorCode.BAD_REQUEST, 'action=beds 必须提供 floor 参数（7 / 8）'));
    }
    return json(ok(trackBedStatus3D(building, floor)));
  }

  if (action === 'flow') {
    return json(ok(simulateInpatientFlow(scenario)));
  }

  // 默认：整楼 3D 住院试点模型
  return json(ok(buildTwin3DInpatient(building)));
}

export const twin3DInpatientRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/digital-twin/v2/inpatient',
    auth: true,
    handle: handleInpatientTwin,
  },
];
