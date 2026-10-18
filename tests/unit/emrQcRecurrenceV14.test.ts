/**
 * 健澜科技 jlmedaios - 质控复发预警 V14 单测（M496-C）
 *
 * 测试 detectRecurrence 检测、buildRecurrenceReport 构建、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  detectRecurrence,
  buildRecurrenceReport,
  type RecurrenceV14,
} from "../../src/bff/aggregators/emrQcRecurrenceV14Aggregator";
import { emrQcRecurrenceV14Routes } from "../../src/bff/routes/emrQcRecurrenceV14";
import type { RouteDef } from "../../src/bff/types";

describe("detectRecurrence 复发", () => {
  // 手算：issue='缺主诉', previous=2, current=3 → recurrence=true（3>=2）
  it("issue='缺主诉', previous=2, current=3 → recurrence=true", () => {
    const result: RecurrenceV14 = detectRecurrence("缺主诉", 2, 3);
    expect(result.recurrence).toBe(true);
  });
});

describe("detectRecurrence 未复发", () => {
  // 手算：issue='超时限', previous=2, current=1 → recurrence=false（1<2）
  it("issue='超时限', previous=2, current=1 → recurrence=false", () => {
    const result: RecurrenceV14 = detectRecurrence("超时限", 2, 1);
    expect(result.recurrence).toBe(false);
  });
});

describe("buildRecurrenceReport 3条记录", () => {
  // 手算：3 条记录（2 复发/1 未复发）→ total=3, recurrent=2, rate=Math.ceil(2/3×100)=67
  it("3 条记录（2 复发/1 未复发）→ total=3, recurrent=2, rate=67", () => {
    const records = [
      { issue: "缺主诉", recurrence: true },
      { issue: "超时限", recurrence: false },
      { issue: "用词不规范", recurrence: true },
    ];
    const report = buildRecurrenceReport(records);
    expect(report.total).toBe(3);
    expect(report.recurrent).toBe(2);
    expect(report.rate).toBe(67);
  });
});

describe("buildRecurrenceReport 空", () => {
  // 手算：空 → total=0, recurrent=0, rate=0
  it("空 → total=0, recurrent=0, rate=0", () => {
    const records: { issue: string; recurrence: boolean }[] = [];
    const report = buildRecurrenceReport(records);
    expect(report.total).toBe(0);
    expect(report.recurrent).toBe(0);
    expect(report.rate).toBe(0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-recurrence auth:true", () => {
    const def = (emrQcRecurrenceV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-recurrence");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
