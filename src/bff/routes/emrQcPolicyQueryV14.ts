/**
 * 健澜科技 jlmedaios - 质控制度查询 V14 路由（M505-B）
 *
 * GET /api/v1/emr-qc-policy-query?keyword=xxx  （read，auth:true）返回制度查询结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildPolicyReport,
  searchPolicy,
  type PolicyItemV14,
} from "../aggregators/emrQcPolicyQueryV14Aggregator.js";

const allPolicies: PolicyItemV14[] = [
  { title: "病历管理制度", content: "规范病历书写、归档、借阅流程" },
  { title: "质控工作制度", content: "建立质控组织、明确职责分工" },
  { title: "考核制度", content: "定期考核、结果与绩效挂钩" },
];

export const emrQcPolicyQueryV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-policy-query",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-policy-query:read");
      if (denied) return denied;
      const keyword = new URL(c.req.url).searchParams.get("keyword") ?? "";
      const results = searchPolicy(allPolicies, keyword);
      const report = buildPolicyReport(results);
      return json(ok({ report }));
    },
  },
];
