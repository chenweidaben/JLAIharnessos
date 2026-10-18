/**
 * 健澜科技 jlmedaios - 病历模板版本管理 V14 路由（M539-D）
 *
 * GET  /api/v1/emr-template-version  （read，auth:true）返回模板版本基础数据
 * POST /api/v1/emr-template-version  （auth:true）版本列表 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildTemplateVersion,
  buildTemplateVersionReport,
  listTemplateVersion,
  type TemplateVersionInputV14,
  type TemplateVersionItemV14,
} from "../aggregators/emrTemplateVersionV14Aggregator.js";

export const emrTemplateVersionV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-template-version",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-version:read");
      if (denied) return denied;
      const base = buildTemplateVersion("入院记录模板", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-template-version",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-version:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const versionsRaw = Array.isArray(obj?.versions) ? obj.versions : [];
      const versions: TemplateVersionItemV14[] = versionsRaw.map((v: unknown) => {
        const item = v as Record<string, unknown>;
        return { version: String(item?.version ?? ""), updatedAt: String(item?.updatedAt ?? "") };
      });
      const input: TemplateVersionInputV14 = { versions };
      const result = listTemplateVersion(input);
      const report = buildTemplateVersionReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
