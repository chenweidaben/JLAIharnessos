/**
 * 健澜科技 jlmedaios - 数据分级分类与动态脱敏 V5 路由（M282-A）
 *
 * GET  /api/v1/data-classification（分级目录看板）
 * POST /api/v1/data-classification/mask（脱敏规则）
 * GET  /api/v1/data-classification/preview（脱敏预览）
 *
 * 权限：data-classification:read / data-classification:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDataClassificationV5Report,
  classifyDataV5,
  maskFieldV5,
  type DataLevel,
} from "../aggregators/dataClassificationV5Aggregator.js";

const fieldStore = [
  classifyDataV5("patient", "name"),
  classifyDataV5("patient", "id_card"),
  classifyDataV5("patient", "dept"),
];

export const dataClassificationV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/data-classification",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "data-classification:read");
      if (denied) return denied;

      return json(ok(buildDataClassificationV5Report(fieldStore)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/data-classification/mask",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "data-classification:write");
      if (denied) return denied;

      const body = await c.req.json() as { value: string; level: DataLevel; role: string };
      return json(ok({ masked: maskFieldV5(body.value, body.level, body.role) }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/data-classification/preview",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "data-classification:read");
      if (denied) return denied;

      const col = c.query.get("column") ?? "name";
      const role = c.query.get("role") ?? "doctor";
      const meta = classifyDataV5("patient", col);
      return json(ok({ column: col, level: meta.level, preview: maskFieldV5("原始值", meta.level, role) }));
    },
  },
];
