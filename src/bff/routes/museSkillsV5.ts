/**
 * 健澜科技 jlmedaios - MUSE 能力市场与可插拔技能 V5 路由（M284-D）
 *
 * POST /api/v1/muse-skills/register（注册技能）
 * POST /api/v1/muse-skills/enable（启用）
 * POST /api/v1/muse-skills/invoke（调用）
 * GET  /api/v1/muse-skills（看板）
 *
 * 权限：muse-skills:read / muse-skills:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildMuseSkillsV5Report,
  enableSkillV5,
  invokeSkillV5,
  registerSkillV5,
  type SkillInstall,
} from "../aggregators/museSkillsV5Aggregator.js";

const installStore: SkillInstall[] = [];

export const museSkillsV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/muse-skills",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-skills:read");
      if (denied) return denied;

      return json(ok(buildMuseSkillsV5Report(installStore)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/muse-skills/register",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-skills:write");
      if (denied) return denied;

      const body = await c.req.json() as { skillName: string; role: string; description: string; endpoint: string; version: string };
      return json(ok(registerSkillV5(body)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/muse-skills/enable",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-skills:write");
      if (denied) return denied;

      const body = await c.req.json() as { skillId: string; role: string; config: Record<string, unknown> };
      const install = enableSkillV5(body.skillId, body.role, body.config);
      installStore.push(install);
      return json(ok(install));
    },
  },
  {
    method: "POST",
    path: "/api/v1/muse-skills/invoke",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-skills:write");
      if (denied) return denied;

      const body = await c.req.json() as { skillId: string; input: Record<string, unknown> };
      const install = installStore.find((i) => i.skillId === body.skillId);
      if (!install) {
        return json(ok({ invoked: false, output: { error: "not installed" } }));
      }
      return json(ok(invokeSkillV5({ skillId: body.skillId, endpoint: "/skill", enabled: install.enabled }, body.input)));
    },
  },
];
