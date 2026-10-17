/**
 * 健澜科技 jlmedaios - 员工净流失率 V13 路由（M330-C）
 *
 * GET /api/v1/staff-turnover-net
 *
 * 权限：staff-turnover-net:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeNetTurnoverRateV13,
  countNewHiresV13,
  countResignationsV13,
  type TurnoverRecordV13,
} from "../aggregators/staffTurnoverNetV13Aggregator.js";

const records: TurnoverRecordV13[] = [
  { eventType: "resignation" },
  { eventType: "resignation" },
  { eventType: "resignation" },
  { eventType: "new_hire" },
];

const totalHeadcount = 100;

export const staffTurnoverNetV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/staff-turnover-net",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "staff-turnover-net:read");
      if (denied) return denied;
      const resignations = countResignationsV13(records);
      const newHires = countNewHiresV13(records);
      return json(ok({
        resignations,
        newHires,
        netTurnoverRate: computeNetTurnoverRateV13(resignations, newHires, totalHeadcount),
      }));
    },
  },
];
