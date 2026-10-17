/**
 * 健澜科技 jlmedaios - Prompt 工程与模板治理 V5 路由（M280-B）
 *
 * GET  /api/v1/prompt-governance（模板列表+看板）
 * POST /api/v1/prompt-governance/template（创建/写模板）
 * POST /api/v1/prompt-governance/eval（评测）
 * GET  /api/v1/prompt-governance/history（版本历史）
 *
 * 权限：prompt-governance:read / prompt-governance:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildPromptGovernanceV5Report,
  evalPromptV5,
  renderPromptV5,
  versionPromptV5,
  type PromptTemplate,
} from "../aggregators/promptGovernanceV5Aggregator.js";

const templateStore: PromptTemplate[] = [
  {
    id: "tpl-001",
    name: "出院小结生成",
    version: "1.2.0",
    systemPrompt: "你是一名资深主治医师",
    userTemplate: "患者{{name}}，诊断{{diagnosis}}，请生成出院小结。",
    variables: ["name", "diagnosis"],
    status: "active",
  },
];

const evalStore: number[] = [88, 92, 75];

export const promptGovernanceV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/prompt-governance",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "prompt-governance:read");
      if (denied) return denied;

      return json(ok(buildPromptGovernanceV5Report(templateStore, evalStore)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/prompt-governance/template",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "prompt-governance:write");
      if (denied) return denied;

      const body = await c.req.json() as PromptTemplate;
      templateStore.push(body);
      return json(ok({ created: true, id: body.id, version: body.version }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/prompt-governance/eval",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "prompt-governance:write");
      if (denied) return denied;

      const body = await c.req.json() as {
        templateId: string;
        output: string;
        accuracy: number;
        completeness: number;
        safety: number;
      };
      const result = evalPromptV5(body.output, {
        accuracy: body.accuracy,
        completeness: body.completeness,
        safety: body.safety,
      });
      evalStore.push(result.score);
      return json(ok(result));
    },
  },
  {
    method: "GET",
    path: "/api/v1/prompt-governance/history",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "prompt-governance:read");
      if (denied) return denied;

      const id = c.query.get("templateId") ?? "tpl-001";
      const tpl = templateStore.find((t) => t.id === id);
      if (!tpl) {
        return json(ok({ found: false }));
      }
      const next = versionPromptV5(tpl.version, "示例变更");
      return json(ok({ currentVersion: tpl.version, nextVersion: next.newVersion, history: [tpl.version] }));
    },
  },
];

export function renderTemplateForTest(tpl: PromptTemplate, vars: Record<string, string>): string {
  return renderPromptV5(tpl, vars);
}
