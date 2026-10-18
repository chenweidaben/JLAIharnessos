/**
 * 健澜科技 jlmedaios - 质控科室整改跟踪 V14 单测（M493-D，M493 收官）
 *
 * 测试 buildDeptRectify 构建、trackDeptRectify 跟踪、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDeptRectify,
  trackDeptRectify,
  type DeptRectifyV14,
} from "../../src/bff/aggregators/emrQcDeptRectifyV14Aggregator";
import { emrQcDeptRectifyV14Routes } from "../../src/bff/routes/emrQcDeptRectifyV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDeptRectify 内科整改中", () => {
  // 手算：dept='内科', defect='缺主诉', status='整改中' → 正确构建
  it("dept='内科', defect='缺主诉', status='整改中' → 正确构建", () => {
    const rectify: DeptRectifyV14 = buildDeptRectify("内科", "缺主诉", "整改中");
    expect(rectify.dept).toBe("内科");
    expect(rectify.defect).toBe("缺主诉");
    expect(rectify.status).toBe("整改中");
  });
});

describe("trackDeptRectify 3条记录", () => {
  // 手算：3 条记录（2 已完成/1 整改中）→ total=3, completed=2, rate=67（Math.ceil(2/3*100)=Math.ceil(66.67)=67）
  it("3 条记录（2 已完成/1 整改中）→ total=3, completed=2, rate=67", () => {
    const records: DeptRectifyV14[] = [
      buildDeptRectify("内科", "缺主诉", "整改中"),
      buildDeptRectify("外科", "超时限", "已完成"),
      buildDeptRectify("儿科", "缺诊断", "已完成"),
    ];
    const result = trackDeptRectify(records);
    expect(result.total).toBe(3);
    expect(result.completed).toBe(2);
    expect(result.rate).toBe(67);
  });
});

describe("trackDeptRectify 空数组", () => {
  // 手算：空数组 → total=0, completed=0, rate=0
  it("空数组 → total=0, completed=0, rate=0", () => {
    const records: DeptRectifyV14[] = [];
    const result = trackDeptRectify(records);
    expect(result.total).toBe(0);
    expect(result.completed).toBe(0);
    expect(result.rate).toBe(0);
  });
});

describe("buildDeptRectify 外科已完成", () => {
  // 手算：dept='外科', defect='超时限', status='已完成' → 正确构建
  it("dept='外科', defect='超时限', status='已完成' → 正确构建", () => {
    const rectify: DeptRectifyV14 = buildDeptRectify("外科", "超时限", "已完成");
    expect(rectify.dept).toBe("外科");
    expect(rectify.defect).toBe("超时限");
    expect(rectify.status).toBe("已完成");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-dept-rectify auth:true", () => {
    const def = (emrQcDeptRectifyV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-dept-rectify");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
