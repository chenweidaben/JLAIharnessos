/**
 * 健澜科技 jlmedaios - 第三方应用市场集成 V5 纯函数（M281-D）
 *
 * registerAppV5 / authorizeAppV5 / uninstallAppV5 / buildAppStoreV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 应用注册 */
export interface AppRegistry {
  id: string;
  appName: string;
  vendor: string;
  category: string;
  scopes: string[];
  privacyUrl: string;
  version: string;
  status: "pending" | "approved" | "rejected";
}

/** 应用安装 */
export interface AppInstall {
  appId: string;
  tenantId: string;
  installedBy: string;
  grantedScopes: string[];
}

/**
 * 注册应用 V5（纯函数）：默认 pending 状态。
 *
 * @param meta 应用元数据
 * @returns 应用注册记录
 */
export function registerAppV5(meta: Omit<AppRegistry, "id" | "status">): AppRegistry {
  return {
    ...meta,
    id: `app-${Date.now()}`,
    status: "pending",
  };
}

/**
 * 授权应用 V5（纯函数）：授予的 scope 必须在申请范围内。
 *
 * @param app 应用
 * @param requestedScopes 申请 scope
 * @returns 安装授权
 */
export function authorizeAppV5(app: AppRegistry, requestedScopes: string[], tenantId: string, installedBy: string): AppInstall {
  const granted = requestedScopes.filter((s) => app.scopes.includes(s));
  return {
    appId: app.id,
    tenantId,
    installedBy,
    grantedScopes: granted,
  };
}

/**
 * 卸载应用 V5（纯函数）：返回空列表表示卸载。
 *
 * @param installs 安装列表
 * @param appId 应用 ID
 * @returns 剩余安装
 */
export function uninstallAppV5(installs: AppInstall[], appId: string): AppInstall[] {
  return installs.filter((i) => i.appId !== appId);
}

/** 应用市场看板输出 */
export interface AppStoreV5Report {
  totalApps: number;
  approvedCount: number;
  pendingCount: number;
  installCount: number;
}

/**
 * 构建应用市场看板（纯函数）。
 *
 * @param apps 应用列表
 * @param installs 安装列表
 * @returns 看板
 */
export function buildAppStoreV5Report(apps: AppRegistry[], installs: AppInstall[]): AppStoreV5Report {
  const approvedCount = apps.filter((a) => a.status === "approved").length;
  const pendingCount = apps.filter((a) => a.status === "pending").length;
  return {
    totalApps: apps.length,
    approvedCount,
    pendingCount,
    installCount: installs.length,
  };
}
