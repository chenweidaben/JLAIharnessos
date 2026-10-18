/**
 * 健澜科技 jlmedaios - 质控整改验证 V14 单测（M496-B）
 *
 * 测试 verifyRectification 验证、buildVerifyReport 构建、POST 路由 auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  verifyRectification,
  buildVerifyReport,
  type RectifyVerifyV14,
} from "../../src/bff/aggregators/emrQcRectifyVerifyV14Aggregator";
import { emrQcRectifyVerifyV14Routes } from "../../src/bff/routes/emrQcRectifyVerifyV14";
import type { RouteDef } from "../../src/bff/types";

describe("verifyRectification 通过", () => {
  // 手算：issue='缺主诉', result='通过' → 正确构建
  it("issue='缺主诉', result='通过' → 正确构建", () => {
    const record: RectifyVerifyV14 = verifyRectification("缺主诉", "通过");
    expect(record.issue).toBe("缺主诉");
    expect(record.result).toBe("通过");
  });
});

describe("buildVerifyReport 3条验证", () => {
  // 手算：3 条验证（2 通过/1 不通过）→ verified=2, total=3, passRate=Math.ceil(2/3×100)=67
  it("3 条验证（2 通过/1 不通过）→ verified=2, total=3, passRate=67", () => {
    const report = buildVerifyReport(2, 3);
    expect(report.verified).toBe(2);
    expect(report.total).toBe(3);
    expect(report.passRate).toBe(67);
  });
});

describe("buildVerifyReport 空", () => {
  // 手算：空 → verified=0, total=0, passRate=0
  it("空 → verified=0, total=0, passRate=0", () => {
    const report = buildVerifyReport(0, 0);
    expect(report.verified).toBe(0);
    expect(report.total).toBe(0);
    expect(report.passRate).toBe(0);
  });
});

describe("verifyRectification 不通过", () => {
  // 手算：issue='超时限', result='不通过' → 正确构建
  it("issue='超时限', result='不通过' → 正确构建", () => {
    const record: RectifyVerifyV14 = verifyRectification("超时限", "不通过");
    expect(record.issue).toBe("超时限");
    expect(record.result).toBe("不通过");
  });
});

describe("POST 路由", () => {
  it("POST /api/v1/emr-qc-rectify-verify auth:true", () => {
    const def = (emrQcRectifyVerifyV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-qc-rectify-verify");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
