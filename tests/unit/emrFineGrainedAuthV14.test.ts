/**
 * 健澜科技 jlmedaios - 病历权限细粒度控制 V14 单测（M528-D，M528 收官）
 *
 * 测试 buildFineGrainedAuth 构建权限、checkFieldLevelPermission 字段级权限检查、buildFineGrainedAuthReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildFineGrainedAuth,
  buildFineGrainedAuthReport,
  checkFieldLevelPermission,
  type FineGrainedAuthInputV14,
} from "../../src/bff/aggregators/emrFineGrainedAuthV14Aggregator";
import { emrFineGrainedAuthV14Routes } from "../../src/bff/routes/emrFineGrainedAuthV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildFineGrainedAuth 构建权限", () => {
  // 手算：role='主治医师', dept='心内科' → 正确构建
  it("role='主治医师', dept='心内科' → 正确构建", () => {
    const auth = buildFineGrainedAuth("主治医师", "心内科");
    expect(auth.role).toBe("主治医师");
    expect(auth.dept).toBe("心内科");
  });
});

describe("checkFieldLevelPermission 全授权", () => {
  // 手算：allowedFields=['姓名','诊断','用药'], requestedFields=['姓名','诊断']
  // 手算：deniedFields = requestedFields 中不在 allowedFields 的项 = []
  // 手算：granted = deniedFields.length === 0 = true
  it("allowedFields=['姓名','诊断','用药'], requestedFields=['姓名','诊断'] → granted=true, deniedFields=[]", () => {
    const input: FineGrainedAuthInputV14 = {
      role: "主治医师",
      allowedFields: ["姓名", "诊断", "用药"],
      requestedFields: ["姓名", "诊断"],
    };
    const result = checkFieldLevelPermission(input);
    expect(result.granted).toBe(true);
    expect(result.deniedFields).toEqual([]);
  });
});

describe("checkFieldLevelPermission 部分拒绝", () => {
  // 手算：allowedFields=['姓名','诊断','用药'], requestedFields=['姓名','身份证号']
  // 手算：deniedFields = requestedFields 中不在 allowedFields 的项 = ['身份证号']
  // 手算：granted = deniedFields.length === 0 = false
  it("allowedFields=['姓名','诊断','用药'], requestedFields=['姓名','身份证号'] → granted=false, deniedFields=['身份证号']", () => {
    const input: FineGrainedAuthInputV14 = {
      role: "主治医师",
      allowedFields: ["姓名", "诊断", "用药"],
      requestedFields: ["姓名", "身份证号"],
    };
    const result = checkFieldLevelPermission(input);
    expect(result.granted).toBe(false);
    expect(result.deniedFields).toContain("身份证号");
    expect(result.deniedFields.length).toBe(1);
  });
});

describe("buildFineGrainedAuthReport 构建报告", () => {
  // 手算：{granted:false, deniedCount:1}
  // 手算：透传 granted + deniedCount
  it("{granted:false, deniedCount:1} → 正确返回（透传）", () => {
    const report = buildFineGrainedAuthReport({ granted: false, deniedCount: 1 });
    expect(report.granted).toBe(false);
    expect(report.deniedCount).toBe(1);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-fine-grained-auth auth:true", () => {
    const def = (emrFineGrainedAuthV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-fine-grained-auth");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
