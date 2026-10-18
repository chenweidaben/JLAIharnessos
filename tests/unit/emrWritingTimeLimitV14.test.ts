/**
 * 健澜科技 jlmedaios - 病历书写时限管控 V14 单测（M527-A）
 *
 * 测试 buildWritingTimeLimit 构建时限、checkWritingDeadline 时限检查、buildWritingTimeLimitReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildWritingTimeLimit,
  buildWritingTimeLimitReport,
  checkWritingDeadline,
  type WritingTimeLimitInputV14,
} from "../../src/bff/aggregators/emrWritingTimeLimitV14Aggregator";
import { emrWritingTimeLimitV14Routes } from "../../src/bff/routes/emrWritingTimeLimitV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildWritingTimeLimit 构建时限", () => {
  // 手算：recordType='入院记录', deadlineHours=24 → 正确构建
  it("recordType='入院记录', deadlineHours=24 → 正确构建", () => {
    const limit = buildWritingTimeLimit("入院记录", 24);
    expect(limit.recordType).toBe("入院记录");
    expect(limit.deadlineHours).toBe(24);
  });
});

describe("checkWritingDeadline 按时", () => {
  // 手算：{recordType:'入院记录', elapsedHours=18, deadlineHours=24}
  // 手算：onTime = 18 <= 24 = true
  // 手算：overdueHours = Math.max(0, 18-24) = Math.max(0, -6) = 0
  it("{recordType:'入院记录', elapsedHours=18, deadlineHours=24} → onTime=true, overdueHours=0", () => {
    const input: WritingTimeLimitInputV14 = {
      recordType: "入院记录",
      elapsedHours: 18,
      deadlineHours: 24,
    };
    const result = checkWritingDeadline(input);
    expect(result.onTime).toBe(true);
    expect(result.overdueHours).toBe(0);
  });
});

describe("checkWritingDeadline 超时", () => {
  // 手算：{recordType:'手术记录', elapsedHours=30, deadlineHours=24}
  // 手算：onTime = 30 <= 24 = false
  // 手算：overdueHours = Math.max(0, 30-24) = Math.max(0, 6) = 6
  it("{recordType:'手术记录', elapsedHours=30, deadlineHours=24} → onTime=false, overdueHours=6", () => {
    const input: WritingTimeLimitInputV14 = {
      recordType: "手术记录",
      elapsedHours: 30,
      deadlineHours: 24,
    };
    const result = checkWritingDeadline(input);
    expect(result.onTime).toBe(false);
    expect(result.overdueHours).toBe(6);
  });
});

describe("buildWritingTimeLimitReport 构建报告", () => {
  // 手算：{onTime:false, overdueHours:6}
  // 手算：透传 onTime + overdueHours
  it("{onTime:false, overdueHours:6} → 正确返回（透传）", () => {
    const report = buildWritingTimeLimitReport({ onTime: false, overdueHours: 6 });
    expect(report.onTime).toBe(false);
    expect(report.overdueHours).toBe(6);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-writing-time-limit auth:true", () => {
    const def = (emrWritingTimeLimitV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-writing-time-limit");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
