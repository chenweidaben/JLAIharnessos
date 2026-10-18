/**
 * 健澜科技 jlmedaios - 病历时效性检查 V14 单测（M476-C）
 *
 * 测试 checkTimeliness 超时识别、computeTimelinessScore 得分计算、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  checkTimeliness,
  computeTimelinessScore,
  type TimelinessRecordV14,
  type TimelinessResultV14,
} from "../../src/bff/aggregators/emrTimelinessCheckV14Aggregator";
import { emrTimelinessCheckV14Routes } from "../../src/bff/routes/emrTimelinessCheckV14";
import type { RouteDef } from "../../src/bff/types";

describe("checkTimeliness 部分超时", () => {
  // 手算：3 条记录
  //   入院记录 deadline=24 actual=20 → 20<=24 合规
  //   首次病程 deadline=8  actual=10 → 10>8  超时
  //   出院记录 deadline=48 actual=36 → 36<=48 合规
  //   → overdue=1（首次病程）
  it("3 条记录，1 条超时 → overdue=1", () => {
    const records: TimelinessRecordV14[] = [
      { name: "入院记录", deadlineHours: 24, actualHours: 20 },
      { name: "首次病程", deadlineHours: 8, actualHours: 10 },
      { name: "出院记录", deadlineHours: 48, actualHours: 36 },
    ];
    const result = checkTimeliness(records);
    expect(result.overdue).toBe(1);
  });
});

describe("checkTimeliness 全合规", () => {
  // 手算：3 条记录 actual 都 <= deadline → overdue=0
  it("3 条全合规 → overdue=0", () => {
    const records: TimelinessRecordV14[] = [
      { name: "入院记录", deadlineHours: 24, actualHours: 20 },
      { name: "首次病程", deadlineHours: 8, actualHours: 6 },
      { name: "出院记录", deadlineHours: 48, actualHours: 36 },
    ];
    const result = checkTimeliness(records);
    expect(result.overdue).toBe(0);
  });
});

describe("computeTimelinessScore 2/3", () => {
  // 手算：compliant=2, total=3 → 2/3×100 = 66.67 → Math.ceil = 67
  it("compliant=2, total=3 → score=67", () => {
    const result: TimelinessResultV14 = { compliant: 2, overdue: 1, total: 3, score: 0, overdueItems: [] };
    expect(computeTimelinessScore(result)).toBe(67);
  });
});

describe("computeTimelinessScore 3/3", () => {
  // 手算：compliant=3, total=3 → 3/3×100 = 100 → Math.ceil = 100
  it("compliant=3, total=3 → score=100", () => {
    const result: TimelinessResultV14 = { compliant: 3, overdue: 0, total: 3, score: 0, overdueItems: [] };
    expect(computeTimelinessScore(result)).toBe(100);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-timeliness-check auth:true", () => {
    const def = (emrTimelinessCheckV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-timeliness-check");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
