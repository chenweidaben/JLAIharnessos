/**
 * 健澜科技 jlmedaios - 病历质控权重配置 V14 路由（M479-B）
 *
 * GET /api/v1/emr-qc-weight-config  （read，auth:true）返回当前权重配置
 * PUT /api/v1/emr-qc-weight-config  （auth:true，body 用 await c.req.json()）更新权重配置
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildWeightConfig,
  validateWeights,
  type WeightConfigItemV14,
} from "../aggregators/emrQcWeightConfigV14Aggregator.js";

const defaultItems: WeightConfigItemV14[] = [
  { dimension: "完整性", weight: 40 },
  { dimension: "时效性", weight: 30 },
  { dimension: "规范性", weight: 30 },
];

const defaultConfig = buildWeightConfig(defaultItems);

export const emrQcWeightConfigV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-weight-config",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-weight-config:read");
      if (denied) return denied;
      return json(ok({ config: defaultConfig }));
    },
  },
  {
    method: "PUT",
    path: "/api/v1/emr-qc-weight-config",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-weight-config:write");
      if (denied) return denied;
      const body = await c.req.json() as { items?: WeightConfigItemV14[] };
      const items = body.items ?? defaultItems;
      const config = buildWeightConfig(items);
      const validation = validateWeights(items);
      return json(ok({ config, validation }));
    },
  },
];
