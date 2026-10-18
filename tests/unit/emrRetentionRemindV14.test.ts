/**
 * 健澜科技 jlmedaios - 病历保存期限提醒 V14 单测（M541-C）
 *
 * 测试 buildRetentionRemind 构建保存期限提醒、detectRetentionExpire 保存期限检测、buildRetentionRemindReport 构建提醒报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildRetentionRemind,
  buildRetentionRemindReport,
  detectRetentionExpire,
  type RetentionRemindInputV14,
} from "../../src/bff/aggregators/emrRetentionRemindV14Aggregator";
import { emrRetentionRemindV14Routes } from "../../src/bff/routes/emrRetentionRemindV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildRetentionRemind 构建保存期限提醒", () => {
  // 手算：recordId='REC804', dept='心内科' → 正确构建
  it("recordId='REC804', dept='心内科' → 正确构建", () => {
    const base = buildRetentionRemind("REC804", "心内科");
    expect(base.recordId).toBe("REC804");
    expect(base.dept).toBe("心内科");
  });
});

describe("detectRetentionExpire 临期", () => {
  // 手算：{yearsSinceArchive=29.5, retentionYears=30}
  // 手算：monthsLeft = Math.ceil((30-29.5)*12) = Math.ceil(0.5*12) = Math.ceil(6) = 6
  // 手算：expiring = monthsLeft <= 6 = 6<=6 = true
  it("{yearsSinceArchive=29.5, retentionYears=30} → monthsLeft=6, expiring=true", () => {
    const input: RetentionRemindInputV14 = { yearsSinceArchive: 29.5, retentionYears: 30 };
    const result = detectRetentionExpire(input);
    expect(result.monthsLeft).toBe(6);
    expect(result.expiring).toBe(true);
  });
});

describe("detectRetentionExpire 充裕", () => {
  // 手算：{yearsSinceArchive=5, retentionYears=30}
  // 手算：monthsLeft = Math.ceil((30-5)*12) = Math.ceil(25*12) = Math.ceil(300) = 300
  // 手算：expiring = monthsLeft <= 6 = 300<=6 = false
  it("{yearsSinceArchive=5, retentionYears=30} → monthsLeft=300, expiring=false", () => {
    const input: RetentionRemindInputV14 = { yearsSinceArchive: 5, retentionYears: 30 };
    const result = detectRetentionExpire(input);
    expect(result.monthsLeft).toBe(300);
    expect(result.expiring).toBe(false);
  });
});

describe("buildRetentionRemindReport 构建提醒报告", () => {
  // 手算：{expiring=true, monthsLeft=6}
  // 手算：透传 expiring + monthsLeft
  it("{expiring=true, monthsLeft=6} → 正确返回（透传）", () => {
    const report = buildRetentionRemindReport({ expiring: true, monthsLeft: 6 });
    expect(report.expiring).toBe(true);
    expect(report.monthsLeft).toBe(6);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-retention-remind auth:true", () => {
    const def = (emrRetentionRemindV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-retention-remind");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
