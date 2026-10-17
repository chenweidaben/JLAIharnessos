/**
 * 健澜科技 jlmedaios - 通用表单引擎 V6 路由（M288-B）
 *
 * GET  /api/v1/form/templates 列表
 * GET  /api/v1/form/templates/:id 详情
 * POST /api/v1/form/submit 提交
 * GET  /api/v1/form/submissions 提交记录
 *
 * 权限：form:read / form:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildFormSchemaV6,
  prefillFormV6,
  validateFormV6,
  type FormData,
  type FormField,
} from "../aggregators/formEngineV6Aggregator.js";

interface FormTemplate {
  id: string;
  name: string;
  fields: FormField[];
  version: string;
  status: "active" | "draft";
}

const templateStore: FormTemplate[] = [
  {
    id: "tpl-1",
    name: "请假申请单",
    version: "v1",
    status: "active",
    fields: [
      { key: "reason", label: "事由", type: "textarea", required: true },
      { key: "days", label: "天数", type: "number", required: true },
      { key: "startDate", label: "开始日期", type: "date", required: true },
    ],
  },
  {
    id: "tpl-2",
    name: "采购申请单",
    version: "v1",
    status: "active",
    fields: [
      { key: "item", label: "物品", type: "text", required: true },
      { key: "qty", label: "数量", type: "number", required: true },
      { key: "dept", label: "科室", type: "select", required: true, options: ["心内科", "骨科", "儿科"] },
    ],
  },
];

interface Submission {
  id: string;
  formId: string;
  data: FormData;
  valid: boolean;
  submittedAt: number;
}

const submissionStore: Submission[] = [];

export const formEngineV6Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/form/templates",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "form:read");
      if (denied) return denied;

      return json(ok(templateStore.map((t) => ({
        ...t,
        schema: buildFormSchemaV6(t.name, t.fields),
      }))));
    },
  },
  {
    method: "GET",
    path: "/api/v1/form/templates/:id",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "form:read");
      if (denied) return denied;

      const id = c.params.id;
      const tpl = templateStore.find((t) => t.id === id);
      if (!tpl) {
        return json(ok({ found: false }));
      }
      return json(ok({
        ...tpl,
        schema: buildFormSchemaV6(tpl.name, tpl.fields),
        prefilled: prefillFormV6({}, tpl.fields),
      }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/form/submit",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "form:write");
      if (denied) return denied;

      const body = await c.req.json() as { formId: string; data: FormData };
      const tpl = templateStore.find((t) => t.id === body.formId);
      if (!tpl) {
        return json(ok({ accepted: false, reason: "template not found" }));
      }
      const v = validateFormV6(body.data, tpl.fields);
      const sub: Submission = {
        id: `sub-${submissionStore.length + 1}`,
        formId: body.formId,
        data: body.data,
        valid: v.valid,
        submittedAt: Date.now(),
      };
      submissionStore.push(sub);
      return json(ok({ submission: sub, errors: v.errors }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/form/submissions",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "form:read");
      if (denied) return denied;

      return json(ok({
        total: submissionStore.length,
        validCount: submissionStore.filter((s) => s.valid).length,
        submissions: submissionStore,
      }));
    },
  },
];
