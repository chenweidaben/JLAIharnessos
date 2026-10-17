/**
 * 健澜科技 jlmedaios - 第三方应用市场集成 V5 单测（M281-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  authorizeAppV5,
  buildAppStoreV5Report,
  registerAppV5,
  uninstallAppV5,
  type AppInstall,
  type AppRegistry,
} from "../../src/bff/aggregators/appStoreV5Aggregator";
import { appStoreV5Routes } from "../../src/bff/routes/appStoreV5";

describe("registerAppV5", () => {
  it("新应用默认pending状态", () => {
    const app = registerAppV5({
      appName: "智能审方",
      vendor: "A厂",
      category: "药学",
      scopes: ["Prescription.read"],
      privacyUrl: "https://a.com/p",
      version: "1.0.0",
    });
    expect(app.status).toBe("pending");
    expect(app.appName).toBe("智能审方");
  });
});

describe("authorizeAppV5", () => {
  it("仅授予申请范围内的scope", () => {
    const app: AppRegistry = {
      id: "app-1",
      appName: "x",
      vendor: "v",
      category: "c",
      scopes: ["Prescription.read", "Patient.read"],
      privacyUrl: "https://a.com",
      version: "1.0.0",
      status: "approved",
    };
    const install = authorizeAppV5(app, ["Prescription.read", "Secret.write"], "tenant-1", "admin");
    expect(install.grantedScopes).toEqual(["Prescription.read"]);
  });
});

describe("uninstallAppV5", () => {
  it("按appId过滤剩余安装", () => {
    const installs: AppInstall[] = [
      { appId: "app-1", tenantId: "t1", installedBy: "admin", grantedScopes: ["a"] },
      { appId: "app-2", tenantId: "t1", installedBy: "admin", grantedScopes: ["b"] },
    ];
    expect(uninstallAppV5(installs, "app-1").length).toBe(1);
  });
});

describe("buildAppStoreV5Report", () => {
  it("统计已审核与待审核数量", () => {
    const apps: AppRegistry[] = [
      { id: "a1", appName: "x", vendor: "v", category: "c", scopes: [], privacyUrl: "", version: "1.0.0", status: "approved" },
      { id: "a2", appName: "y", vendor: "v", category: "c", scopes: [], privacyUrl: "", version: "1.0.0", status: "pending" },
    ];
    const r = buildAppStoreV5Report(apps, []);
    expect(r.approvedCount).toBe(1);
    expect(r.pendingCount).toBe(1);
  });
});

describe("appStoreV5Routes 写权限", () => {
  it("POST /api/v1/app-store/register 路由存在且 auth:true", () => {
    const post = appStoreV5Routes.find((r) => r.method === "POST" && r.path === "/api/v1/app-store/register");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
