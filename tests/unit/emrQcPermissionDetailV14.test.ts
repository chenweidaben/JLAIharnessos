/**
 * 健澜科技 jlmedaios - 质控权限管理明细 V14 单测（M507-D，M507 收官，-detail 避让）
 *
 * 测试 buildPermission 构建、assignPermission 分配、revokePermission 回收、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assignPermission,
  buildPermission,
  revokePermission,
  type PermissionDetailV14,
} from "../../src/bff/aggregators/emrQcPermissionDetailV14Aggregator";
import { emrQcPermissionDetailV14Routes } from "../../src/bff/routes/emrQcPermissionDetailV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildPermission 质控员", () => {
  // 手算：role='质控员', resource='规范库', action='read' → 正确构建
  it("role='质控员', resource='规范库', action='read' → 正确构建", () => {
    const perm: PermissionDetailV14 = buildPermission("质控员", "规范库", "read");
    expect(perm.role).toBe("质控员");
    expect(perm.resource).toBe("规范库");
    expect(perm.action).toBe("read");
  });
});

describe("assignPermission 空列表分配", () => {
  // 手算：空列表+新权限 → 返回长度 1（0+1=1）
  it("空列表+新权限 → 返回长度 1", () => {
    const perms: PermissionDetailV14[] = [];
    const perm = buildPermission("质控员", "规范库", "read");
    const result = assignPermission(perms, perm);
    expect(result.length).toBe(1);
  });
});

describe("revokePermission 回收权限", () => {
  // 手算：列表有 2 权限，role='质控员', resource='规范库' → 返回长度 1（2-1=1）
  it("列表有 2 权限，role='质控员', resource='规范库' → 返回长度 1", () => {
    const perms: PermissionDetailV14[] = [
      buildPermission("质控员", "规范库", "read"),
      buildPermission("管理员", "系统参数", "write"),
    ];
    const result = revokePermission(perms, "质控员", "规范库");
    expect(result.length).toBe(1);
    expect(result[0].role).toBe("管理员");
  });
});

describe("buildPermission 管理员", () => {
  // 手算：role='管理员', resource='系统参数', action='write' → 正确构建
  it("role='管理员', resource='系统参数', action='write' → 正确构建", () => {
    const perm: PermissionDetailV14 = buildPermission("管理员", "系统参数", "write");
    expect(perm.role).toBe("管理员");
    expect(perm.resource).toBe("系统参数");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-permission-detail auth:true", () => {
    const def = (emrQcPermissionDetailV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-permission-detail");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
