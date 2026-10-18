/**
 * 健澜科技 jlmedaios - 病历质控权限管理 V14 单测（M473-B）
 *
 * 测试 buildPermissionMatrix 矩阵生成、checkPermission 权限查询、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPermissionMatrix,
  checkPermission,
  type PermissionRowV14,
} from "../../src/bff/aggregators/emrQcPermissionV14Aggregator";
import { emrQcPermissionV14Routes } from "../../src/bff/routes/emrQcPermissionV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildPermissionMatrix 角色数", () => {
  // 手算：roles=['医生','护士']，permissions=['查看病历','审核质控'] → 矩阵含 2 个角色
  it("roles=['医生','护士'], permissions=['查看病历','审核质控'] → 矩阵含 2 个角色", () => {
    const matrix = buildPermissionMatrix(["医生", "护士"], ["查看病历", "审核质控"]);
    expect(matrix.length).toBe(2);
    expect(matrix[0]?.role).toBe("医生");
    expect(matrix[1]?.role).toBe("护士");
  });
});

describe("buildPermissionMatrix 默认 false", () => {
  // 手算：矩阵中默认 permissions 全为 false
  it("矩阵中默认 permissions 全为 false", () => {
    const matrix = buildPermissionMatrix(["医生"], ["查看病历", "审核质控"]);
    const row = matrix[0] as PermissionRowV14;
    expect(row.permissions["查看病历"]).toBe(false);
    expect(row.permissions["审核质控"]).toBe(false);
  });
});

describe("checkPermission 查询", () => {
  // 手算：角色='医生', permission='查看病历' → 在矩阵中查找，默认 false → 返回 false
  it("角色='医生', permission='查看病历' → 在矩阵中查找，返回 false（默认未授权）", () => {
    const matrix = buildPermissionMatrix(["医生", "护士"], ["查看病历"]);
    expect(checkPermission("医生", "查看病历", matrix)).toBe(false);
  });
});

describe("checkPermission 不存在角色", () => {
  // 手算：不存在的角色 → 返回 false
  it("不存在的角色 → 返回 false", () => {
    const matrix = buildPermissionMatrix(["医生"], ["查看病历"]);
    expect(checkPermission("不存在角色", "查看病历", matrix)).toBe(false);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-permission auth:true", () => {
    const def = (emrQcPermissionV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-permission");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
