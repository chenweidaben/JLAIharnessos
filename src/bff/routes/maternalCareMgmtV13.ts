/**
 * 健澜科技 jlmedaios - 孕产妇护理管理 V13 路由（M428-B，换名避让旧版 maternalMgmtV13（M412，-care 后缀））
 *
 * GET /api/v1/maternal-care-mgmt
 *
 * 权限：maternal-care-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCesareanSectionRateV13,
  computeMaternalMortalityRateV13,
  computePostpartumHemorrhageRateV13,
  type MaternalCareMgmtRecordV13,
} from "../aggregators/maternalCareMgmtV13Aggregator.js";

const records: MaternalCareMgmtRecordV13[] = [
  { maternalDeath: 2, liveBirth: 100000, postpartumHemorrhage: 30, deliveryTotal: 1000, cesarean: 400 },
  { maternalDeath: 2, liveBirth: 100000, postpartumHemorrhage: 30, deliveryTotal: 1000, cesarean: 400 },
];

export const maternalCareMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/maternal-care-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "maternal-care-mgmt:read");
      if (denied) return denied;
      return json(ok({
        maternalMortalityRate: computeMaternalMortalityRateV13(records),
        postpartumHemorrhageRate: computePostpartumHemorrhageRateV13(records),
        cesareanSectionRate: computeCesareanSectionRateV13(records),
      }));
    },
  },
];
