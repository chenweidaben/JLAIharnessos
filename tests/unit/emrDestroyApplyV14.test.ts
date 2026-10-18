/**
 * 健澜科技 jlmedaios - 病历销毁登记（避让版）V14 单测（M541-B）
 *
 * 测试 buildDestroyApply 构建销毁登记、registerDestroyApply 销毁登记、buildDestroyApplyReport 构建销毁报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDestroyApply,
  buildDestroyApplyReport,
  registerDestroyApply,
  type DestroyApplyInputV14,
} from "../../src/bff/aggregators/emrDestroyApplyV14Aggregator";
import { emrDestroyApplyV14Routes } from "../../src/bff/routes/emrDestroyApplyV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDestroyApply 构建销毁登记", () => {
  // 手算：recordId='REC802', destroyDate='2030-01-01' → 正确构建
  it("recordId='REC802', destroyDate='2030-01-01' → 正确构建", () => {
    const base = buildDestroyApply("REC802", "2030-01-01");
    expect(base.recordId).toBe("REC802");
    expect(base.destroyDate).toBe("2030-01-01");
  });
});

describe("registerDestroyApply 正常", () => {
  // 手算：{recordId='REC802', approver='医务处长', reason='超期保管'}
  // 手算：registered = true
  // 手算：destroyNo = 'DES' + Date.now().toString().slice(-6) → 以 'DES' 开头
  it("{recordId='REC802', approver='医务处长'} → registered=true, destroyNo 以 DES 开头", () => {
    const input: DestroyApplyInputV14 = { recordId: "REC802", approver: "医务处长", reason: "超期保管" };
    const result = registerDestroyApply(input);
    expect(result.registered).toBe(true);
    expect(result.destroyNo.startsWith("DES")).toBe(true);
  });
});

describe("registerDestroyApply 另一登记", () => {
  // 手算：{recordId='REC803', approver='质控科长', reason='破损不可修复'}
  // 手算：registered = true
  // 手算：destroyNo = 'DES' + Date.now().toString().slice(-6) → 以 'DES' 开头
  it("{recordId='REC803', approver='质控科长'} → registered=true, destroyNo 以 DES 开头", () => {
    const input: DestroyApplyInputV14 = { recordId: "REC803", approver: "质控科长", reason: "破损不可修复" };
    const result = registerDestroyApply(input);
    expect(result.registered).toBe(true);
    expect(result.destroyNo.startsWith("DES")).toBe(true);
  });
});

describe("buildDestroyApplyReport 构建销毁报告", () => {
  // 手算：{registered=true, destroyNo='DES123456'}
  // 手算：透传 registered + destroyNo
  it("{registered=true, destroyNo='DES123456'} → 正确返回（透传）", () => {
    const report = buildDestroyApplyReport({ registered: true, destroyNo: "DES123456" });
    expect(report.registered).toBe(true);
    expect(report.destroyNo).toBe("DES123456");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-destroy-apply auth:true", () => {
    const def = (emrDestroyApplyV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-destroy-apply");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
