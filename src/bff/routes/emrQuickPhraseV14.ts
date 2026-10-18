/**
 * 健澜科技 jlmedaios - 病历常见用语快捷输入 V14 路由（M539-C）
 *
 * GET  /api/v1/emr-quick-phrase  （read，auth:true）返回快捷用语基础数据
 * POST /api/v1/emr-quick-phrase  （auth:true）快捷用语搜索 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildQuickPhrase,
  buildQuickPhraseReport,
  searchQuickPhrase,
  type PhraseItemV14,
  type QuickPhraseInputV14,
} from "../aggregators/emrQuickPhraseV14Aggregator.js";

export const emrQuickPhraseV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-quick-phrase",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-quick-phrase:read");
      if (denied) return denied;
      const base = buildQuickPhrase("主诉", "D001");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-quick-phrase",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-quick-phrase:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const phrasesRaw = Array.isArray(obj?.phrases) ? obj.phrases : [];
      const phrases: PhraseItemV14[] = phrasesRaw.map((p: unknown) => {
        const item = p as Record<string, unknown>;
        return { id: String(item?.id ?? ""), text: String(item?.text ?? "") };
      });
      const input: QuickPhraseInputV14 = {
        query: String(obj?.query ?? ""),
        phrases,
      };
      const result = searchQuickPhrase(input);
      const report = buildQuickPhraseReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
