/**
 * 健澜科技 jlmedaios - 病历库房盘点 V14 路由（M541-D，M541 收官）
 *
 * GET  /api/v1/emr-warehouse-check  （read，auth:true）返回库房盘点基础数据
 * POST /api/v1/emr-warehouse-check  （auth:true）库房盘点 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildWarehouseCheck,
  buildWarehouseCheckReport,
  stocktakeWarehouse,
  type WarehouseCheckInputV14,
} from "../aggregators/emrWarehouseCheckV14Aggregator.js";

export const emrWarehouseCheckV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-warehouse-check",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-warehouse-check:read");
      if (denied) return denied;
      const base = buildWarehouseCheck("病案库房A", "2026-10-18");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-warehouse-check",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-warehouse-check:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: WarehouseCheckInputV14 = {
        expectedCount: Number(obj?.expectedCount ?? 0),
        actualCount: Number(obj?.actualCount ?? 0),
      };
      const result = stocktakeWarehouse(input);
      const report = buildWarehouseCheckReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
