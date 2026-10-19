/**
 * 健澜科技 jlmedaios - 病历AI医保结算清单质控 V14 路由（M552-D，M552 收官）
 *
 * GET  /api/v1/emr-ai-settlement-list-qc  （read，auth:true）返回 AI 医保结算清单质控基础数据
 * POST /api/v1/emr-ai-settlement-list-qc  （auth:true）AI 医保结算清单质控 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiSettlementListQc,
  buildAiSettlementListQcReport,
  checkSettlementListQcByAi,
  type AiSettlementListQcInputV14,
} from "../aggregators/emrAiSettlementListQcV14Aggregator.js";

export const emrAiSettlementListQcV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-settlement-list-qc",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-settlement-list-qc:read");
      if (denied) return denied;
      const base = buildAiSettlementListQc("RECB032", "医保办");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-settlement-list-qc",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-settlement-list-qc:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiSettlementListQcInputV14 = {
        hasMainDiag: Boolean(obj?.hasMainDiag ?? false),
        hasMainSurg: Boolean(obj?.hasMainSurg ?? false),
        hasCostDetail: Boolean(obj?.hasCostDetail ?? false),
        hasInsuranceType: Boolean(obj?.hasInsuranceType ?? false),
      };
      const result = checkSettlementListQcByAi(input);
      const report = buildAiSettlementListQcReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
