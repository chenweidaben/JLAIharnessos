/**
 * 健澜科技 jlmedaios - 质控全院人员排名 V14 路由（M494-D，M494 收官）
 *
 * GET /api/v1/emr-qc-staff-ranking  （read，auth:true）返回排名数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { rankStaff, type StaffScoreV14 } from "../aggregators/emrQcStaffRankingV14Aggregator.js";

const sampleStaffs: StaffScoreV14[] = [
  { staff: "张医生", score: 92 },
  { staff: "王护士", score: 85 },
  { staff: "陈主任", score: 95 },
];

export const emrQcStaffRankingV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-staff-ranking",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-staff-ranking:read");
      if (denied) return denied;
      const rankings = rankStaff(sampleStaffs);
      return json(ok({ rankings }));
    },
  },
];
