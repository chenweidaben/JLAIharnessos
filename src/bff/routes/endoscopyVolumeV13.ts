/**
 * 健澜科技 jlmedaios - 内镜检查量 V13 路由（M342-C）
 *
 * GET /api/v1/endoscopy-volume
 *
 * 权限：endoscopy-volume:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBronchoscopyCountV13,
  computeColonoscopyCountV13,
  computeGastroscopyCountV13,
  type EndoscopyVolumeRecordV13,
} from "../aggregators/endoscopyVolumeV13Aggregator.js";

const records: EndoscopyVolumeRecordV13[] = [
  { gastroscopyCount: 100, colonoscopyCount: 50, bronchoscopyCount: 20 },
  { gastroscopyCount: 200, colonoscopyCount: 100, bronchoscopyCount: 30 },
];

export const endoscopyVolumeV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/endoscopy-volume",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "endoscopy-volume:read");
      if (denied) return denied;
      return json(ok({
        gastroscopyCount: computeGastroscopyCountV13(records),
        colonoscopyCount: computeColonoscopyCountV13(records),
        bronchoscopyCount: computeBronchoscopyCountV13(records),
      }));
    },
  },
];
