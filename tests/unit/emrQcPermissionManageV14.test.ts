/**
 * 健澜科技 jlmedaios - 质控权限管理 V14 单测（M498-D，避让 M473-B emrQcPermissionV14）
 *
 * 测试 buildPermission 构建、checkPermission 检查、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPermission,
  checkPermission,
  type PermissionManageV14,
} from "../../src/bff/aggregators/emrQcPermissionManageV14Aggregator";
import { emrQcPermissionManageV14Routes } from "../../src/bff/routes/emrQcPermissionManageV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildPermission 质控员", () => {
  // 手算：role='质控员', permissions=['查看病历','审核病历'] → 正确构建
  it("role='质控员', permissions=['查看病历','审核病历'] → 正确构建", () => {
    const perm: PermissionManageV14 = buildPermission("质控员", ["查看病历", "审核病历"]);
    expect(perm.role).toBe("质控员");
    expect(perm.permissions).toEqual(["查看病历", "审核病历"]);
  });
});

describe("checkPermission 质控员审核", () => {
  // 手算：3 个角色（质控员/[查看,审核], 医生/[查看], 管理员/[全部]），role='质控员', action='审核病历' → true（质控员有审核权限）
  it("role='质控员', action='审核病历' → true", () => {
    const roles = [
      buildPermission("质控员", ["查看病历", "审核病历"]),
      buildPermission("医生", ["查看病历"]),
      buildPermission("管理员", ["全部"]),
    ];
    const result = checkPermission(roles, "质控员", "审核病历");
    expect(result).toBe(true);
  });
});

describe("checkPermission 医生无审核", () => {
  // 手算：role='医生', action='审核病历' → false（医生只有查看权限）
  it("role='医生', action='审核病历' → false", () => {
    const roles = [
      buildPermission("质控员", ["查看病历", "审核病历"]),
      buildPermission("医生", ["查看病历"]),
      buildPermission("管理员", ["全部"]),
    ];
    const result = checkPermission(roles, "医生", "审核病历");
    expect(result).toBe(false);
  });
});

describe("checkPermission 管理员全部", () => {
  // 手算：role='管理员', action='全部' → true（管理员有全部权限）
  it("role='管理员', action='全部' → true", () => {
    const roles = [
      buildPermission("质控员", ["查看病历", "审核病历"]),
      buildPermission("医生", ["查看病历"]),
      buildPermission("管理员", ["全部"]),
    ];
    const result = checkPermission(roles, "管理员", "全部");
    expect(result).toBe(true);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-permission-manage auth:true", () => {
    const def = (emrQcPermissionManageV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-permission-manage");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
