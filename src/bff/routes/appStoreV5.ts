/**
 * 健澜科技 jlmedaios - 第三方应用市场集成 V5 路由（M281-D）
 *
 * POST /api/v1/app-store/register（注册应用）
 * POST /api/v1/app-store/install（安装授权）
 * DELETE /api/v1/app-store/uninstall（卸载）
 * GET  /api/v1/app-store（应用市场看板）
 *
 * 权限：app-store:read / app-store:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  authorizeAppV5,
  buildAppStoreV5Report,
  registerAppV5,
  uninstallAppV5,
  type AppInstall,
  type AppRegistry,
} from "../aggregators/appStoreV5Aggregator.js";

const appStore: AppRegistry[] = [
  { id: "app-1", appName: "智能审方", vendor: "A厂", category: "药学", scopes: ["Prescription.read"], privacyUrl: "https://a.com/privacy", version: "1.0.0", status: "approved" },
];
const installStore: AppInstall[] = [];

export const appStoreV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/app-store",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "app-store:read");
      if (denied) return denied;

      return json(ok(buildAppStoreV5Report(appStore, installStore)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/app-store/register",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "app-store:write");
      if (denied) return denied;

      const body = await c.req.json() as Omit<AppRegistry, "id" | "status">;
      const app = registerAppV5(body);
      appStore.push(app);
      return json(ok(app));
    },
  },
  {
    method: "POST",
    path: "/api/v1/app-store/install",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "app-store:write");
      if (denied) return denied;

      const body = await c.req.json() as { appId: string; requestedScopes: string[]; tenantId: string; installedBy: string };
      const app = appStore.find((a) => a.id === body.appId);
      if (!app) {
        return json(ok({ found: false }));
      }
      const install = authorizeAppV5(app, body.requestedScopes, body.tenantId, body.installedBy);
      installStore.push(install);
      return json(ok(install));
    },
  },
  {
    method: "DELETE",
    path: "/api/v1/app-store/uninstall",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "app-store:write");
      if (denied) return denied;

      const appId = c.query.get("appId") ?? "";
      const remaining = uninstallAppV5(installStore, appId);
      installStore.length = 0;
      installStore.push(...remaining);
      return json(ok({ remaining: installStore.length }));
    },
  },
];
