/**
 * 健澜科技 jlmedaios - 病历质控持续改进 V14 路由（M479-D，M479 收官）
 *
 * GET /api/v1/emr-qc-continuous-improve  （read，auth:true）返回改进措施列表
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildImprovementPlan, type ImprovementPlanV14 } from "../aggregators/emrQcContinuousImproveV14Aggregator.js";

const demoPlans: ImprovementPlanV14[] = [
  buildImprovementPlan("病历缺失现病史", "加强书写培训", "张医生"),
  buildImprovementPlan("出院记录不及时", "优化审核流程", "李主任"),
  buildImprovementPlan("术语不规范", "推行术语词库", "王科长"),
];

export const emrQcContinuousImproveV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-continuous-improve",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-continuous-improve:read");
      if (denied) return denied;
      return json(ok({ plans: demoPlans }));
    },
  },
];
