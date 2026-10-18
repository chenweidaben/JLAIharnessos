/**
 * 健澜科技 jlmedaios - 病历模板可视化编辑器 V14 路由（M465-A）
 *
 * POST /api/v1/emr-template-editor         （auth:true，body 用 await c.req.json()）保存模板布局
 * GET  /api/v1/emr-template-editor/:templateId （read，auth:true，path 参数 c.params.templateId）
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildTemplatePreview,
  validateTemplateLayout,
  type TemplateLayoutV14,
} from "../aggregators/emrTemplateEditorV14Aggregator.js";

/** 内存态模板布局集（演示用，生产环境应持久化） */
const layoutState: Map<string, TemplateLayoutV14> = new Map();

export const emrTemplateEditorV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-template-editor",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-editor:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as TemplateLayoutV14;
      const validation = validateTemplateLayout(body);
      if (!validation.valid) {
        return json(ok({ error: "布局校验失败", errors: validation.errors }));
      }
      layoutState.set(body.templateId, body);
      const preview = buildTemplatePreview(body);
      return json(ok({ layout: body, preview }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/emr-template-editor/:templateId",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-editor:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      const templateId = (c.params.templateId ?? "").trim();
      const layout = layoutState.get(templateId);
      if (!layout) return json(ok({ layout: null, preview: null }));
      const preview = buildTemplatePreview(layout);
      return json(ok({ layout, preview }));
    },
  },
];
