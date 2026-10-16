/**
 * 健澜科技 jlmedaios - M170-D 医院数据资产深化 BFF 路由（管理驾驶舱，仅 admin）
 *
 * GET /api/v1/admin/data-asset/inventory
 *  - 全院四大域 15 类数据资产清单：逐条价值分、域汇总、全局缺口、治理策略；
 *  - 数据来自纯函数 buildDataAssetInventory / calculateDataAssetValue /
 *    identifyDataGap / buildDataGovernancePolicy（不触库，零新依赖）；
 *  - 无实测台账接入时打 demo 标记，前端走三态，绝不用假数据冒充真实资产结论。
 *
 * 【自学习与数字孪生】数据资产要可治理，不能只是清单：
 *   每条资产带责任科室、敏感级别、质量分、覆盖率、新鲜度与治理策略，
 *   为 AI 健康大脑自学习闭环与数字孪生提供可信、可问责的数据底座。
 *
 * 生产安全加固：
 *  - 仅 admin 角色（requireRole 内部已处理 401/403），本端点只读、无写副作用；
 *  - 不返回患者个体 PII，只返回聚合后的资产元数据与价值评估；
 *  - 多租户隔离标签由路由层透传。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildDataAssetInventory,
  buildDataGovernancePolicy,
  type DataGovernancePolicy,
} from '../aggregators/dataAssetAggregator';

/**
 * GET /api/v1/admin/data-asset/inventory
 * 全院数据资产清单与治理策略（管理驾驶舱，仅 admin）。
 */
async function handleDataAssetInventory(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    const nowIso = new Date().toISOString();

    // 当前无 DB 台账接入：纯函数输出目录基线，demo=true；
    // 后续接通 meta.data_asset 台账后，把台账行映射成 measurements 传入即可。
    const inventory = buildDataAssetInventory(undefined, nowIso);
    const policies: DataGovernancePolicy[] = inventory.items.map((item) =>
      buildDataGovernancePolicy(item),
    );

    return json(
      ok({ inventory, policies, demo: inventory.demo }, 'ok', c.traceId),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : '数据资产清单加载失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const dataAssetRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/data-asset/inventory',
    auth: true,
    handle: handleDataAssetInventory,
  },
];
