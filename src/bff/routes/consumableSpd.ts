/**
 * 健澜科技 jlmedaios - M177-D 医院耗材管理深化——SPD 物流 路由
 *
 * GET /api/v1/consumable/spd
 *   - 病案设备耗材 · SPD（Supply Processing Distribution）医院供应链物流驾驶舱；
 *   - 四段闭环：采购（科室申请+采购订单+到货验收）/ 库存（一级库+二级库+消耗点）
 *     / 使用（扫码领用+消耗记录+HMS 计费）/ 结算（按实际消耗 PPV 与供应商结算）；
 *   - 高值耗材一物一码追溯，不能漏：缺 UDI/序列号即报警（missingTrace）。
 *
 * 【质量与新场景】纯函数聚合，不碰 WebSocket，不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { requireRole } from '../middleware/auth';
import { buildDeepConsumableMgmt } from '../aggregators/consumableSpdAggregator.js';
import { json, ok, type Ctx, type RouteDef } from '../types';

/**
 * GET /api/v1/consumable/spd
 * 仅 admin（物资科/总务）可查看 SPD 物流驾驶舱。
 */
async function handleConsumableSpd(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  const view = buildDeepConsumableMgmt();
  return json(ok(view));
}

export const consumableSpdRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/consumable/spd',
    auth: true,
    handle: handleConsumableSpd,
  },
];
